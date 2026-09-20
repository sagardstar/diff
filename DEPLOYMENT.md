# Publishing and maintenance

## Repositories and URLs

- Source: https://github.com/sagardstar/diff
- Diff tool: https://www.sagarwadhwa.com/diff/
- Website: https://github.com/sagardstar/sagardstar.github.io
- Website listing: https://www.sagarwadhwa.com/playground/

The `diff` repository is published by GitHub Pages from `main`, directory `/ (root)`. The `.nojekyll` file tells Pages to serve the static files as-is, including `vendor/`.

This matches `sagardstar/timer_website`: a public repository with branch-based Pages publishing. There is one copy of the application. The main website only holds a Playground link; no application files are copied into it.

The project inherits the existing website's custom domain. **Do not add a CNAME file or a separate custom domain to this repository.** No DNS change is needed. Keep the repository named `diff` to keep the `/diff/` URL.

## Publish an update

From this directory:

```sh
node --test tests/diff.test.cjs
git diff
git add index.html style.css app.js favicon.svg vendor README.md DEPLOYMENT.md tests
git commit -m "Describe the update"
git push origin main
```

Stage any new files you intentionally add as well. GitHub Pages automatically publishes pushes to `main`. Builds usually take a few minutes. Inspect progress in the repository's **Actions** tab or **Settings → Pages**. If a page looks unchanged after a successful deployment, perform a hard refresh.

The Playground entry lives in `_data/playground.yml` in the website repository. Editing the diff app does not require updating or redeploying that repository.

`integration/website.patch` records the three-line Playground addition for review or recovery. It contains no duplicate application assets.

## If publishing needs to be enabled again

In `sagardstar/diff` → **Settings → Pages**:

1. Choose **Deploy from a branch**.
2. Select **main** and **/ (root)**, then Save.
3. Leave **Custom domain** empty; the parent site's domain is inherited.
4. Wait for the Pages build to complete and open the tool URL above.

The website's local checkout under `website_using_jekyll/` has separate unpublished work. This setup deliberately leaves it untouched. Fetch and reconcile that work before using that checkout for future website changes; do not force-push it.
