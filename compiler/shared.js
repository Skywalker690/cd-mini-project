/* Shared compiler limits, phase labels and positioned errors. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StringCompilerShared = factory();
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

  return Object.freeze({ LIMITS, PHASES, CompileError, fail });
});
