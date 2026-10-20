# Presentation and Demonstration Guide

Presentation date: 23 October 2026.

## Before class
Open index.html directly, or open the deployed site. Download the complete folder for an offline backup. Fill in actual group details and contributions in the report, slides and contribution sheet.

## Suggested demonstration
1. Show the default program. Identify declaration, assignment, concatenation and print.
2. Change World to your own name. Explain that old results become invalid until Compile and run is pressed. Use Ctrl/Cmd + Enter.
3. Open Tokens. Explain raw lexemes, decoded values and source locations. Select a token location to highlight the source.
4. Choose A tiny AST. Open AST, expand/collapse it, and explain why punctuation is omitted. Download AST JSON.
5. Open Symbols. Explain initialization and final preview values.
6. Choose Escape sequences, then each of the three error examples. Explain the failed and skipped phases, locations and absence of output on error.
7. Open Language guide and explain left recursion removal, factoring and the final LL(1) grammar.
8. Export the compilation report and save the source. Show that no backend is involved.

## Questions to rehearse
Is this a compiler or interpreter? It is a real compiler front end with lexical, syntax and semantic analysis, plus a separate preview interpreter. It does not generate machine code.

Why JavaScript? It makes the complete demonstration portable static files. The browser runs all logic, and hosting only serves files.

Why remove left recursion? Direct recursive descent cannot repeatedly call the same production before consuming a token. An expression loop reads Term then zero or more + Term pairs and builds a left-associated AST.

Why factor declarations? Both forms start with string id. The next token chooses an initializer or the terminating semicolon.

How are types checked? String is the only type. The grammar permits string literals, identifiers and concatenation. Semantic analysis verifies that each referenced identifier denotes an initialized string.

Can arbitrary JavaScript execute? Source is parsed as StringLang, never passed to eval or Function. Output is inserted as text. A quoted HTML string remains data.

Where is data stored? Source and results live in the current page's memory. Downloads save files chosen by the user. There is no remote storage or automatic persistence.

How is it deployed? Open index.html directly, upload dist to a static host, or publish the root through GitHub Pages. No backend configuration is needed.
