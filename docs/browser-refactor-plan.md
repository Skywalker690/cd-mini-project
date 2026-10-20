# Browser Compiler Refactor

## Accepted scope
The user replaces the earlier console requirement with a static frontend application. All compiler logic must run in the browser, without a backend, API, account, database or C toolchain. The existing assigned language and submission requirements still apply.

## Implementation
Use buildless HTML, CSS and JavaScript. Classic scripts also support opening index.html through file://. compiler.js exposes a pure compileSource function in browsers and CommonJS for Node tests. Keep a real lexer, recursive-descent parser, AST, semantic analyzer and gated preview interpreter. Never use eval or Function. Use Maps for symbol tables and safe DOM text rendering.

## Experience
An editable source panel sits beside result tabs for output, tokens, an expandable AST and symbols. A phase strip shows lexical, syntax and semantic progress. Include valid/error examples, keyboard compile, file import, source and report download, a language/grammar guide, responsive layout and accessible controls. Changes invalidate previous results. The initial example compiles automatically for immediate demonstration.

## Verification and deliverables
- [x] Port behavior using failing Node tests first, then implement the compiler.
- [x] Implement and browser-test all controls, offline/file use, error examples and mobile layout.
- [x] Replace C runtime instructions, screenshots, report, slides and archive with browser equivalents.
- [x] Prepare portable static output and a hosted Sites preview.
- [x] Review and run all checks. Save the final local commit after verification.

Runtime limits use JavaScript UTF-16 code units: 65535 for source, 1023 for string values and 63 for ASCII identifiers. Preserve 4096-token, 256-symbol and 128-depth limits. Explain this difference from the earlier C byte limits in the updated documentation.
