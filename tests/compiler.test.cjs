const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compileSource, LIMITS } = require('../compiler.js');

function accepted(source) {
  const result = compileSource(source);
  assert.equal(result.success, true, JSON.stringify(result.diagnostics));
  return result;
}
function rejected(source, phase, message) {
  const result = compileSource(source);
  assert.equal(result.success, false);
  assert.equal(result.diagnostics[0].phase, phase);
  assert.match(result.diagnostics.map(d => d.message).join('\n'), message);
  assert.deepEqual(result.output, []);
  return result;
}

test('all required language features', () => {
  const r = accepted('string name = "Ada"; string msg; msg = "Hi, " + name; print(msg);');
  assert.deepEqual(r.output, ['Hi, Ada']);
  assert.equal(r.symbols.find(s => s.name === 'msg').value, 'Hi, Ada');
  assert.equal(r.ast.type, 'Program');
  assert.equal(r.ast.body[2].expression.type, 'Concat');
  assert.deepEqual(r.phases.map(p => p.status), ['success','success','success']);
});
test('decode all supported escapes exactly once', () => {
  const r = accepted(String.raw`print("a\nb\tc\r\"d\\e"); print("\\n");`);
  assert.deepEqual(r.output, ['a\nb\tc\r"d\\e', '\\n']);
  assert.ok(r.tokens.find(t => t.kind === 'STRING_LITERAL').lexeme.includes('\\n'));
});
test('left associative AST and parentheses', () => {
  const r = accepted('print("a" + ("b" + "c") + "d");');
  assert.deepEqual(r.output, ['abcd']);
  assert.equal(r.ast.body[0].expression.left.type, 'Concat');
});
test('empty strings and empty programs', () => {
  assert.deepEqual(accepted('').output, []);
  assert.deepEqual(accepted('// nothing').output, []);
  assert.deepEqual(accepted('print("");').output, ['']);
});
test('CRLF positions and comments inside strings', () => {
  const r = accepted('// ignore\r\nstring stringer = "http://a";\r\nprint(stringer);');
  assert.deepEqual(r.output, ['http://a']);
  assert.equal(r.tokens[0].line, 2); assert.equal(r.tokens[0].column, 1);
});
test('Unicode literals and case sensitive identifiers', () => {
  assert.deepEqual(accepted('string a="नमस्ते"; string A="🌟"; print(a+A);').output, ['नमस्ते🌟']);
});
test('keywords matched only after complete identifier', () => {
  assert.deepEqual(accepted('string printer="ok"; string stringer=printer; print(stringer);').output,['ok']);
});
test('prototype-like names are ordinary identifiers', () => {
  assert.deepEqual(accepted('string __proto__="a"; string constructor="b"; print(__proto__+constructor);').output,['ab']);
});
test('literal code stays inert data', () => {
  const code = '<img src=x onerror=alert(1)>';
  assert.deepEqual(accepted(`print("${code}");`).output, [code]);
});
test('invalid escape', () => rejected(String.raw`print("bad\q");`,'Lexical',/escape/i));
test('unterminated quote and trailing backslash', () => {
  rejected('print("open);','Lexical',/unterminated/i);
  rejected('print("tail'+'\\','Lexical',/unterminated/i);
});
test('raw newline and controls in strings', () => {
  rejected('print("line\nbreak");','Lexical',/newline/i);
  rejected('print("tab\there");','Lexical',/control/i);
});
test('unexpected characters, numbers and single quotes', () => {
  for(const s of ['print(42);',"print('a');",'print("x"); @']) rejected(s,'Lexical',/unexpected/i);
});
test('NUL is rejected rather than truncating input', () => rejected('print("ok");\0print(x);','Lexical',/NUL/i));
test('NUL cannot hide in a string or comment', () => {
  rejected('// hidden\0text','Lexical',/NUL/i);
  rejected('print("hidden\0text");','Lexical',/NUL/i);
});
test('BOM accepted', () => assert.deepEqual(accepted('\uFEFFprint("ok");').output,['ok']));
test('missing punctuation and malformed expressions', () => {
  for(const s of ['string x="a"','print("a"+);','print("a";','string ="a";',
     'print();','string print="a";','print("a"); )']) rejected(s,'Syntax',/expected/i);
});
test('collect independent semantic errors', () => {
  const r = rejected('string x; print(x); y="a"; string x="b";','Semantic',/initialized/i);
  assert.equal(r.diagnostics.length,3);
  assert.equal(r.symbols[0].initialized,false);
});
test('self reference and declaration order', () => {
  rejected('string x=x;','Semantic',/initialized/i);
  rejected('print(x); string x="later";','Semantic',/declared/i);
});
test('failed assignment does not initialize', () => {
  const r = rejected('string x; x=missing; print(x);','Semantic',/declared/i);
  assert.match(r.diagnostics[1].message,/initialized/);
});
test('reassignment reads previous value', () => {
  assert.deepEqual(accepted('string x="a"; print(x); x=x+"b"; print(x);').output,['a','ab']);
});
test('invalid program never previews earlier prints', () => rejected('print("no"); print(unknown);','Semantic',/declared/));
test('source locations and skipped phases', () => {
  const r = rejected('string x;\nprint(x);','Semantic',/initialized/);
  assert.equal(r.diagnostics[0].line,2); assert.equal(r.diagnostics[0].column,7);
  assert.deepEqual(rejected('@','Lexical',/unexpected/i).phases.map(p=>p.status),['error','skipped','skipped']);
  assert.deepEqual(rejected('print();','Syntax',/expected/i).phases.map(p=>p.status),['success','error','skipped']);
});
test('identifier and literal bounds', () => {
  accepted('string '+ 'a'.repeat(LIMITS.identifier)+';');
  rejected('string '+ 'a'.repeat(LIMITS.identifier+1)+';','Lexical',/identifier.*limit/i);
  accepted('print("'+ 'a'.repeat(LIMITS.string)+'");');
  rejected('print("'+ 'a'.repeat(LIMITS.string+1)+'");','Lexical',/literal.*limit/i);
});
test('concatenation value bound', () => rejected('print("'+'a'.repeat(700)+'"+"'+'b'.repeat(400)+'");','Semantic',/limit/i));
test('source, token and symbol limits', () => {
  rejected(' '.repeat(LIMITS.source+1),'Lexical',/source.*limit/i);
  rejected('print("");'.repeat(1000),'Lexical',/token.*limit/i);
  rejected(Array.from({length:LIMITS.symbols+1},(_,i)=>`string x${i};`).join(''),'Semantic',/symbol.*limit/i);
});
test('parenthesis and long expression depth bounds', () => {
  rejected('print('+'('.repeat(150)+'"a"'+')'.repeat(150)+');','Syntax',/nesting/i);
  rejected('print('+Array(150).fill('"a"').join('+')+');','Syntax',/depth/i);
});
test('compilations do not share symbol state', () => {
  accepted('string x="a";'); rejected('print(x);','Semantic',/declared/);
});
test('serializable report includes raw lexemes and AST', () => {
  const r=JSON.parse(JSON.stringify(accepted('print("hello");')));
  assert.equal(r.tokens[2].lexeme,'"hello"'); assert.equal(r.ast.body[0].type,'Print');
});
