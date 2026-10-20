# C Mini Compiler Implementation Plan

**Goal:** Deliver a working C99 string-language compiler front end and submission materials.
**Spec:** docs/design.md
**Implementation:** One C file divided by phase, standard library only. Python is an optional test runner.

## Constraints and review focus
Validate declarations, assignment, concatenation, output, literals and escapes. Guard every fixed buffer. Test escaped quotes, CRLF, EOF, comments inside strings, embedded NUL, initialization order, capacity boundaries and CLI failures. Never execute an invalid program or invent contribution details.

## Tasks
- [x] Write black-box tests and observe missing executable.
- [x] Implement and build src/mini_compiler.c with C99 warnings as errors.
- [x] Run automated tests and demonstrate all success/error examples and DOT export.
- [x] Supply Windows/Linux build commands and launch scripts.
- [x] Document CFG transformations, FIRST/FOLLOW, architecture and semantics.
- [x] Capture compiler output and render labeled screenshots.
- [x] Create and visually inspect the report and editable presentation.
- [x] Verify the submission checklist and existing GitHub remote; prepare the completed local branch.

## Progress
The initial Python direction was replaced by C following the user's explicit preference. Runtime code will be C only.

Final verification: 26 automated test methods pass. Both I/O review findings were reproduced by failing tests, fixed, and verified with the full suite. Report: 9 pages. Slides: 12. Screenshots: 7. The public GitHub remote is preserved, and publication of the completed local branch is left to the user. No unaddressed code-review findings remain.
