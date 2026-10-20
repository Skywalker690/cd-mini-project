# String Processing Mini Compiler Design

## Purpose
Create a small, explainable compiler front end for the assigned string-processing language, suitable for the group demonstration on 23 October 2026. The supplied topic requires declarations, concatenation, assignment, string output, and validation of literals and escape sequences.

## Language
Use C99 and only its standard library at runtime, as requested by the user. The source language has `string`, `print`, ASCII identifiers, double-quoted strings, `=`, `+`, parentheses, and semicolons. Single-line comments begin with `//`. Valid escapes are `\n`, `\t`, `\r`, `\\`, and `\"`. Variables have one global scope and must be declared and initialized before use. Declarations may omit an initializer. Empty programs and empty strings are valid. Literal newlines and unescaped control characters inside strings are errors. Numeric literals are outside the language.

## Components
`src/mini_compiler.c` contains clearly separated lexer, recursive-descent parser, semantic analyzer, AST display/export, preview interpreter, and command-line sections. The lexer retains raw lexemes and decoded literal values. Semantic analysis checks declaration, initialization, and string-length bounds. The pipeline stops on failure. A separate interpreter previews output only after all checks succeed. This is a compiler front end with an optional interpreter, without machine-code generation.

The console prints positioned tokens, AST, symbol table, diagnostics, and preview output. Flags select phase detail or disable execution. It exports an AST in Graphviz DOT format. Fixed arrays keep the C code easy to explain, with explicit diagnostics for source, token, node, symbol, identifier, literal/value, and nesting limits.

## Evidence and submission
Use Python unittest only as an optional test runner that invokes the C executable. Include a formal CFG, transformations, FIRST/FOLLOW sets, example programs, screenshots rendered from captured compiler output, a project report, an editable presentation, a demonstration guide, and an honest contribution template. Preserve the existing Git repository and GitHub remote, and commit the completed feature branch locally for review. Missing personal details remain explicitly unfilled.
