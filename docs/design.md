# String Processing Mini Compiler Design

## Purpose
Create a small, explainable compiler front end for the assigned string-processing language, suitable for the group demonstration on 23 October 2026. The supplied topic requires declarations, concatenation, assignment, string output, and validation of literals and escape sequences.

## Language
Use Python 3.10 or later and only its standard library at runtime. The source language has `string`, `print`, ASCII identifiers, double-quoted strings, `=`, `+`, parentheses, and semicolons. Single-line comments begin with `//`. Valid escapes are `\n`, `\t`, `\r`, `\\`, and `\"`. Variables have one global scope and must be declared and initialized before use. Declarations may omit an initializer. Empty programs and empty strings are valid. Literal newlines and unescaped control characters inside strings are errors. Numeric literals are outside the language.

## Components
`lexer.py` returns positioned tokens with raw lexemes and decoded string values. `parser.py` uses recursive descent to build an AST. `semantic.py` checks declaration and initialization rules and returns a symbol table. `compiler.py` coordinates phases and stops after lexical or syntax failure. A separate interpreter previews output only after all checks succeed. This is a compiler front end with an optional interpreter, without machine-code generation.

The CLI prints each phase and can export JSON and an AST in Graphviz DOT format. The Tkinter desktop app uses the same pipeline and shows source, tokens, AST, symbol table, diagnostics, and preview output. It opens and saves UTF-8 source files and exports a JSON compilation result.

## Evidence and submission
Use unittest for valid programs and lexical, syntax, semantic, and CLI failures. Include a formal CFG, transformations, FIRST/FOLLOW sets, example programs, captured GUI screenshots, a project report, an editable presentation, a demonstration guide, and an honest contribution template. Initialize a Git repository and provide a GitHub copy if the authenticated account is available. Missing personal details remain explicitly unfilled.
