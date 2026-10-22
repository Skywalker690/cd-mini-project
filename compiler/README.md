# Compiler stages: where to find and change the logic

Start with [../compiler.js](../compiler.js). Its `compileSource(source)` function calls the stages in this order:

```text
Source text
    ↓ lexical-analysis.js: tokenize()
Tokens
    ↓ syntax-analysis.js: parse()
AST
    ↓ semantic-analysis.js: analyze()
Checked symbol table
    ↓ interpreter.js: execute()
Output
```

`compileSource()` combines the tokens, AST, symbols, diagnostics and output into the report displayed by the app. The preview interpreter runs only when all front-end checks pass.

| File | Responsibility | Edit here when asked to… |
| --- | --- | --- |
| [shared.js](shared.js) | Limits, phase names, `CompileError` and `fail()` | Change maximum lengths or the common diagnostic format |
| [lexical-analysis.js](lexical-analysis.js) | Read characters, recognize keywords and punctuation, validate and decode string literals | Add a keyword, escape sequence or token |
| [syntax-analysis.js](syntax-analysis.js) | Recursive-descent grammar rules and AST construction | Add a statement or change valid syntax |
| [semantic-analysis.js](semantic-analysis.js) | Check declarations, initialization, duplicate names and value lengths | Add or change a semantic rule |
| [interpreter.js](interpreter.js) | Evaluate accepted AST expressions, assignments and output statements | Change how valid programs produce output |

Each file has a short loading wrapper at the top, the stage logic in the middle, and its exported function at the bottom. The wrapper lets the same file run as a normal browser script and as a CommonJS module in Node tests.

## Follow one example

```text
string name = "Ada";
print("Hi, " + name);
```

1. `tokenize(source, tokens)` fills the supplied array with tokens such as `STRING`, `IDENTIFIER`, `STRING_LITERAL`, `PLUS` and `EOF`. Tokens include locations, raw lexemes and decoded values.
2. `parse(tokens)` returns `{ ast, count }`. The AST contains a Declaration and a Print statement with a Concat expression.
3. `analyze(ast, diagnostics)` returns a `Map` of symbols. It verifies that `name` is declared and initialized, and appends any semantic errors to the supplied diagnostics array.
4. `execute(ast, symbols)` returns `["Hi, Ada"]` and records final variable values in the checked symbol table.

## Practise a small logical change

To increase the string limit, edit `LIMITS.string` in `shared.js`. To support another escape, edit the `escapes` map in `lexical-analysis.js` and update the accepted-escape error message. Add a test for the new behavior, update the language guide and grammar documentation as needed, and run `npm test`.

A new language feature can require changes in several stages: first recognize its tokens, then parse its grammar, check its meaning, and implement its preview behavior.

## Interface and AST drawing

`app.js` calls `StringCompiler.compileSource()` and renders the results. `ast-tree.js` draws the graphical AST from the parser's result. Change `ast-tree.js` for the diagram appearance; change `syntax-analysis.js` for the AST structure itself.

## Running and packaging

Open the root `index.html` to use the application. Keep the entire `compiler/` directory beside it. The HTML loads `shared.js`, the four stages, and then the root `compiler.js`, using classic deferred scripts so direct `file://` use works.

Node.js is only needed for development checks. From the project root, run:

```sh
npm test
npm run build
```

The build copies the application and the complete `compiler/` directory into `dist/`. GitHub Pages automatically publishes this folder after a successful push to `main`.
