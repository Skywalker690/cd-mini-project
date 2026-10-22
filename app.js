/* UI only. The independent compiler engine lives in compiler.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = $('source'), examples = window.StringExamples;
  let selected = examples[0], result = null, compiledSource = null, filename = 'hello.str';
  let currentTab = 'output', elapsed = 0, dirty = false, toastTimer, astDiagram = null;
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svg.namespaceURI, 'use');
    use.setAttribute('href', '#i-' + name); svg.append(use); return svg;
  };
  function element(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3200);
  }
  function empty(container, title, description) {
    const box = element('div', 'empty-view');
    box.append(element('strong', '', title), element('p', '', description));
    container.replaceChildren(box);
  }

  // Highlight with safe text nodes. Source text is never inserted as HTML.
  function updateEditor() {
    const code = source.value, fragment = document.createDocumentFragment();
    const regex = /\/\/[^\r\n]*|"(?:\\[^\r\n]|[^"\\\r\n])*"|\b(?:string|print)\b/g;
    let last = 0;
    for (const match of code.matchAll(regex)) {
      fragment.append(document.createTextNode(code.slice(last, match.index)));
      const cls = match[0].startsWith('//') ? 'tok-comment' : match[0].startsWith('"') ? 'tok-string' : 'tok-keyword';
      fragment.append(element('span', cls, match[0])); last = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(code.slice(last) + '\n'));
    $('highlight-code').replaceChildren(fragment);
    const lines = code.split(/\r\n|\r|\n/).length;
    const errors = new Set(!dirty && result ? result.diagnostics.map(d => d.line) : []);
    const gutter = document.createDocumentFragment();
    for (let i = 1; i <= lines; i++) gutter.append(element('div', errors.has(i) ? 'error-line' : '', String(i)));
    $('line-numbers').replaceChildren(gutter);
    $('source-count').textContent = code.length.toLocaleString() + ' chars';
    $('source-filename').textContent = filename;
    syncScroll();
  }
  function syncScroll() {
    $('source-highlight').scrollTop = source.scrollTop;
    $('source-highlight').scrollLeft = source.scrollLeft;
    $('line-numbers').style.transform = `translateY(${-source.scrollTop}px)`;
  }
  function selectLocation(start, length, line) {
    source.focus(); source.setSelectionRange(start, start + Math.max(length, 1));
    source.scrollTop = Math.max(0, (line - 1) * 26 - 100); syncScroll();
  }
  function setTab(name, focus = false) {
    currentTab = name;
    $('panel-ast').parentElement.classList.toggle('ast-active', name === 'ast');
    for (const button of document.querySelectorAll('[data-tab]')) {
      const active = button.dataset.tab === name;
      button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      $('panel-' + button.dataset.tab).hidden = !active;
      if (active && focus) button.focus();
    }
    if (name === 'ast' && astDiagram) astDiagram.resize();
  }
  function statusView(title, message, state) {
    const container = $('compile-status'); container.className = 'compile-status ' + state;
    const badge = element('span', 'status-icon'); badge.append(icon(state === 'failed' ? 'close' : state === 'dirty' ? 'info' : 'check'));
    const text = element('div'); text.append(element('strong', '', title), element('small', '', message));
    container.replaceChildren(badge, text);
  }
  function renderOutput() {
    $('diagnostics').replaceChildren();
    $('output-region').hidden = dirty || !result || !result.success;
    if (dirty || !result) {
      statusView('Ready when you are.', 'Your source changed. Compile to see fresh results.', 'dirty');
      empty($('diagnostics'), 'A new idea starts here.', 'Compile your source to follow it through each phase.'); return;
    }
    if (result.success) {
      statusView('Compilation successful', 'All three phases passed. Your program is ready.', 'success');
      $('output-text').textContent = result.output.length ? result.output.join('\n') : '(No output statements in this program.)';
      $('run-time').textContent = elapsed < 1 ? '< 1 ms' : elapsed.toFixed(1) + ' ms';
      $('output-summary').textContent = result.output.length + ' print statement' + (result.output.length === 1 ? '' : 's') + ' executed';
    } else {
      const count = result.diagnostics.length;
      statusView('Let’s take another look.', `${count} ${count === 1 ? 'error' : 'errors'} found. Output preview did not run.`, 'failed');
      for (const d of result.diagnostics) {
        const item = element('article', 'diagnostic'), heading = element('div', 'diagnostic-heading');
        const location = element('button', '', `Line ${d.line}:${d.column}`);
        location.type = 'button'; location.addEventListener('click', () => selectLocation(d.start, d.length, d.line));
        heading.append(element('span', '', d.phase + ' error'), location);
        const snippet = source.value.split(/\r\n|\r|\n/)[d.line - 1] || '(end of input)';
        item.append(heading, element('p', 'diagnostic-message', d.message), element('code', '', snippet));
        $('diagnostics').append(item);
      }
    }
  }
  function table(headers, rows) {
    const t = element('table', 'data-table'), head = element('thead'), header = element('tr'), body = element('tbody');
    for (const title of headers) { const th = element('th', '', title); th.scope = 'col'; header.append(th); }
    head.append(header);
    for (const row of rows) { const tr = element('tr'); for (const cell of row) { const td = element('td'); td.append(typeof cell === 'string' ? document.createTextNode(cell) : cell); tr.append(td); } body.append(tr); }
    t.append(head, body); return t;
  }
  function renderTokens() {
    const box = $('tokens-container');
    if (dirty || !result || !result.tokens.length) return empty(box, 'Tokens will appear here.', 'Compile a program to inspect its lexemes and locations.');
    box.replaceChildren(table(['Location', 'Token', 'Lexeme'], result.tokens.map(t => {
      const location = element('button', 'location-link', `${t.line}:${t.column}`); location.type = 'button';
      location.addEventListener('click', () => selectLocation(t.start, t.length, t.line));
      const lexeme = element('div');
      const raw = t.kind === 'EOF' ? '(end of input)' : JSON.stringify(t.lexeme);
      const code = element('code', '', raw.length > 180 ? raw.slice(0, 180) + '…' : raw); code.title = raw; lexeme.append(code);
      if (t.kind === 'STRING_LITERAL') {
        const value = JSON.stringify(t.value); const decoded = element('div', 'decoded-value', 'value: ' + (value.length > 130 ? value.slice(0, 130) + '…' : value)); decoded.title = value; lexeme.append(decoded);
      }
      return [location, element('span', 'token-kind', t.kind), lexeme];
    })));
  }
  function renderAst() {
    const box = $('ast-container'), available = !dirty && !!(result && result.ast);
    if (astDiagram) { astDiagram.destroy(); astDiagram = null; }
    for (const id of ['expand-tree', 'collapse-tree', 'save-ast']) $(id).disabled = !available;
    if (!available) return empty(box, 'Every program has a shape.', 'A successful parse will reveal the abstract syntax tree.');
    astDiagram = window.StringAstTree.mount(box, result.ast, compiledSource, selectLocation);
  }
  function renderSymbols() {
    const box = $('symbols-container');
    if (dirty || !result) return empty(box, 'Names need a home.', 'Compile to see the symbol table and variable values.');
    if (!result.symbols.length) return empty(box, 'No variables to track.', result.phases[2].status === 'skipped' ? 'Semantic analysis has not run yet.' : 'This program does not declare any variables.');
    box.replaceChildren(table(['Name / type', 'Line', 'State', 'Value'], result.symbols.map(s => {
      const name = element('div'); name.append(element('code', '', s.name), element('div', 'decoded-value', s.type));
      const state = element('span', 'symbol-state' + (s.initialized ? '' : ' uninitialized'), s.initialized ? 'Initialized' : 'Uninitialized');
      const value = element('code', 'symbol-value', s.value === null ? '—' : JSON.stringify(s.value));
      return [name, String(s.line), state, value];
    })));
  }
  function render() {
    for (const [index, phase] of document.querySelectorAll('[data-phase]').entries()) {
      const p = !dirty && result ? result.phases[index] : null;
      phase.dataset.state = p ? p.status : 'pending';
      const details = !p ? 'Ready to compile' : p.status === 'success' ?
        (index === 0 ? p.count + ' tokens recognized' : index === 1 ? p.count + ' AST nodes built' : p.count + ' string symbols checked') :
        p.status === 'error' ? 'Errors need attention' : 'Not reached';
      $('phase-detail-' + index).textContent = details;
      phase.setAttribute('aria-label', phase.querySelector('strong').textContent + ': ' + details);
    }
    $('token-count').textContent = !dirty && result ? result.tokens.length : 0;
    $('symbol-count').textContent = !dirty && result ? result.symbols.length : 0;
    const caption = $('result-caption'); caption.replaceChildren(element('span', 'status-dot'), document.createTextNode(dirty ? 'Source changed' : result && result.success ? 'All checks passed' : 'Compilation needs attention'));
    caption.querySelector('.status-dot').style.background = dirty ? '#bf9f63' : result && result.success ? '' : '#c77f6e';
    $('export-report').disabled = dirty || !result;
    renderOutput(); renderTokens(); renderAst(); renderSymbols(); updateEditor();
  }
  function compile() {
    const start = performance.now();
    result = window.StringCompiler.compileSource(source.value);
    elapsed = performance.now() - start; compiledSource = source.value; dirty = false;
    render();
  }
  function loadExample(example) {
    selected = example; filename = example.filename; source.value = example.source;
    $('example-select').value = example.id; $('example-description').textContent = example.description;
    source.scrollTop = 0; source.scrollLeft = 0; compile(); setTab('output');
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  for (const category of [...new Set(examples.map(e => e.category))]) {
    const group = element('optgroup'); group.label = category;
    for (const e of examples.filter(item => item.category === category)) { const option = element('option', '', e.label); option.value = e.id; group.append(option); }
    $('example-select').append(group);
  }
  $('example-select').addEventListener('change', e => { const example = examples.find(item => item.id === e.target.value); if (example) loadExample(example); });
  $('compile-button').addEventListener('click', compile);
  source.addEventListener('input', () => {
    const wasDirty = dirty; dirty = source.value !== compiledSource;
    if (wasDirty !== dirty) render(); else updateEditor();
  });
  source.addEventListener('scroll', syncScroll);
  source.addEventListener('keydown', event => {
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault(); source.setRangeText('  ', source.selectionStart, source.selectionEnd, 'end');
      source.dispatchEvent(new Event('input'));
    }
  });
  document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !document.querySelector('dialog[open]')) { event.preventDefault(); compile(); } });
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
    button.addEventListener('keydown', e => {
      const names = ['output', 'tokens', 'ast', 'symbols']; let next = names.indexOf(currentTab);
      if (e.key === 'ArrowRight') next = (next + 1) % names.length;
      else if (e.key === 'ArrowLeft') next = (next + 3) % names.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = 3;
      else return;
      e.preventDefault(); setTab(names[next], true);
    });
  });
  document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => {
    const phase = Number(button.dataset.phase);
    setTab(result && !dirty && result.phases[phase].status === 'error' ? 'output' : ['tokens','ast','symbols'][phase]);
  }));
  $('reset-button').addEventListener('click', () => { loadExample(selected || examples[0]); toast('Example reset.'); });
  $('upload-button').addEventListener('click', () => $('source-file').click());
  $('source-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > window.StringCompiler.LIMITS.source * 4) throw new Error('Source file is too large for this demonstration.');
      const text = await file.text();
      if (text.length > window.StringCompiler.LIMITS.source) throw new Error(`Source limit is ${window.StringCompiler.LIMITS.source.toLocaleString()} code units. Your current program was preserved.`);
      source.value = text; filename = file.name; selected = null;
      $('example-select').value = ''; $('example-description').textContent = 'Your imported source file.';
      compile(); setTab('output'); toast('Source file opened.');
    } catch (error) { toast(error.message || 'Could not read that file.'); }
    event.target.value = '';
  });
  $('save-source').addEventListener('click', () => { download(filename, source.value, 'text/plain;charset=utf-8'); toast('Source downloaded.'); });
  $('export-report').addEventListener('click', () => {
    if (dirty || !result) return;
    download('stringlab-report.json', JSON.stringify({ application: 'StringLab', source: compiledSource, filename, compiledAt: new Date().toISOString(), ...result }, null, 2), 'application/json');
    toast('Compilation report downloaded.');
  });
  $('save-ast').addEventListener('click', () => { if (!dirty && result && result.ast) { download('stringlab-ast.json', JSON.stringify(result.ast, null, 2), 'application/json'); toast('AST downloaded.'); } });
  $('expand-tree').addEventListener('click', () => astDiagram?.expand());
  $('collapse-tree').addEventListener('click', () => astDiagram?.collapse());
  document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => $(button.dataset.dialog).showModal()));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  });
  loadExample(examples[0]);
})();
