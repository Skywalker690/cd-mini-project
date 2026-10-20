# StringLab — String Processing Language

A **fully static browser application** for the Compiler Design mini project. The lexer, parser, AST builder, semantic analyzer and preview interpreter run in JavaScript inside the browser. There is no backend, API, database, login, installation or runtime dependency.

Presentation and demonstration: **23 October 2026**.

[Open the live demo on GitHub Pages](https://Skywalker690.github.io/cd-mini-project/).

## Open the application

**Double-click `index.html`.** That is all you need. Choose an example, edit the source and press **Compile & run** or **Ctrl/Cmd + Enter**. The default example compiles automatically.

The application uses local scripts and system fonts, so the downloaded folder also works offline. Use a current browser such as Chrome, Edge, Firefox or Safari. The application does not fetch compiler code, call an API or save programs remotely. Files and results stay in memory unless you download them. A hosted page needs a connection for its first load; the downloaded folder is the offline version.

## Demonstration features

- A source editor with syntax highlighting, line numbers, file import, reset and source download.
- Seven built-in examples, including valid programs and deliberate lexical, syntax and semantic errors.
- A phase strip showing which checks passed, failed or were not reached.
- **Output:** accepted program output or positioned, clickable diagnostics.
- **Tokens:** raw lexemes, decoded string values and source locations.
- **AST:** expandable syntax tree with expand/collapse controls and JSON download.
- **Symbols:** declaration lines, string type, initialization state and final preview values.
- A complete downloadable JSON compilation report.
- A language guide with escapes, CFG, grammar transformations and phase explanations.
- A responsive layout and keyboard-accessible tabs and dialogs. Tab indents in the editor; Shift + Tab leaves it.

## Easy static deployment

The root `index.html`, `styles.css`, `compiler.js`, `examples.js` and `app.js` are the application. Keep them together. The `docs/grammar.md` and `submission/` files support the Project dialog's downloads.

For a clean upload folder, optionally run:

```sh
npm run build
```

This uses Node.js only to copy static files into **`dist/`**. There is no compilation, dependency installation or server. Upload the contents of `dist/` to a static host. With Git-connected hosting, use build command `npm run build` and publish directory `dist`.

**Netlify Drop:** upload the generated `dist` folder. Netlify's manual deployment accepts a folder containing HTML, CSS and JavaScript and does not run a build command. [Official manual deployment instructions](https://docs.netlify.com/deploy/create-deploys/).

**GitHub Pages:** the workflow in `.github/workflows/pages.yml` runs the compiler tests, prepares `dist/` and publishes it whenever `main` changes. Pull requests to `main` run tests and the build without publishing. In the repository's **Settings → Pages**, the source must be **GitHub Actions**. You can redeploy from **Actions → Test and deploy GitHub Pages → Run workflow**, choosing `main`. No dependencies, secrets or environment variables are required. [Official GitHub Pages workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Deployment details and repository workflow are recorded in `docs/deployment.md` and `docs/repository.md`.

## Source structure

| File | Purpose |
| --- | --- |
| `index.html` | Accessible page, result panels, language/project dialogs |
| `styles.css` | Responsive editor and playground styles |
| `compiler.js` | Independent lexer, parser, semantic analyzer and preview |
| `examples.js` | Embedded offline demonstration programs |
| `app.js` | UI, safe text rendering, file import and downloads |
| `scripts/build.mjs` | Optional static deployment packaging |
| `.github/workflows/pages.yml` | Test, build and deploy `main` to GitHub Pages |
| `tests/compiler.test.cjs` | Core language and failure tests using Node's standard library |

## Example language

```text
string name = "World";
string greeting;
greeting = "Hello, " + name + "!";
print(greeting);
```

Output: `Hello, World!`

- One string type and one global scope. Names and keywords are case sensitive.
- Declarations: `string name;` or `string name = expression;`.
- Assignment: `name = expression;`. Concatenation: `+`. Grouping: parentheses.
- Output: `print(expression);`, adding a newline for each print.
- Double-quoted strings support `\n`, `\t`, `\r`, `\\`, and `\"`.
- End statements with semicolons. `//` starts a line comment outside strings.
- Declare and initialize variables before reading them. Redeclaration is an error.
- Empty strings and empty programs are valid. Numeric literals and single quotes are outside the language.

The engine implements actual compiler phases. It does not use `eval`, `Function`, regex-only parsing or precomputed example outputs. Any valid program in this grammar can run. The preview interpreter executes only after every front-end check succeeds. It does not generate machine code.

## Tests and limits

Node.js 20 or later is needed only for development checks:

```sh
npm test
```

The core suite contains **29 tests**, several with multiple cases. Browser checks additionally verify examples, result tabs, AST controls, keyboard use, stale-state invalidation, file import, source/AST/report downloads, inert HTML strings, mobile layout and direct `file://` use.

`tests/browser.cjs` preserves the optional browser regression suite, including oversized-file import handling. It opens the local HTML file and needs Playwright and a local Chrome installation for development only. Run it with `npm run test:browser` when those tools are available. Neither is part of the application's runtime or deployment.

| Resource | Limit |
| --- | --- |
| Source | 65,535 UTF-16 code units |
| Tokens / AST nodes | 4,096 each, including the EOF token |
| Symbols / ASCII identifier | 256 / 63 characters |
| Literal or concatenated value | 1,023 UTF-16 code units |
| Parenthesis nesting / expression depth | 128 |

Locations use one-based lines and UTF-16 code-unit columns. CRLF counts as one line break. Unicode string values are supported, but there is no Unicode normalization. There are no numeric types, input statements, loops, functions or nested scopes. User source is rendered as text, and Maps keep prototype-like names safe.

## Submission materials

| Requirement | Evidence |
| --- | --- |
| Project report | `submission/Project_Report.docx`, editable content in `docs/report.md` |
| Complete source | The five static application files above |
| Git/GitHub repository | Local Git history and `docs/repository.md` |
| README | This file |
| CFG and transformations | `docs/grammar.md`, in-app language guide |
| Lexical analyzer | `tokenize()` in `compiler.js`, Tokens tab |
| Parse tree or AST | `parse()` in `compiler.js`, interactive AST tab and JSON export |
| Semantic checks | `analyze()` in `compiler.js`, diagnostics and Symbols tab |
| Screenshots | `screenshots/`, actual engine results in `screenshots/results/` |
| Presentation | `submission/Presentation.pptx` |
| Individual contribution details | `docs/contributions.md` and the report sheet |

Before submission, enter the real institution, group, faculty, names, roll numbers and contributions. Review and understand the assistant-prepared implementation and follow your institution's disclosure requirements. See `docs/demo-guide.md` for a presentation script and viva questions.
