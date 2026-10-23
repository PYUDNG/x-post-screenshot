# Follow-ups after v0.1.1

Status: **open, intentionally not implemented yet**.
Project version: `0.1.1`.
Suggested next version: `0.1.2` (patch).
Last investigation: 2026-10-23 against the public X DOM and the currently served X
front-end bundle. The logged-in visual checks are still required before closing
these items.

## 1. Injected menu item has no native hover/focus highlight

### Observed

The injected **保存帖子截图** item is visible and clickable, but moving the mouse over it does not produce the native X menu item hover background. Keyboard focus highlighting should also be checked.

### Confirmed root cause

Current X menus use Base UI. A native item has a class equivalent to:

```text
data-highlighted:hover:bg-[var(--x-hover-subtle)]
focus-visible:bg-[var(--x-hover-subtle)]
```

Base UI adds `data-highlighted` only to menu items it owns. The cloned item keeps
the class string, but it is outside the React/Base UI tree and never receives
that state, so the selector cannot match. With a temporary clone on the live
site, adding `data-highlighted` while hovering reproduced the native background
(`rgba(0, 0, 0, 0.04)` in the light theme). The color comes from X's
`--x-hover-subtle` variable, so no hard-coded theme colors are needed.

### Candidate direction

Keep the item-scoped approach and reuse X's own classes:

- remove transient state copied from the template (`data-highlighted`,
  `data-popup-open`, stale `aria-expanded` / `aria-controls` as applicable);
- add `pointerenter` / `pointerleave` / `focus` / `blur` handlers to the cloned
  item that set and clear `data-highlighted`;
- rely on the cloned class for the background, transition and
  `focus-visible` behavior; do not add a global stylesheet;
- only add a tiny inline fallback for a legacy menu variant if that variant
  lacks equivalent hover/focus rules.

The handlers must be attached again when `reinject()` replaces the item, and
must not change attributes on native neighboring items.

### Remaining investigation

- Verify the old logged-in DOM variant (`[data-testid="caret"]` /
  `div[data-testid="Dropdown"]`) still applies its hover styling through CSS.
- Check keyboard focus in light, dim and lights-out themes.

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

- Add a distinct `partial` toast kind. `main.ts` currently calls
  `showToast('success', toastSavedPartial)`, so adding a warning icon without
  changing this call site would still show the success icon.
- Keep the icon `aria-hidden="true"`; the existing `role="status"` / `role="alert"` text remains the accessible label.
- Add the same icons to the non-ShadowRoot fallback path.
- The fallback currently writes `textContent` to the whole toast when no
  `.text` element exists. Refactor both paths to always contain separate icon
  and text slots before adding SVGs, otherwise the fallback will erase the
  icon.
- Use theme-aware foreground/accent colors and preserve reduced-motion behavior.
- Keep diagnostic-command toasts on their existing success/error kinds.

### Acceptance

- Icon always corresponds to the current state.
- Icon is visible on light and dark themes.
- Screen-reader text is unchanged.
- No external icon/font/network dependency.

## 3. Exclude the detail-page reply-sort/quotes row from the capture

### Observed

On a post detail page, the captured PNG includes the last row:

```text
相关 ↓                         查看引用 →
```

The user does not want this row in the screenshot. The author, text, media, date/view count, and engagement action bar should remain.

### Corrected identification

The row is not a "related posts" footer. The left side is the **reply sort
dropdown**, currently showing the localized "Relevant" mode (`相关` in
Simplified Chinese), and the right side is **View quotes** / **View activity**.
X's current `focal-tweet-results` bundle renders it as a row with classes
equivalent to:

```text
mt-2 flex items-center justify-between gap-4
```

The right link is `${tweetHref}/quotes` and its label is `View quotes`, or
`View activity` when the viewer is the post author. The left control's
accessible label is localized, for example `排序回复：相关`.

### Candidate direction

- Prefer the quote link over visible text: find an anchor within the target
  `<article>` whose path ends with `/status/<id>/quotes` (also accept the
  `_engagements/quotes` route), and use its parent element as the row.
- Guard the match so a quote link belonging to a nested quoted post cannot hide
  the outer post's content.
- For a post with no quotes link, fall back to the localized sort-trigger
  label or the row's structural position. Do not match the bare word `相关`:
  it is the current sort mode and is not a stable label.
- Hide the whole row before measuring the article, not only the quotes anchor.
  Use the existing restore transaction with `display: none !important`, and
  restore the original inline style in `finally`.

Do not hide the engagement action bar or any media.

### Remaining investigation

- Confirm on a logged-in detail page whether the row is a descendant of the
  same `<article>` that is captured. The public logged-out DOM does not render
  this row, so this ancestor check is important.
- Check a post with quotes, a post without quotes, and a post whose sort mode
  is not `Relevant`.

### Acceptance

- The reply-sort/quotes row is absent from detail-page screenshots.
- Author, text, media, date/view count, and engagement bar remain.
- Feed captures are unchanged.
- DOM and layout are restored after success or failure.
- Verified in all three UI languages and both themes.

## Suggested fix order for v0.1.2

1. Menu hover/focus state (small, isolated change).
2. Toast `partial` kind and inline icons (isolated UI change).
3. Detail-page row exclusion (touches the capture transaction; verify the
   logged-in ancestor structure first).

Add regression coverage for each item, then run `pnpm check` before the release
commit and version bump.

## Already resolved / not code bugs

- **Global blinking edit cursor on every click:** confirmed as Edge Caret Browsing (`settings.a11y.caretbrowsing.enabled = true`), toggled with `F7` or `edge://settings/accessibility`. It is not caused by this userscript.
- **Download stuck at 0 KB:** fixed in `0.1.1`; download now uses Blob URL + native `<a download>` first, with `GM_download` only as fallback.
- **Transparent toast background:** fixed in `0.1.1`; toast now uses an opaque elevated background and also styles the non-ShadowRoot fallback.
- **Clicking the screenshot item left the native menu open:** fixed in `0.1.1` with a best-effort Escape event.
