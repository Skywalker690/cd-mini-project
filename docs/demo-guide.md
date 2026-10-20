# Presentation and Demonstration Guide

Presentation date: **23 October 2026**.

## Before class

1. Read README.md and build the C executable using build.bat or the GCC command.
2. Run the valid program and the three error examples. Keep the project and slides available offline.
3. Fill in group and contribution details in docs/contributions.md and the report. Update the title slide with your group details.
4. Each person should explain their actual work and at least one compiler phase.

## Suggested demonstration lasting five to seven minutes

1. Explain that this is the front end for a small string-processing language, implemented in C99.
2. Open examples/hello.str and identify declaration, assignment, concatenation and print.
3. Run `build\mini_compiler.exe examples\hello.str`. Explain the tokens, AST, semantic status, output and symbol table.
4. Run `build\mini_compiler.exe examples\escapes.str --run`. Explain escaped newline, tab, quote, backslash and why `\\n` stays literal.
5. Run `build\mini_compiler.exe examples\ast_demo.str --ast --dot build\ast.dot`. Explain why punctuation does not appear in the AST.
6. Run each of lexical_error.str, syntax_error.str and semantic_error.str with `--check`. Read the phase, line, column and caret. Explain that compilation failure prevents preview execution.
7. Show docs/grammar.md and the test summary. End with the scope and limitations.

run_demo.bat runs the key examples with pauses. A failing example intentionally returns exit code 1.
AST export preserves existing readable files, so choose a fresh output filename for each manual export. The demo script selects a random filename in build automatically.

## Questions to rehearse

**Is this a complete machine-code compiler?** It is a compiler front end: lexical, syntax and semantic analysis. A separate interpreter previews accepted programs. It does not generate assembly or machine code.

**Why use recursive descent?** The transformed grammar is LL(1). Each nonterminal maps to a simple C function or loop, making the implementation easy to trace.

**Why remove left recursion?** A function for Expr calling itself before consuming a token would recurse indefinitely. The parser reads a Term, then loops over `+ Term`.

**Why left factor declarations?** Both forms begin with `string id`. After that prefix, `=` selects an initializer and `;` selects no initializer.

**How are types checked?** String is the only type. The grammar permits only string literals, identifiers and concatenation. Semantic analysis requires every identifier to denote a declared, initialized string. Numeric literals fail lexical analysis.

**How are buffers protected?** Each fixed array has an explicit capacity check. The semantic analyzer tracks string lengths before preview evaluation and rejects results above 1023 bytes.

**Why use setjmp and longjmp?** They stop the active lexer/parser pipeline after a fatal error without adding error returns at every recursive parser call. Semantic errors are collected separately. These are standard C library functions.

**What are the limitations?** One global scope, no numeric type, input, loops, functions, code generation or Unicode validation. Fixed capacities are documented in README.md.
