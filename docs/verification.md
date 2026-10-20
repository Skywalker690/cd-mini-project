# Verification Record

Prepared on 20 October 2026 for the demonstration on 23 October 2026.

- Built the C source using Zig 0.13.0's Clang-compatible C compiler in C99 mode with `-Wall -Wextra -Wpedantic -Werror -O2`, with no warnings.
- Ran `python -m unittest discover -s tests -v`: 26 test methods passed. Several methods include multiple inputs.
- Ran valid hello, escape and AST examples plus deliberate lexical, syntax and semantic failures.
- Captured seven actual executable transcripts and rendered screenshots for readable submission evidence.
- A separate code review found two I/O issues: export could overwrite source, and failed stdout writes could return success. Added tests that reproduced both issues, fixed them and passed the complete suite.
- AST export now preserves existing readable files, and output write failures return a nonzero status.

The nine report pages and twelve presentation slides were rendered and visually checked. The PowerPoint also passed package, layout, font and import validation. Personal identities and actual contribution records remain the group's responsibility and are explicitly unfilled.
