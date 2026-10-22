/* An SVG view of the compiler's AST. No graph library or network access needed. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StringAstTree = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Assignment names are stored as properties in the compiler; show them as leaves.
  // This display projection never changes the original AST or its JSON export.
  function project(ast, id = '0') {
    const make = (text, kind, description, children = [], source = ast, key = id) => {
      const chars = Array.from(text);
      return { id: key, text, label: chars.length > 24 ? chars.slice(0, 23).join('') + '…' : text,
        kind, description, children, source };
    };
    const child = (n, i) => project(n, id + '.' + i);
    const target = () => make(ast.name, 'target', 'Variable target', [], ast, id + '.0');
    switch (ast.type) {
      case 'Program': return make('Program', 'program', 'Program', ast.body.map(child));
      case 'Declaration': return make(ast.expression ? '=' : 'string', 'assignment', 'Declaration',
        ast.expression ? [target(), child(ast.expression, 1)] : [target()]);
      case 'Assignment': return make('=', 'assignment', 'Assignment', [target(), child(ast.expression, 1)]);
      case 'Print': return make('print', 'output', 'Print statement', [child(ast.expression, 0)]);
      case 'Concat': return make('+', 'operator', 'Concatenation', [child(ast.left, 0), child(ast.right, 1)]);
      case 'Identifier': return make(ast.name, 'value', 'Identifier');
      case 'Literal': return make(JSON.stringify(ast.value), 'value', 'String literal');
      default: throw new TypeError('Unknown AST node: ' + ast.type);
    }
  }

  // Allocate a separate horizontal span to each subtree, then connect ellipse edges.
  function layout(tree, collapsed = new Set(), measureText = text => Array.from(text).length * 9.5) {
    const spans = new Map(), sizes = new Map(), gap = 28, padding = 24;
    const children = n => collapsed.has(n.id) ? [] : n.children;
    function measure(n) {
      const width = n.kind === 'operator' || n.label === '=' ? 84 : Math.max(124, measureText(n.label) + 34);
      sizes.set(n.id, { width, height: n.kind === 'operator' || n.label === '=' ? 64 : 56 });
      const list = children(n), sum = list.reduce((total, c) => total + measure(c), 0) + Math.max(0, list.length - 1) * gap;
      const span = Math.max(width, sum); spans.set(n.id, span); return span;
    }
    const width = measure(tree) + padding * 2, nodes = [], links = [];
    let height = 0;
    function place(n, left, depth, parent) {
      const size = sizes.get(n.id), node = { ...n, ...size, x: left + spans.get(n.id) / 2,
        y: 56 + depth * 112, collapsed: !!n.children.length && collapsed.has(n.id) };
      nodes.push(node); height = Math.max(height, node.y + node.height / 2 + padding);
      if (parent) {
        const dx = node.x - parent.x, dy = node.y - parent.y;
        const edge = (shape, direction) => {
          const t = 1 / Math.sqrt((dx / (shape.width / 2)) ** 2 + (dy / (shape.height / 2)) ** 2);
          return { x: shape.x + direction * dx * t, y: shape.y + direction * dy * t };
        };
        const start = edge(parent, 1), end = edge(node, -1);
        const link = { from: parent.id, to: node.id, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
        // A wide Program fan uses a shared rail between rows, clear of sibling ovals.
        if (children(parent).length > 2) {
          link.x1 = parent.x; link.y1 = parent.y + parent.height / 2;
          link.x2 = node.x; link.y2 = node.y - node.height / 2;
          const rail = (parent.y + node.y) / 2;
          link.points = [{x: link.x1, y: link.y1}, {x: link.x1, y: rail}, {x: link.x2, y: rail}, {x: link.x2, y: link.y2}];
        }
        links.push(link);
      }
      const list = children(n), total = list.reduce((sum, c) => sum + spans.get(c.id), 0) + Math.max(0, list.length - 1) * gap;
      let next = node.x - total / 2;
      for (const c of list) { place(c, next, depth + 1, node); next += spans.get(c.id) + gap; }
    }
    place(tree, padding, 0, null);
    return { nodes, links, width, height };
  }

  function mount(container, ast, source, onSelect) {
    const html = (tag, className, text) => {
      const el = document.createElement(tag); el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    };
    const svg = (tag, attributes = {}, text) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
      if (text !== undefined) el.textContent = text;
      return el;
    };
    const toolbar = html('div', 'ast-toolbar'), scopeLabel = html('label', 'ast-scope-label', 'View');
    const scope = html('select', 'ast-scope'); scope.id = 'ast-scope'; scopeLabel.htmlFor = scope.id;
    const option = (value, text) => { const n = html('option', '', text); n.value = value; scope.append(n); };
    option('program', 'Entire program');
    ast.body.forEach((n, i) => option(String(i), `Line ${n.line} · ${n.type === 'Print' ? 'print' : n.name}`));
    const assignment = ast.body.findIndex(n => n.type === 'Assignment');
    scope.value = ast.body.length ? String(assignment < 0 ? 0 : assignment) : 'program';
    const zoomControls = html('div', 'ast-zoom-controls');
    function button(id, text, label) {
      const el = html('button', '', text); el.id = id; el.type = 'button'; el.setAttribute('aria-label', label);
      zoomControls.append(el); return el;
    }
    const zoomOut = button('ast-zoom-out', '−', 'Zoom out of AST');
    const zoomValue = html('span', 'ast-zoom-value', '100%'); zoomValue.setAttribute('aria-live', 'polite'); zoomControls.append(zoomValue);
    const zoomIn = button('ast-zoom-in', '+', 'Zoom into AST'), fit = button('ast-fit', 'Fit', 'Fit AST to view');
    toolbar.append(scopeLabel, scope, zoomControls);
    const canvas = html('div', 'ast-canvas'), stage = html('div', 'ast-stage');
    canvas.tabIndex = 0; canvas.setAttribute('role', 'region'); canvas.setAttribute('aria-label', 'Scrollable abstract syntax tree diagram');
    canvas.append(stage);
    const caption = html('div', 'ast-caption'), captionCode = html('code', ''); caption.append(captionCode);
    const legend = html('div', 'ast-legend');
    for (const [kind, text] of [['assignment', 'Statement'], ['operator', 'Operator'], ['target', 'Target'], ['value', 'Value / name']]) {
      const item = html('span', '', text); item.dataset.kind = kind; legend.append(item);
    }
    const hint = html('p', 'ast-hint', 'Select a branch to fold it. Select a leaf to find it in your source.');
    container.replaceChildren(toolbar, canvas, caption, legend, hint);
    const collapsed = new Set();
    const textContext = document.createElement('canvas').getContext('2d');
    textContext.font = `650 16px ${getComputedStyle(container).getPropertyValue('--mono') || 'monospace'}`;
    const measureText = text => textContext.measureText(text).width;
    let tree, graph, scale = 1, autoFit = true;

    function size() {
      if (autoFit) scale = Math.min(1, ((canvas.clientWidth || 500) - 32) / graph.width, ((canvas.clientHeight || 310) - 32) / graph.height);
      const width = graph.width * scale, height = graph.height * scale;
      const drawing = stage.querySelector('svg');
      drawing.style.width = width + 'px'; drawing.style.height = height + 'px';
      stage.style.width = width + 32 + 'px'; stage.style.height = height + 32 + 'px';
      zoomValue.textContent = Math.round(scale * 100) + '%';
      zoomOut.disabled = scale <= .15; zoomIn.disabled = scale >= 3;
    }
    function draw(focusId) {
      graph = layout(tree, collapsed, measureText);
      const drawing = svg('svg', { class: 'ast-svg', viewBox: `0 0 ${graph.width} ${graph.height}`,
        role: 'group', 'aria-label': 'Abstract syntax tree', focusable: 'false' });
      const edges = svg('g', { 'aria-hidden': 'true' });
      for (const edge of graph.links) edges.append(edge.points ?
        svg('polyline', { class: 'ast-edge', fill: 'none', points: edge.points.map(p => `${p.x},${p.y}`).join(' ') }) :
        svg('line', { class: 'ast-edge', x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2 }));
      drawing.append(edges);
      for (const n of graph.nodes) {
        const branch = !!n.children.length;
        const label = `${n.description}: ${n.text}, line ${n.source.line || 1}`;
        const node = svg('g', { class: 'ast-node' + (n.label === '=' || n.label === '+' ? ' ast-symbol' : ''), 'data-kind': n.kind, 'data-node-id': n.id,
          transform: `translate(${n.x} ${n.y})`, role: 'button', tabindex: '0', 'aria-label': label });
        if (branch) node.setAttribute('aria-expanded', String(!n.collapsed));
        node.append(svg('title', {}, label + (branch ? ' · Select to fold or unfold' : ' · Select to find in source')),
          svg('ellipse', { rx: n.width / 2, ry: n.height / 2 }),
          svg('text', { class: 'ast-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, n.label));
        if (n.collapsed) node.append(svg('text', { class: 'ast-folded', x: n.width / 2 - 8, y: -n.height / 2 + 7, 'aria-hidden': 'true' }, '+'));
        const activate = () => {
          if (branch) { if (collapsed.has(n.id)) collapsed.delete(n.id); else collapsed.add(n.id); draw(n.id); }
          else if (onSelect) onSelect(n.source.start, n.source.name ? n.source.name.length : 1, n.source.line);
        };
        node.addEventListener('click', activate);
        node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
        drawing.append(node);
      }
      stage.replaceChildren(drawing); size();
      if (focusId) stage.querySelector(`[data-node-id="${focusId}"]`)?.focus({ preventScroll: true });
    }
    function select() {
      const n = scope.value === 'program' ? ast : ast.body[Number(scope.value)];
      tree = project(n); collapsed.clear(); autoFit = true;
      captionCode.textContent = n.type === 'Program' ? `${ast.body.length} statement${ast.body.length === 1 ? '' : 's'} · Complete abstract syntax tree` :
        `Line ${n.line} · ${(source.split(/\r\n|\r|\n/)[n.line - 1] || '').trim()}`;
      captionCode.title = captionCode.textContent; draw(); canvas.scrollTo(0, 0);
    }
    scope.addEventListener('change', select);
    function zoom(factor) { autoFit = false; scale = Math.max(.15, Math.min(3, scale * factor)); size(); }
    zoomOut.addEventListener('click', () => zoom(1 / 1.25)); zoomIn.addEventListener('click', () => zoom(1.25));
    fit.addEventListener('click', () => { autoFit = true; size(); canvas.scrollTo(0, 0); });
    select();
    const observer = new ResizeObserver(() => size()); observer.observe(canvas);
    return {
      expand() { collapsed.clear(); autoFit = true; draw(); },
      collapse() { collapsed.add(tree.id); autoFit = true; draw(); },
      resize() { size(); },
      destroy() { observer.disconnect(); }
    };
  }
  return Object.freeze({ project, layout, mount });
});
