import { beforeEach, describe, expect, it } from 'vitest';
import { attachMenuHighlight } from '../../src/platform/menu';

function createMenu(itemClassName = ''): {
  menu: HTMLElement;
  item: HTMLElement;
  cleanup: () => void;
} {
  document.body.innerHTML = '';
  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  const item = document.createElement('div');
  item.setAttribute('role', 'menuitem');
  item.className = itemClassName;
  menu.append(item);
  document.body.append(menu);
  return { menu, item, cleanup: () => undefined };
}

describe('menu highlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the legacy inline hover background and restores it on leave', () => {
    const { menu, item } = createMenu('css-g5y9jx');
    const cleanup = attachMenuHighlight(item, menu);

    item.dispatchEvent(new Event('pointerenter'));
    item.classList.add('r-1panhkp');
    expect(item.style.backgroundColor).toBe('rgba(0, 0, 0, 0.03)');

    item.dispatchEvent(new Event('pointerleave'));
    expect(item.style.backgroundColor).toBe('');
    expect(item.classList.contains('r-1panhkp')).toBe(false);

    cleanup();
  });

  it('keeps the legacy highlight while the item is focused', () => {
    const { menu, item } = createMenu('css-g5y9jx');
    const cleanup = attachMenuHighlight(item, menu);

    item.dispatchEvent(new FocusEvent('focus'));
    expect(item.style.backgroundColor).toBe('rgba(0, 0, 0, 0.03)');

    item.dispatchEvent(new FocusEvent('blur'));
    expect(item.style.backgroundColor).toBe('');

    cleanup();
  });

  it('toggles data-highlighted for Base UI menus', () => {
    const { menu, item } = createMenu('data-highlighted:hover:bg-[var(--x-hover-subtle)]');
    menu.setAttribute('data-base-ui-focusable', '');
    const cleanup = attachMenuHighlight(item, menu);

    item.dispatchEvent(new Event('pointerenter'));
    expect(item.hasAttribute('data-highlighted')).toBe(true);

    item.dispatchEvent(new Event('pointerleave'));
    expect(item.hasAttribute('data-highlighted')).toBe(false);

    cleanup();
  });

  it('removes listeners and state on cleanup', () => {
    const { menu, item } = createMenu('css-g5y9jx');
    const cleanup = attachMenuHighlight(item, menu);

    item.dispatchEvent(new Event('pointerenter'));
    cleanup();
    expect(item.style.backgroundColor).toBe('');

    item.dispatchEvent(new Event('pointerenter'));
    expect(item.style.backgroundColor).toBe('');
  });
});
