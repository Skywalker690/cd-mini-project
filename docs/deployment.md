# Static Deployment

The application is ordinary HTML, CSS and JavaScript. Its compiler runs entirely in the browser. No backend, environment variables, database, secrets or application server are needed.

## Offline demonstration
Keep index.html, styles.css, compiler.js, examples.js, ast-tree.js and app.js together with the complete compiler/ directory, then open index.html. Keep docs/grammar.md and submission/ beside them for the Project dialog downloads. The optional build copies all compiler stages into dist/compiler/ automatically.

## Upload folder
Run npm run build if Node is available. Upload the contents of dist, including its index.html. This optional command only copies files. For connected static hosting use npm run build as the build command and dist as the publish directory.

## GitHub Pages

Public demo: [StringLab](https://Skywalker690.github.io/cd-mini-project/).

The repository uses `.github/workflows/pages.yml` with **GitHub Actions** as the Pages publishing source. Every push to `main` runs `npm test`, then `npm run build`, uploads only `dist/`, and deploys it to Pages. Pull requests run the tests and build without deploying. A failed test or build prevents deployment. The workflow uses GitHub's built-in token; no custom secrets or credentials are needed.

To update the demo, commit and push changes to `main`, or merge a feature branch into `main` and push. Watch **Actions → Test and deploy GitHub Pages** for the result. To redeploy the existing version, choose **Run workflow** and select `main`.

In **Settings → Pages → Build and deployment**, keep **Source: GitHub Actions**. The app's relative asset and download links work under the `/cd-mini-project/` path. Do not upload `dist/` to Git manually; the workflow creates it.

[Official GitHub Pages workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Other static hosts
Netlify supports manually uploading a folder of static site files. Manual deployment does not run a build command, so use the already prepared dist folder. [Official Netlify instructions](https://docs.netlify.com/deploy/create-deploys/).

## Earlier hosted preview

[Open StringLab](https://stringlab-compiler-demo-sanjo.soundlamb258.chatgpt.site).

The deployment was verified as successful. This Sites publication is owner-private and may ask you to sign in. The application's compiler itself has no authentication or backend. Use the portable static folder with your chosen public host when you need a link for other people.

A hosted first load uses the network to retrieve static files. For guaranteed offline use, download the folder and open index.html directly.
