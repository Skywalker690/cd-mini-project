# StringLab Browser Application Design

The current user request supersedes the earlier C console implementation. StringLab is a buildless static HTML, CSS and JavaScript application. Every lexer, parser, AST, semantic and preview operation runs in the browser. No application backend, database, API or runtime installation is required.

compiler.js exposes compileSource in the browser and through CommonJS for development tests. Each invocation owns its token, AST and symbol state. The lexer validates double-quoted literals and escapes. Recursive descent implements the transformed LL(1) grammar. Semantic analysis checks declaration order, initialization, duplicate names and string lengths. A separate interpreter previews only accepted programs.

app.js manages the editor, examples, phase strip, result tabs, AST expansion, local file import and Blob downloads. It uses text nodes rather than injecting user source as HTML. Source changes invalidate old results and disable result exports until recompilation. Programs remain in memory unless downloaded.

The interface supports desktop/mobile layouts, keyboard tabs, native dialogs and direct file:// opening. The optional build script copies the static application and project downloads into dist. The same files can be hosted by Sites, GitHub Pages or another static host.

Submission materials describe this browser implementation. Group identities and actual contribution records remain explicitly unfilled. The previous C implementation is retained in Git history rather than the active application.
