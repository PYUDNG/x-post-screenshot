# Changelog

All notable changes to this project are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [0.1.3] - 2026-10-23

### Fixed

- Put the userscript metadata block at the absolute start of both builds so Greasyfork accepts the submitted file. The license banner now follows the metadata block.

## [0.1.2] - 2026-10-23

### Added

- Show a state-specific inline icon for progress, success, partial success and error toast messages.

### Fixed

- Match native X menu-item hover and keyboard-focus feedback in both the legacy and Base UI menu variants.
- Align the injected camera icon and label with native menu items.
- Exclude the reply-sort and quotes row from post-detail screenshots while preserving the engagement bar.

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
