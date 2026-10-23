# Follow-ups after v0.1.1

Status: **resolved in v0.1.2**. This file is retained as the investigation and
regression-test record for the four reported issues.
Project version: `0.1.2`.
Suggested next version: `0.1.3` (patch).

## Resolved in v0.1.2

- Added native Hover/focus feedback for legacy and Base UI menus.
- Matched the camera icon size and text alignment to native menu items.
- Added state-specific toast icons, including a distinct partial-success state.
- Excluded the detail-page reply-sort/quotes row and restored it after capture.

Last investigation: 2026-10-23. The two X menu variants were checked against
different sessions:

- the logged-in Edge Profile (`x.com/home`, Simplified Chinese, light theme)
  currently uses the legacy DOM with `data-testid="caret"` and
  `div[data-testid="Dropdown"]`;
- the public logged-out Playwright Chromium uses the newer ARIA/Base UI menu.

Both variants must remain supported. The logged-in Edge check is the relevant
one for the reported hover and detail-page issues.

## 1. Injected menu item has no native hover/focus highlight

### Observed

The injected **保存帖子截图** item is visible and clickable, but moving the mouse over it does not produce the native X menu item hover background.

### Confirmed root cause: two different mechanisms

#### Legacy menu in the logged-in Edge Profile

The native item receives a generated class only while it is hovered. In the
observed build it was:

```css
.r-1panhkp {
  background-color: rgba(0, 0, 0, 0.03);
}
```

The item also has shared transition classes for `background-color` and
`box-shadow`. The cloned item has the base classes but never receives the
hover-only class, so it stays transparent.

The page does define `--x-hover-subtle`, but in this legacy menu it resolves to
`rgba(0, 0, 0, 0.04)`, while the native hovered item uses
`rgba(0, 0, 0, 0.03)`. The variable therefore cannot simply be reused as the
legacy hover color.

A programmatically focused native item had `outline-style: none` and no
background. Keyboard navigation likely applies a highlight through component
state rather than `:focus-visible`; this still needs a real keyboard test.

#### Newer ARIA/Base UI menu

The native item's class is equivalent to:

```text
data-highlighted:hover:bg-[var(--x-hover-subtle)]
focus-visible:bg-[var(--x-hover-subtle)]
```

Base UI adds `data-highlighted` only to menu items it owns. The cloned item
keeps the class string but never receives that state. In a temporary clone on
the live public site, adding `data-highlighted` while hovering reproduced the
native background `rgba(0, 0, 0, 0.04)`.

### Candidate direction

Implement one item-scoped highlight helper and call it from
`pointerenter` / `pointerleave` / `focus` / `blur` on the current cloned item:

- detect the newer variant from its `data-highlighted` class token or Base UI
  menu attributes, and then toggle `data-highlighted`;
- for the legacy variant, set and clear an inline `backgroundColor` using the
  legacy theme colors (`rgba(0, 0, 0, 0.03)` in light and the corresponding
  white-alpha color in dark themes), preserving any original inline value;
- keep the item's own transition class so the legacy transition remains;
- remove transient state copied from the template (`data-highlighted`,
  `data-popup-open`, stale `aria-expanded` / `aria-controls` as applicable);
- attach the handlers again when `reinject()` replaces the item.

Do not add a global stylesheet or modify neighboring native items. Verify the
dark-theme legacy color on a real page before hard-coding it; if a stable X
theme token is available, prefer that.

### Remaining investigation

- Test the legacy item's keyboard highlight by navigating the menu with the
  keyboard, not by calling `focus()`.
- Check light, dim and lights-out themes.

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

The user does not want this row in the screenshot. The author, text, media,
date/view count, and engagement action bar should remain.

### Confirmed structure in the logged-in Edge Profile

The row is inside the captured post `<article>`. For a post with quotes, the
quote link has this DOM ancestry:

```text
article
└─ ... (post body)
   └─ div (engagement bar + footer container)
      └─ div (row)
         ├─ div > div > button[aria-haspopup="menu"]  ← reply sort: 相关 ↓
         └─ div > a[href$="/quotes"]                  ← 查看引用 →
```

The row is the quote link's **grandparent**, not its direct parent. In the
observed DOM it had:

- text `相关\n查看引用`;
- width 566 px and height 16.5 px;
- two direct children: a sort-control wrapper and a quote-link wrapper.

Temporarily setting `display: none !important` on that row reduced the target
article height from `829.46875` to `800.96875` px (`28.5` px including layout
spacing). The engagement counts remained present, and restoring the inline
style returned the article to its original height.

On a reply detail page without a quotes link, no `相关` row, quote link, or
unlabeled menu trigger was rendered. The legacy UI therefore appears to omit
this row when there is nothing to disclose; still confirm the no-quotes case
across variants before finalizing a fallback.

### Candidate direction

- Prefer the quote link over visible text: find an anchor within the target
  `<article>` whose path matches the target status's `/quotes` or
  `_engagements/quotes` route.
- Collect the quote link's wrapper chain, not just `link.parentElement`. The
  legacy DOM needs the grandparent; the newer DOM may use a different number
  of wrappers.
- Select the nearest ancestor that contains both the quote link and the reply
  sort trigger, but not the engagement action bar. Do not use the bare word
  `相关` as the selector.
- Hide the whole row before measuring, using the existing restore transaction
  with `display: none !important`, and restore the original inline style in
  `finally`.
- If a variant renders the sort row without a quotes link, add a guarded
  fallback based on that variant's structural evidence rather than guessing
  from localized text.

Do not hide the engagement action bar or any media.

### Acceptance

- The reply-sort/quotes row is absent from detail-page screenshots.
- Author, text, media, date/view count, and engagement bar remain.
- Feed captures are unchanged.
- DOM and layout are restored after success or failure.
- Verified in all three UI languages and both themes.

## Suggested fix order for v0.1.2

1. Menu hover/focus state (small, isolated change).
2. Toast `partial` kind and inline icons (isolated UI change).
3. Detail-page row exclusion (touches the capture transaction; use the
   logged-in legacy DOM as the primary acceptance target and preserve the
   newer variant).

Add regression coverage for each item, then run `pnpm check` before the release
commit and version bump.

## Already resolved / not code bugs

- **Global blinking edit cursor on every click:** confirmed as Edge Caret Browsing (`settings.a11y.caretbrowsing.enabled = true`), toggled with `F7` or `edge://settings/accessibility`. It is not caused by this userscript.
- **Download stuck at 0 KB:** fixed in `0.1.1`; download now uses Blob URL + native `<a download>` first, with `GM_download` only as fallback.
- **Transparent toast background:** fixed in `0.1.1`; toast now uses an opaque elevated background and also styles the non-ShadowRoot fallback.
- **Clicking the screenshot item left the native menu open:** fixed in `0.1.1` with a best-effort Escape event.
