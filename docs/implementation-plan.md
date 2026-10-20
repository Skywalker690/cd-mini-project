# String Processing Mini Compiler Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkboxes for tracking.

**Goal:** Deliver a working, simple compiler front end and the required submission materials.

**Architecture:** A positioned lexer feeds a recursive-descent AST parser and a semantic analyzer. A separate preview interpreter, CLI, and Tkinter app share the compilation result.

**Tech Stack:** Python 3.10+, standard library, unittest. Office artifacts use the bundled document and presentation tools.

**Spec:** docs/design.md

## Global Constraints
- No third-party runtime dependencies.
- Support declarations, assignment, concatenation, output, and validated literals/escapes.
- Keep code divided by compiler phase and explain it in the report.
- Never invent group member identities or contributions.

## Review Focus
- Escaped quotes and backslashes must not prematurely end literals.
- CRLF, comments, and EOF errors must report useful source locations.
- Invalid programs must produce no preview output.
- Duplicate declarations and failed initializers must not initialize variables.
- File/CLI errors must have nonzero exit codes and readable messages.

## Task 1 Compiler phases
Files: mini_compiler/{models,lexer,parser,semantic,interpreter,compiler}.py and tests/test_compiler.py.
Interfaces: `compile_source(source: str) -> CompilationResult`; result exposes tokens, ast, symbols, diagnostics, output, success, to_dict(); `format_ast(node) -> str`; `ast_to_dot(node) -> str`.
- [ ] Write tests for language requirements and review focus, run and observe missing implementation.
- [ ] Implement positioned tokens, AST, lexer, parser, semantics, and gated preview execution.
- [ ] Run `python -m unittest discover -s tests -v`, requiring zero failures.

## Task 2 Demonstration interfaces
Files: mini_compiler/{__main__,cli,gui}.py, main.py, launch_gui.bat, examples/*.str, tests/test_cli.py.
Interfaces: `python -m mini_compiler FILE [--json] [--dot PATH] [--check]`; `python main.py` opens the GUI.
- [ ] Write CLI integration tests, observe failure, implement CLI.
- [ ] Implement the desktop UI against compile_source, then exercise each tab, error case, file operation, and export.
- [ ] Capture real GUI screenshots and run the complete suite.

## Task 3 Submission materials
Files: README.md, docs/{grammar,report,contributions,demo-guide,submission-checklist}.md, submission/*.docx, submission/*.pptx, screenshots/*.png.
- [ ] Derive grammar transformations and FIRST/FOLLOW sets from the implemented parser.
- [ ] Produce the report and presentation with real examples and verified test evidence.
- [ ] Render and inspect the Office artifacts, initialize Git, and verify the complete submission checklist.
