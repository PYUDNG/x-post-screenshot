# Changelog

All notable changes to this project are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-10-23

### Fixed

- Download screenshots through a Blob URL and native anchor download, with GM_download as a fallback. This fixes pending 0 KB downloads in some userscript manager/browser combinations.
- Use an opaque, elevated toast background in dark, light and non-ShadowRoot fallback modes.
- Close the X menu after activating the screenshot item.

## [0.1.0] - 2026-10-23

### Added

- Initial userscript release.
- Native X post-menu integration for the home timeline and post detail pages.
- PNG capture of the current post card with carousel-position preservation.
- Current video/GIF frame capture with poster fallback.
- Build-time injection of a GM-backed resource fetcher into `html-to-image`.
- English, Simplified Chinese and Traditional Chinese UI.
- Closed Shadow DOM status toast with theme-aware styling.
- Bounded, privacy-conscious diagnostics with export and clear commands.
- GitHub and Greasyfork build variants with automated verification and CI release workflows.
