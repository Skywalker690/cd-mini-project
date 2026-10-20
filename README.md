# String Processing Mini Compiler in C

A small **compiler front end written in C99** for the Compiler Design mini project. It supports string declarations, assignment, concatenation, output, lexical validation, an AST and semantic checks. A separate interpreter previews accepted programs. No assembly or machine code is generated.

Presentation and demonstration: **23 October 2026**.

## Quick start on this Windows computer

Open PowerShell in the project folder:

```powershell
.\build.bat
.\build\mini_compiler.exe examples\hello.str
```

Double-click `run_demo.bat` for a demonstration with pauses. The executable is already built locally in `build/mini_compiler.exe`. Build outputs are ignored by Git. `build.bat` checks GCC, Clang, Zig and the local verification toolchain in that order. A fresh clone needs a C compiler installed and available on PATH. Python is optional and used only for the automated tests.

## Build on another computer

With GCC or a compatible C compiler:

```sh
gcc -std=c99 -Wall -Wextra -Wpedantic -O2 src/mini_compiler.c -o mini_compiler
./mini_compiler examples/hello.str
```

On Windows name the output `mini_compiler.exe` and run `.\mini_compiler.exe`. With Zig, replace `gcc` by `zig cc`. With Clang, replace it by `clang`. On Linux/macOS, `make`, `make demo` and `make test` are also provided.

## Example program

```text
string name = "World";
string greeting;
greeting = "Hello, " + name + "!";
print(greeting);
print("Mini compiler in C");
```

Preview output:

```text
Hello, World!
Mini compiler in C
```

## Language rules

- Declare with `string name;` or `string name = expression;`.
- Assign with `name = expression;` and concatenate using `+`.
- Output with `print(expression);`. Each print adds a newline.
- Group expressions using parentheses. Concatenation associates to the left.
- End every statement with a semicolon. Write comments with `//` outside strings.
- Identifiers match `[A-Za-z_][A-Za-z0-9_]*`. Names and keywords are case sensitive.
- Use double quotes for strings. Accepted escapes: `\n`, `\t`, `\r`, `\\`, `\"`.
- Empty strings and empty programs are valid.
- Raw line breaks/control characters, invalid escapes and unterminated strings are errors.
- Variables share one global scope. Declare and initialize them before use. Redeclaration is an error.
- String is the only type. Numbers and single-quoted strings are outside the language.

The lexer passes UTF-8 string bytes through unchanged. It does not validate Unicode encoding. Source locations use one-based lines and byte columns. CRLF is one line break. For UTF-8 display in Windows consoles, run `chcp 65001` first. The demo script does this automatically.

## Compiler phases

1. **Lexical analysis:** scan source into tokens with raw spans, decoded literal values, line and column.
2. **Syntax analysis:** parse the transformed LL(1) grammar with recursive descent and build the AST.
3. **Semantic analysis:** check declaration order, duplicate names, initialization, and string lengths.
4. **Preview:** interpret only after every compiler check succeeds.

The default command displays tokens, AST, phase results, preview output and the final symbol table. A lexical or syntax error stops its phase. Semantic analysis can report several errors. Failed compilation never executes the preview.

## Commands

```powershell
.\build\mini_compiler.exe examples\hello.str --run
.\build\mini_compiler.exe examples\hello.str --check
.\build\mini_compiler.exe examples\ast_demo.str --tokens --ast --symbols
.\build\mini_compiler.exe examples\ast_demo.str --ast --dot build\ast.dot
.\build\mini_compiler.exe examples\escapes.str --run
.\build\mini_compiler.exe examples\lexical_error.str --check
.\build\mini_compiler.exe examples\syntax_error.str --check
.\build\mini_compiler.exe examples\semantic_error.str --check
```

`--all` shows all details and is the default. `--run` selects compact phase status plus output. `--check` suppresses preview execution and can be combined with detail flags. `--tokens`, `--ast`, and `--symbols` select details. `--dot PATH` exports the AST after successful semantic checking. `--help` lists options. Optional Graphviz can render DOT with `dot -Tpng build/ast.dot -o build/ast.png`; it is not required to run the compiler.

AST export preserves existing readable files. Choose a new DOT filename when repeating an export. This also protects a source file used accidentally as the export path.

Exit codes: **0** success, **1** lexical/syntax/semantic failure, **2** usage or file/export failure. Error examples intentionally return 1.

## Tests

Windows, after building:

```powershell
python -m unittest discover -s tests -v
```

For a different executable, set `MINI_COMPILER` to its absolute path. On Linux/macOS use `make test`. The initial suite contains 26 test methods with additional cases inside several methods. It tests valid programs, escapes, comments, CRLF, UTF-8 pass-through, syntax/semantic failures, locations, no execution after errors, capacities, CLI errors and DOT export.

## Source and submission materials

| Requirement | File or folder |
| --- | --- |
| Complete source code | `src/mini_compiler.c` |
| Project report | `submission/Project_Report.docx`, editable text in `docs/report.md` |
| Git/GitHub repository | Local `.git` and the repository link below |
| README | This `README.md` file |
| CFG and grammar transformations | `docs/grammar.md` |
| Lexical analyzer | `lex()` in the C source |
| Parse tree or AST | Console AST and `--dot` export |
| Semantic checks | `analyze()` and `expression_length()` in the C source |
| Screenshots | `screenshots/`, with source output transcripts in `screenshots/transcripts/` |
| Presentation | `submission/Presentation.pptx` |
| Individual contributions | `docs/contributions.md` and the report's contribution sheet |

`docs/demo-guide.md` gives a presentation script and viva questions. `docs/submission-checklist.md` identifies the remaining personal details. Screenshots are browser-rendered captures of actual C executable transcripts, with source and command labels. They are not images of an IDE or native terminal window.

## Fixed limits and scope

| Item | Limit |
| --- | --- |
| Source file | 65535 bytes |
| Tokens | 4096 including EOF |
| AST nodes | 4096 |
| Variables | 256 |
| Identifier | 63 bytes |
| Decoded literal or concatenated value | 1023 bytes |
| Parenthesis nesting and AST height | 128 |

These limits keep the implementation readable and are checked before writing buffers. Statement wrapper nodes contribute to AST height, so the accepted expression depth may be smaller than 128. The implementation has no input, loops, functions, numeric types, nested scopes, optimization or machine-code generation.

## Group details and repository

Fill in the college, department, group number, faculty name, members and roll numbers in `docs/contributions.md` and the report before submitting. Suggested roles are not claims of actual contribution. Review and understand the code, record real work and follow your institution's requirements for disclosing coding-assistant help.

The configured GitHub remote and local branch workflow are recorded in `docs/repository.md`. The completed branch is committed locally and has not been pushed to GitHub.
