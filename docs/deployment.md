# Static Deployment

The application is ordinary HTML, CSS and JavaScript. Its compiler runs entirely in the browser. No backend, environment variables, database, secrets or application server are needed.

## Offline demonstration
Keep index.html, styles.css, compiler.js, examples.js and app.js together, then open index.html. Keep docs/grammar.md and submission/ beside them for the Project dialog downloads. The complete project archive contains these paths.

## Upload folder
Run npm run build if Node is available. Upload the contents of dist, including its index.html. This optional command only copies files. For connected static hosting use npm run build as the build command and dist as the publish directory.

## Hosting choices
Netlify supports manually uploading a folder of static site files. Manual deployment does not run a build command, so use the already prepared dist folder. [Official Netlify instructions](https://docs.netlify.com/deploy/create-deploys/).

GitHub Pages supports publishing an index.html from a selected branch and root folder. Push the browser version, select that branch and / (root), and preserve .nojekyll. [Official GitHub Pages instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Hosted preview

[Open StringLab](https://stringlab-compiler-demo-sanjo.soundlamb258.chatgpt.site).

The deployment was verified as successful. This Sites publication is owner-private and may ask you to sign in. The application's compiler itself has no authentication or backend. Use the portable static folder with your chosen public host when you need a link for other people.

A hosted first load uses the network to retrieve static files. For guaranteed offline use, download the folder and open index.html directly.
