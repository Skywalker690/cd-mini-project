/* Stage 1: source text -> tokens. Edit keywords, string literals and escapes here. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./shared.js'));
  else root.StringLexer = factory(root.StringCompilerShared);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (shared) {
  'use strict';
  const { LIMITS, fail } = shared;

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

  return Object.freeze({ tokenize });
});
