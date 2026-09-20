# Diff

A small, warm, browser-only text and code comparison tool. Paste two versions or open local files, then compare. No build step, backend, account, or installation required.

[Open Diff](https://www.sagarwadhwa.com/diff/) · [Source](https://github.com/sagardstar/diff)

## Run locally

Open `index.html` in a recent browser, or serve this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then visit <http://127.0.0.1:8000>. Python is only an optional static development server; it is not part of the application. All assets are included locally, so no internet connection is needed.

## Features

- Line-based split and unified diffs, with line numbers and inline word highlights.
- Local file selection and drag-and-drop, including extensionless text files.
- Swap, Clear, and Cmd/Ctrl + Enter to compare from either editor.
- Ignore whitespace, intentional empty and identical states, and automatic re-comparison when the whitespace option changes.
- Responsive layout, keyboard controls, accessible status announcements, and automatic system dark mode.

“Ignore whitespace” follows jsdiff: it ignores **leading and trailing whitespace on each line**, including final-newline differences. Internal whitespace and added blank lines remain meaningful. Windows CRLF and Unix LF line endings are treated equally. Four unchanged lines of context surround each change.

Files must be UTF-8 (with or without a BOM) or UTF-16 with a BOM. Binary or invalidly encoded files show an error without replacing the current text. There is a 10 MiB limit per file; comparisons are limited to 10,485,760 UTF-16 code units and 50,000 lines total. A three-second diff computation budget bounds unusually difficult comparisons. These safeguards keep the page usable; ordinary files of several thousand lines compare quickly. Very long changed lines skip inline word highlighting while still showing their full contents.

## Privacy

Files and text are processed in memory in your browser. The app does not upload, log, or persist them. There are no cookies, analytics, external fonts, CDN requests, browser storage, or service workers. Reloading clears the editors. Bundled scripts and styles are the only dependencies.

A restrictive Content Security Policy blocks network connections (`connect-src 'none'`) and form submissions. Uploaded HTML and code are displayed as escaped text, never executed. File names are inserted as plain text. Local file loading is not a network upload.

To verify, open browser developer tools → Network, let the page load, clear the request list, and perform a comparison or load a file. These actions should produce no requests.

## GitHub Pages

1. Put `index.html`, `style.css`, `app.js`, `favicon.svg`, and the complete `vendor/` directory in the published directory. Include the vendor license files.
2. In the repository's **Settings → Pages**, choose the publishing branch and folder, or use your existing Pages workflow.
3. For an existing website, put those files in its `diff/` directory. For a standalone project repository, publish from the repository root.

Every asset uses a relative path, so the same files work at `/`, `/diff/`, or `/diff-tool/`. No build command or backend is needed. This repository includes `.nojekyll` for static publishing. See [DEPLOYMENT.md](./DEPLOYMENT.md) for this website's configuration and update instructions.

## Dependencies

Pinned browser bundles are checked into `vendor/`:

| Library | Version | License | Purpose |
| --- | --- | --- | --- |
| [jsdiff](https://github.com/kpdecker/jsdiff) | 9.0.0 | BSD-3-Clause | Async line diffs and patch generation |
| [Diff2Html](https://github.com/rtfpessoa/diff2html) | 3.4.56 | MIT | Escaped diff rendering and word highlights |

The Diff2Html bundle includes jsdiff and Hogan template-runtime code under their respective licenses; notices are in `vendor/`. No syntax-highlighting bundle is included.

## Verification

Run the dependency integration regression tests with Node 20 or newer:

```sh
node --test tests/diff.test.cjs
```

Tests cover Markdown, Python, JSON, additions/deletions, identical content, whitespace, final newlines, Windows line endings, Unicode, HTML escaping, long lines, and 5,000-line files. They exercise the bundled libraries; browser checks cover the actual controls and layout.

For manual browser QA, check both views; use a local file and drag-and-drop; swap and clear; compare with Cmd/Ctrl + Enter; resize to mobile width; inspect both system color schemes; reload to confirm cleared inputs; and check Network for requests during comparison. Test very long code lines by horizontally scrolling within the diff.

## Files

`index.html` contains the semantic interface, `style.css` owns both themes and responsive layout, and `app.js` handles browser-only state, local file reading, and comparison. No package manager or bundler is needed to maintain the app.
