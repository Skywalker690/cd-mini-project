/* Stage 2: tokens -> AST. Edit grammar rules and AST construction here. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./shared.js'));
  else root.StringParser = factory(root.StringCompilerShared);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (shared) {
  'use strict';
  const { LIMITS, fail } = shared;

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

  return Object.freeze({ parse });
});
