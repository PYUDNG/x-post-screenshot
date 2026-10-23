# X Post Screenshot

<img src="assets/icon.svg" width="96" height="96" alt="X Post Screenshot icon" />

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

A userscript for saving an X post as a PNG image. It adds **Save post as image** to the native post **More** menu and keeps the result close to what is currently visible on screen.

> **AI-generated code:** The code in this project was generated entirely by AI.

## Features

- Adds one native-looking item to the post menu on the X home timeline and post detail page.
- Captures the current post card: author, text, quoted post, media and engagement bar.
- Preserves the current carousel position.
- Captures the current frame of videos and GIFs; falls back to the poster when a frame is unavailable.
- Renders images, backgrounds, masks and fonts through `html-to-image`.
- Uses a GM-backed network adapter so `html-to-image` can fetch X media without depending on page CORS behavior.
- Supports light, dim and lights-out themes.
- UI and messages in English, Simplified Chinese and Traditional Chinese.
- No telemetry, analytics, remote code or external runtime services.

## Install

### GitHub release

Install the build attached to the latest GitHub release:

<https://github.com/PYUDNG/x-post-screenshot/releases/latest/download/x-post-screenshot.user.js>

### Greasyfork

After the Greasyfork listing is published, install from the Greasyfork page for **X Post Screenshot**. The repository also contains a Greasyfork-compliant listing text at [README.greasyfork.md](README.greasyfork.md).

## Usage

1. Open X and find a post.
2. Open the post's **More** menu.
3. Choose **Save post as image**.
4. The PNG is saved through the userscript manager. A short progress, success or failure message appears at the bottom of the page.

Only the post card is captured. The page header, sidebars and the open menu are not included.

## Compatibility

- Chrome, Edge, Firefox and Safari at their latest stable versions.
- Tampermonkey, Violentmonkey and ScriptCat.
- Official web hosts only: `x.com`, `www.x.com`, `mobile.x.com`, `twitter.com`, `www.twitter.com` and `mobile.twitter.com`.
- The script runs at `document-start`, does not run in frames and does not request GM privileges beyond what is listed below.

## Permissions and network

The userscript uses:

- `GM_xmlhttpRequest` only for resources under `*.twimg.com` and `*.pscp.tv`.
- `GM_getValue` / `GM_setValue` for the diagnostic log and diagnostic toggle. It does not use `localStorage`, `sessionStorage` or page IndexedDB.
- `GM_registerMenuCommand` for diagnostic controls.
- `GM_setClipboard` as a fallback when exporting diagnostics.
- `GM_download` for PNG and diagnostics file downloads.

No request is made to an arbitrary third-party host. Images in external link cards outside the X media CDN allowlist are replaced with a neutral placeholder. No credentials, cookies or post contents are uploaded anywhere.

## Diagnostics

Production builds do not print diagnostics to the browser console. The script keeps a bounded diagnostic log in the userscript manager's private GM storage:

- at most 100 entries;
- at most 64 KiB;
- retained for 7 days;
- sanitized messages and stacks, without post text or full media URLs.

Open the userscript manager menu and use:

- **Toggle diagnostics** to enable verbose diagnostics and, when the manager exposes `unsafeWindow`, `__XPS_DEBUG__`;
- **Export diagnostics** to download a JSON report (or copy it to the clipboard if download is unavailable);
- **Clear diagnostics** to remove the stored log.

The report includes captured errors, timing, theme, locale, version, browser user agent and build target to help with issue reports.

## Development

Requirements: Node.js 22+ and pnpm.

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
pnpm build
```

`pnpm build` produces:

- `dist/x-post-screenshot.user.js` — minified GitHub release build with update URLs;
- `dist/x-post-screenshot.greasyfork.user.js` — non-minified Greasyfork build without GitHub update URLs;
- matching `.meta.js` files and `SHA256SUMS.txt`.

The build injects the userscript's GM-backed `fetch` and diagnostic console adapter into the two `html-to-image` resource-fetch call sites at build time. This keeps the library's own image/font/CSS inlining logic intact and avoids an iframe, runtime `eval` or page-global monkey-patching.

## Known limitations

- A post whose images live outside the X media CDN allowlist may show placeholder images.
- X can change its DOM at any time; selector fallbacks and a manual release check are required after major X UI changes.
- A video whose current frame cannot be read, for example because the browser taints the canvas, falls back to the poster.
- The script captures the current post card only; it does not stitch threads or export an entire conversation.

## License

MIT. The bundled `html-to-image` library is also MIT-licensed and retains its source/version notice in the generated userscript.
