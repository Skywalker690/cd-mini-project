# Browser Version Verification

Prepared on 20 October 2026 for the presentation on 23 October 2026.

- Core Node suite: 29 passing tests covering the language, escapes, literals, grammar, AST, semantics, source locations, capacities, state isolation and serialization.
- Browser checks: automatic example compilation, all result tabs, AST controls, valid/error examples, keyboard compilation and tab navigation, stale-result invalidation, source import, source/AST/report downloads, safe rendering of HTML strings, dialogs, mobile overflow and direct file:// use.
- Screenshot evidence: actual browser captures with corresponding compiler result JSON in screenshots/results.
- Runtime: local HTML/CSS/JavaScript only. No eval, Function, API, database, remote persistence, web fonts or CDN dependency.
- A NUL-in-comment regression was reproduced by a failing test and corrected so NUL is rejected anywhere in source.
- Independent review found an oversized-file-import issue. A browser regression reproduced it; decoded source length is now validated before editor state changes, and gutter updates use a fragment rather than a variadic spread. The complete browser suite passes with the oversized-import regression.

The report and slides are regenerated around the browser implementation and visually verified before delivery. Group identities and actual contribution records remain intentionally unfilled.

Final artifact checks: all nine report pages and thirteen presentation slides were rendered and inspected. The presentation passed package, layout, font and import checks. The earlier static Sites deployment returned succeeded.

GitHub Pages uses the checked-in `.github/workflows/pages.yml` to test the compiler, build the static folder and deploy changes to `main`. Pull requests run validation without deployment. Only files copied into `dist/` are published.

Automatic approval review blocked deleting three old generated files under the ignored build directory. They are not used by the application and are excluded from both downloadable archives and deployment.
