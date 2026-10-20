/* StringLab compiler front end. Pure JavaScript, no eval, services or dependencies. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StringCompiler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LIMITS = Object.freeze({ source: 65535, tokens: 4096, nodes: 4096,
    symbols: 256, identifier: 63, string: 1023, depth: 128 });
  const PHASES = [['lexical', 'Lexical analysis'], ['syntax', 'Syntax analysis'], ['semantic', 'Semantic analysis']];

  class CompileError extends Error {
    constructor(phase, message, token) {
      super(message);
      this.diagnostic = { phase, message, line: token.line, column: token.column,
        start: token.start, length: Math.max(1, token.length || 1) };
    }
  }
  const fail = (phase, message, token) => { throw new CompileError(phase, message, token); };
  const letter = c => !!c && /[A-Za-z_]/.test(c);
  const digit = c => !!c && /[0-9]/.test(c);

  // 1. Lexer: preserve raw lexemes and decode supported string escapes once.
  function tokenize(source, tokens) {
    let pos = source.charCodeAt(0) === 0xFEFF ? 1 : 0, line = 1, column = 1;
    const location = () => ({ start: pos, line, column, length: 1 });
    const advance = () => {
      const ch = source[pos++];
      if (ch === '\r') { if (source[pos] === '\n') pos++; line++; column = 1; }
      else if (ch === '\n') { line++; column = 1; }
      else column++;
      return ch;
    };
    if (source.length > LIMITS.source) fail('Lexical', `Source limit is ${LIMITS.source} code units.`, location());
    const nul = source.indexOf('\0');
    if (nul !== -1) {
      const before = source.slice(0, nul).split(/\r\n|\r|\n/);
      fail('Lexical', 'NUL characters are not allowed in source.', {
        start: nul, line: before.length, column: before[before.length - 1].length + 1, length: 1
      });
    }
    while (true) {
      const ch = source[pos];
      if (ch && ' \t\r\n'.includes(ch)) { advance(); continue; }
      if (ch === '/' && source[pos + 1] === '/') {
        while (pos < source.length && !'\r\n'.includes(source[pos])) advance();
        continue;
      }
      const t = location();
      if (tokens.length >= LIMITS.tokens) fail('Lexical', `Token limit is ${LIMITS.tokens}, including EOF.`, t);
      if (pos >= source.length) {
        tokens.push({ ...t, kind: 'EOF', lexeme: '', value: '', length: 0 });
        return;
      }
      let kind, value = '';
      if (ch === '\0') fail('Lexical', 'NUL characters are not allowed in source.', t);
      if (letter(ch)) {
        while (letter(source[pos]) || digit(source[pos])) value += advance();
        if (value.length > LIMITS.identifier) fail('Lexical', `Identifier limit is ${LIMITS.identifier} characters.`, t);
        kind = value === 'string' ? 'STRING' : value === 'print' ? 'PRINT' : 'IDENTIFIER';
      } else if (ch === '"') {
        kind = 'STRING_LITERAL'; advance();
        while (source[pos] !== '"') {
          if (pos >= source.length) fail('Lexical', 'Unterminated string literal.', t);
          if (source[pos] === '\r' || source[pos] === '\n') fail('Lexical', 'Raw newline in string. Use \\n instead.', t);
          const code = source.charCodeAt(pos);
          if (code < 32 || code === 127) fail('Lexical', 'Unescaped control character in string.', location());
          if (source[pos] === '\\') {
            const escape = location(); advance();
            if (pos >= source.length) fail('Lexical', 'Unterminated escape sequence.', t);
            const escapes = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"' };
            if (!Object.hasOwn(escapes, source[pos])) fail('Lexical', 'Invalid escape. Use \\n, \\t, \\r, \\\\ or \\".', escape);
            value += escapes[advance()];
          } else value += advance();
          if (value.length > LIMITS.string) fail('Lexical', `String literal limit is ${LIMITS.string} code units.`, t);
        }
        advance();
      } else {
        const punctuation = { '=': 'EQUAL', '+': 'PLUS', '(': 'LPAREN', ')': 'RPAREN', ';': 'SEMICOLON' };
        kind = punctuation[ch];
        if (!kind) fail('Lexical', `Unexpected character ${JSON.stringify(ch)}.`, t);
        value = advance();
      }
      tokens.push({ ...t, kind, value, lexeme: source.slice(t.start, pos), length: pos - t.start });
    }
  }

  // 2. Recursive descent: statement list, factored declarations and expression loop.
  function parse(tokens) {
    let current = 0, nesting = 0, count = 0;
    const peek = () => tokens[current];
    const expect = (kind, description) => {
      if (peek().kind !== kind) fail('Syntax', `Expected ${description}.`, peek());
      return tokens[current++];
    };
    const node = (type, token, fields = {}) => {
      if (++count > LIMITS.nodes) fail('Syntax', `AST node limit is ${LIMITS.nodes}.`, token);
      const n = { type, line: token.line, column: token.column, start: token.start, ...fields };
      const height = type === 'Concat' ? 1 + Math.max(n.left._height, n.right._height) : 1;
      Object.defineProperty(n, '_height', { value: height });
      if (height > LIMITS.depth) fail('Syntax', `Expression depth limit is ${LIMITS.depth}.`, token);
      return n;
    };
    function primary() {
      const t = peek();
      if (t.kind === 'STRING_LITERAL' || t.kind === 'IDENTIFIER') {
        current++;
        return node(t.kind === 'STRING_LITERAL' ? 'Literal' : 'Identifier', t,
          t.kind === 'STRING_LITERAL' ? { value: t.value } : { name: t.value });
      }
      if (t.kind === 'LPAREN') {
        current++;
        if (++nesting > LIMITS.depth) fail('Syntax', `Parenthesis nesting limit is ${LIMITS.depth}.`, t);
        const n = expression(); expect('RPAREN', "')'"); nesting--; return n;
      }
      fail('Syntax', 'Expected a string literal, identifier, or opening parenthesis.', t);
    }
    function expression() {
      let left = primary();
      while (peek().kind === 'PLUS') {
        const t = tokens[current++], right = primary();
        left = node('Concat', t, { left, right });
      }
      return left;
    }
    function statement() {
      const t = peek();
      if (t.kind === 'STRING') {
        current++;
        const name = expect('IDENTIFIER', "an identifier after 'string'");
        let value = null;
        if (peek().kind === 'EQUAL') { current++; value = expression(); }
        expect('SEMICOLON', "';' after declaration");
        return node('Declaration', name, { name: name.value, expression: value });
      }
      if (t.kind === 'IDENTIFIER') {
        current++; expect('EQUAL', "'=' after identifier");
        const value = expression(); expect('SEMICOLON', "';' after assignment");
        return node('Assignment', t, { name: t.value, expression: value });
      }
      if (t.kind === 'PRINT') {
        current++; expect('LPAREN', "'(' after 'print'");
        const value = expression(); expect('RPAREN', "')' after output expression");
        expect('SEMICOLON', "';' after print statement");
        return node('Print', t, { expression: value });
      }
      fail('Syntax', 'Expected a declaration, assignment, or print statement.', t);
    }
    const program = node('Program', peek(), { body: [] });
    while (peek().kind !== 'EOF') program.body.push(statement());
    return { ast: program, count };
  }

  // 3. Semantic analysis: source-order declarations, initialization and value bounds.
  function analyze(ast, diagnostics) {
    const symbols = new Map();
    const error = (n, message) => diagnostics.push({ phase: 'Semantic', message,
      line: n.line, column: n.column, start: n.start, length: n.name ? n.name.length : 1 });
    function length(n) {
      if (n.type === 'Literal') return n.value.length;
      if (n.type === 'Identifier') {
        const s = symbols.get(n.name);
        if (!s) { error(n, `Variable '${n.name}' is not declared.`); return -1; }
        if (!s.initialized) { error(n, `Variable '${n.name}' is not initialized.`); return -1; }
        return s.length;
      }
      const left = length(n.left), right = length(n.right);
      if (left < 0 || right < 0) return -1;
      if (left + right > LIMITS.string) { error(n, `Concatenated string exceeds the ${LIMITS.string}-code-unit value limit.`); return -1; }
      return left + right;
    }
    for (const n of ast.body) {
      if (n.type === 'Declaration') {
        if (symbols.has(n.name)) { error(n, `Variable '${n.name}' is already declared on line ${symbols.get(n.name).line}.`); continue; }
        if (symbols.size >= LIMITS.symbols) { error(n, `Symbol limit is ${LIMITS.symbols}.`); continue; }
        const s = { name: n.name, type: 'string', line: n.line, initialized: false, length: 0, value: null };
        symbols.set(n.name, s);
        if (n.expression) {
          const size = length(n.expression);
          if (size >= 0) { s.initialized = true; s.length = size; }
        }
      } else if (n.type === 'Assignment') {
        const s = symbols.get(n.name);
        if (!s) error(n, `Variable '${n.name}' is not declared.`);
        const size = length(n.expression);
        if (s && size >= 0) { s.initialized = true; s.length = size; }
      } else length(n.expression);
    }
    return symbols;
  }

  // 4. Preview interpreter: no effects until all compiler checks have passed.
  function execute(ast, symbols) {
    const values = new Map(), output = [];
    const evaluate = n => n.type === 'Literal' ? n.value : n.type === 'Identifier' ?
      values.get(n.name) : evaluate(n.left) + evaluate(n.right);
    for (const n of ast.body) {
      if (!n.expression) continue;
      const value = evaluate(n.expression);
      if (n.type === 'Print') output.push(value);
      else values.set(n.name, value);
    }
    for (const [name, value] of values) symbols.get(name).value = value;
    return output;
  }

  function compileSource(source) {
    if (typeof source !== 'string') throw new TypeError('Source must be a string.');
    const result = { success: false, tokens: [], ast: null, symbols: [], diagnostics: [], output: [],
      phases: PHASES.map(([id, label]) => ({ id, label, status: 'skipped', count: 0 })) };
    let active = 0;
    try {
      tokenize(source, result.tokens);
      Object.assign(result.phases[0], { status: 'success', count: result.tokens.length });
      active = 1;
      const parsed = parse(result.tokens); result.ast = parsed.ast;
      Object.assign(result.phases[1], { status: 'success', count: parsed.count });
      active = 2;
      const symbols = analyze(result.ast, result.diagnostics);
      result.symbols = Array.from(symbols.values());
      Object.assign(result.phases[2], { status: result.diagnostics.length ? 'error' : 'success', count: symbols.size });
      if (!result.diagnostics.length) { result.output = execute(result.ast, symbols); result.success = true; }
    } catch (error) {
      if (!(error instanceof CompileError)) throw error;
      result.diagnostics.push(error.diagnostic); result.phases[active].status = 'error';
    }
    return result;
  }
  return Object.freeze({ compileSource, LIMITS });
});
