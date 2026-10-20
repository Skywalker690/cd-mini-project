# Git Repository

Configured repository: [Skywalker690/cd-mini-project](https://github.com/Skywalker690/cd-mini-project).

The browser refactor is integrated into `main`. The prior C version remains in Git history. The public demo is [StringLab on GitHub Pages](https://Skywalker690.github.io/cd-mini-project/).

For future changes, create a feature branch and push it:

```sh
git switch main
git pull --ff-only
git switch -c feat/your-change
# Edit and check the app.
npm test
npm run build
git add <changed-files>
git commit -m "Describe your change"
git push -u origin feat/your-change
```

Open a pull request to `main`. The Pages workflow checks the tests and static build. After merging, it automatically publishes the updated `dist/` folder. Keep the Pages publishing source set to **GitHub Actions**. See [deployment instructions](deployment.md).
