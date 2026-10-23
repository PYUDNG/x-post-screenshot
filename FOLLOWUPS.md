# Follow-ups after v0.1.1

Status: **open, intentionally not implemented yet**.
Project version: `0.1.1`.
Suggested next version: `0.1.2` (patch).

## 1. Injected menu item has no native hover/focus highlight

### Observed

The injected **保存帖子截图** item is visible and clickable, but moving the mouse over it does not produce the native X menu item hover background. Keyboard focus highlighting should also be checked.

### Current implementation

The item is cloned from a native `div[role="menuitem"]` and inserted into the same parent, but it has no React/event state and may rely on hover styles that X applies through its own component state or generated atomic CSS.

### Investigation needed

Inspect both current menu variants:

- logged-in old DOM: `[data-testid="caret"]` trigger and `div[data-testid="Dropdown"]` menu;
- newer ARIA DOM: `role="menu"` with `aria-labelledby`.

Compare computed background, outline, transition, and class behavior between the injected item and a neighboring native item under:

- pointer hover;
- keyboard focus;
- light, dim, and lights-out themes.

### Candidate direction

Prefer an item-scoped solution rather than a global stylesheet:

- read the native item's hover/focus background from X CSS variables where available (`--x-hover-subtle` and similar);
- attach `pointerenter` / `pointerleave` / `focus` / `blur` handlers to set and clear the item's background and outline;
- if a small stylesheet is unavoidable, scope it only to the injected item and keep it temporary or uniquely scoped.

### Acceptance

- Hover background matches neighboring native menu items in all three themes.
- Keyboard focus remains visible.
- No global CSS leak and no change to native X menu items.

## 2. Content-aware toast icons

### Observed

The toast currently shows a spinner only in the Shadow DOM progress state. There is no distinct success or failure icon, and the non-ShadowRoot fallback has text only.

### Desired behavior

Select an icon based on the message state, using inline SVG (no external assets):

- generating/capturing: spinner;
- saved successfully: checkmark;
- saved partially: warning icon;
- failed download/capture: error icon.

### Implementation notes

- Extend the toast state from only `progress | success | error` if partial success needs a distinct icon.
- Keep the icon `aria-hidden="true"`; the existing `role="status"` / `role="alert"` text remains the accessible label.
- Add the same icons to the non-ShadowRoot fallback path.
- Use theme-aware foreground/accent colors and preserve reduced-motion behavior.

### Acceptance

- Icon always corresponds to the current state.
- Icon is visible on light and dark themes.
- Screen-reader text is unchanged.
- No external icon/font/network dependency.

## 3. Exclude detail-page related/quotes footer from the capture

### Observed

On a post detail page, the captured PNG includes the last row:

```text
相关 ↓                         查看引用 →
```

The user does not want this row in the screenshot. The author, text, media, date/view count, and engagement action bar should remain.

### Investigation needed

Inspect the detail-page DOM and determine whether this row is:

- a direct descendant of the post `<article>`;
- a wrapper/sibling that is included through the article's measured height; or
- a localized disclosure row identifiable through the related/quotes link.

Check localized variants such as `Related` / `View quotes` and their `href` patterns (`.../quotes`).

### Candidate direction

Identify only the related/quotes footer and temporarily hide it while measuring and rendering, restoring it in the existing `finally` transaction. Prefer a structural or link-based selector over a visible text selector, but keep text/href fallbacks for localization and X UI changes.

Do not hide the engagement action bar or any media.

### Acceptance

- The related/quotes footer is absent from detail-page screenshots.
- Author, text, media, date/view count, and engagement bar remain.
- Feed captures are unchanged.
- DOM and layout are restored after success or failure.
- Verified in all three UI languages and both themes.

## Already resolved / not code bugs

- **Global blinking edit cursor on every click:** confirmed as Edge Caret Browsing (`settings.a11y.caretbrowsing.enabled = true`), toggled with `F7` or `edge://settings/accessibility`. It is not caused by this userscript.
- **Download stuck at 0 KB:** fixed in `0.1.1`; download now uses Blob URL + native `<a download>` first, with `GM_download` only as fallback.
- **Transparent toast background:** fixed in `0.1.1`; toast now uses an opaque elevated background and also styles the non-ShadowRoot fallback.
- **Clicking the screenshot item left the native menu open:** fixed in `0.1.1` with a best-effort Escape event.
