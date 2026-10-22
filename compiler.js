/* Compiler entry point: run each stage in order and return one compilation report. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./compiler/shared.js'), require('./compiler/lexical-analysis.js'),
      require('./compiler/syntax-analysis.js'), require('./compiler/semantic-analysis.js'), require('./compiler/interpreter.js'));
  } else {
    root.StringCompiler = factory(root.StringCompilerShared, root.StringLexer, root.StringParser,
      root.StringSemantic, root.StringInterpreter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (shared, lexical, syntax, semantic, interpreter) {
  'use strict';
  const { LIMITS, PHASES, CompileError } = shared;
  const { tokenize } = lexical;
  const { parse } = syntax;
  const { analyze } = semantic;
  const { execute } = interpreter;

  function compileSource(source) {
    if (typeof source !== 'string') throw new TypeError('Source must be a string.');
    const result = { success: false, tokens: [], ast: null, symbols: [], diagnostics: [], output: [],
      phases: PHASES.map(([id, label]) => ({ id, label, status: 'skipped', count: 0 })) };
    let active = 0;
    try {
      // 1. Lexical analysis: source text becomes positioned tokens.
      tokenize(source, result.tokens);
      Object.assign(result.phases[0], { status: 'success', count: result.tokens.length });

      // 2. Syntax analysis: tokens become an abstract syntax tree.
      active = 1;
      const parsed = parse(result.tokens); result.ast = parsed.ast;
      Object.assign(result.phases[1], { status: 'success', count: parsed.count });

      // 3. Semantic analysis: validate names, initialization and string lengths.
      active = 2;
      const symbols = analyze(result.ast, result.diagnostics);
      result.symbols = Array.from(symbols.values());
      Object.assign(result.phases[2], { status: result.diagnostics.length ? 'error' : 'success', count: symbols.size });

      // 4. Preview: execute only after every compiler check has passed.
      if (!result.diagnostics.length) {
        result.output = execute(result.ast, symbols);
        result.success = true;
      }
    } catch (error) {
      if (!(error instanceof CompileError)) throw error;
      result.diagnostics.push(error.diagnostic); result.phases[active].status = 'error';
    }
    return result;
  }

  return Object.freeze({ compileSource, LIMITS });
});
