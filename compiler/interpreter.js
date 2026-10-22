/* Stage 4: checked AST -> output. Edit expression evaluation and output behavior here. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StringInterpreter = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
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

  return Object.freeze({ execute });
});
