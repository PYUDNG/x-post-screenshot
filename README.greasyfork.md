# X Post Screenshot

Install this script from the install button on this Greasyfork page.

Save an X post as a PNG image directly from the native post **More** menu. The capture follows the current post card, keeps the current carousel position, and uses the current video/GIF frame when available.

## Features

- Adds **Save post as image** to the X post menu.
- Captures the author, text, quoted post, media and engagement bar.
- Works on the home timeline and post detail pages.
- Supports light, dim and lights-out themes.
- Messages in English, Simplified Chinese and Traditional Chinese.
- No telemetry, analytics or remote code.

## Usage

1. Open a post on X.
2. Open the post's native **More** menu.
3. Select **Save post as image**.
4. A PNG is downloaded by your userscript manager. Progress and result messages appear at the bottom of the page.

Only the post card is captured. Page navigation, sidebars and the open menu are excluded.

## Permissions

This script uses:

- `GM_xmlhttpRequest` for X media and font resources under `*.twimg.com` and video-poster resources under `*.pscp.tv`;
- `GM_getValue` / `GM_setValue` for bounded diagnostic records and the diagnostic toggle;
- `GM_registerMenuCommand` for diagnostic controls;
- `GM_setClipboard` for diagnostic export fallback;
- `GM_download` for downloads.

It does not use `localStorage`, `sessionStorage` or page IndexedDB. It does not send data to third-party services. External link-card images outside the X media CDN allowlist may appear as placeholders.

## Diagnostic logs

Production builds do not print logs to the console. Up to 100 diagnostic entries (64 KiB, retained for 7 days) are stored in the userscript manager's private storage. Use the userscript manager menu to toggle diagnostics, export a JSON report with captured error information, or clear the log.

## Source and support

Source code and the issue tracker are available at:

<https://github.com/PYUDNG/x-post-screenshot>

This Greasyfork page is the installation source for this listing.

## Known limitations

- Images from external link cards outside the X media CDN allowlist may show placeholders.
- X DOM changes can require a script update.
- If a browser blocks reading a video frame, the poster image is used instead.

## License

MIT.
