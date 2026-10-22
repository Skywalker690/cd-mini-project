const {test} = require('node:test');
const assert = require('node:assert/strict');
const {LIMITS, CompileError} = require('../compiler/shared.js');
const {tokenize} = require('../compiler/lexical-analysis.js');
const {parse} = require('../compiler/syntax-analysis.js');
const {analyze} = require('../compiler/semantic-analysis.js');
const {execute} = require('../compiler/interpreter.js');
const {compileSource} = require('../compiler.js');

function lex(source) {
  const tokens = [];
  tokenize(source, tokens);
  return tokens;
}

test('lexical stage can be used directly and preserves lexemes, escapes and locations', () => {
  const tokens = lex('string name = "A\\nB";\nprint(name);');
  assert.deepEqual(tokens.map(t => t.kind), ['STRING','IDENTIFIER','EQUAL','STRING_LITERAL','SEMICOLON','PRINT','LPAREN','IDENTIFIER','RPAREN','SEMICOLON','EOF']);
  assert.equal(tokens[3].lexeme, '"A\\nB"');
  assert.equal(tokens[3].value, 'A\nB');
  assert.equal(tokens[5].line, 2);
});

test('lexical errors use the shared diagnostic type', () => {
  assert.throws(() => lex(String.raw`print("\q");`), error =>
    error instanceof CompileError && error.diagnostic.phase === 'Lexical');
});

test('syntax stage builds an AST from lexer tokens', () => {
  const parsed = parse(lex('string name; name = "Hi" + "!"; print(name);'));
  assert.deepEqual(parsed.ast.body.map(n => n.type), ['Declaration','Assignment','Print']);
  assert.equal(parsed.ast.body[1].expression.type, 'Concat');
  assert.ok(parsed.count > parsed.ast.body.length);
});

test('syntax errors use the same diagnostic type as the lexer', () => {
  assert.throws(() => parse(lex('print("Hi")')), error =>
    error instanceof CompileError && error.diagnostic.phase === 'Syntax');
});

test('semantic stage checks names and initialization without executing output', () => {
  const {ast} = parse(lex('string name; print(name); missing = "x"; string name;'));
  const diagnostics = [], symbols = analyze(ast, diagnostics);
  assert.equal(diagnostics.length, 3);
  assert.ok(diagnostics.every(d => d.phase === 'Semantic'));
  assert.equal(symbols.get('name').initialized, false);
  assert.equal(symbols.get('name').value, null);
});

test('preview interpreter evaluates a checked AST and records final symbol values', () => {
  const {ast} = parse(lex('string name = "Ada"; name = "Hi, " + name; print(name);'));
  const diagnostics = [], symbols = analyze(ast, diagnostics);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(execute(ast, symbols), ['Hi, Ada']);
  assert.equal(symbols.get('name').value, 'Hi, Ada');
});

test('entry point shares limits and stops before preview when checks fail', () => {
  assert.equal(require('../compiler.js').LIMITS, LIMITS);
  const result = compileSource('print("Earlier output"); print(missing);');
  assert.equal(result.success, false);
  assert.deepEqual(result.output, []);
  assert.equal(result.phases[2].status, 'error');
});
