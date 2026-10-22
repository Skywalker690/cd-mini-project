/* Stage 3: AST -> checked symbol table. Edit declaration and initialization rules here. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./shared.js'));
  else root.StringSemantic = factory(root.StringCompilerShared);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (shared) {
  'use strict';
  const { LIMITS } = shared;

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

  return Object.freeze({ analyze });
});
