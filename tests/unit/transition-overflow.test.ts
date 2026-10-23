import { beforeEach, describe, expect, it } from 'vitest';
import { exposeTransitionTextOverflow } from '../../src/platform/capture';

function setArticle(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.querySelector<HTMLElement>('article')!;
}

describe('animated text overflow', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes clipped CJK transition text and restores every original overflow value', () => {
    const article = setArticle(`
      <article>
        <div id="cjk-parent" style="overflow: hidden; width: 36px">
          <span data-testid="app-text-transition-container" style="overflow: hidden; white-space: pre-wrap">8.8万</span>
        </div>
      </article>
    `);
    const parent = document.querySelector<HTMLElement>('#cjk-parent')!;
    const transition = parent.firstElementChild as HTMLElement;
    const restore: Array<() => void> = [];

    expect(exposeTransitionTextOverflow(article, restore)).toBe(2);
    expect(parent.style.getPropertyValue('overflow')).toBe('visible');
    expect(parent.style.getPropertyPriority('overflow')).toBe('important');
    expect(transition.style.getPropertyValue('overflow')).toBe('visible');
    expect(transition.style.getPropertyPriority('overflow')).toBe('important');
    expect(transition.style.getPropertyValue('white-space')).toBe('nowrap');
    expect(transition.style.getPropertyPriority('white-space')).toBe('important');

    for (const undo of restore.reverse()) {
      undo();
    }
    expect(parent.style.getPropertyValue('overflow')).toBe('hidden');
    expect(transition.style.getPropertyValue('overflow')).toBe('hidden');
    expect(transition.style.getPropertyValue('white-space')).toBe('pre-wrap');
  });

  it('does not change Latin-only transitions', () => {
    const article = setArticle(`
      <article>
        <div id="latin-parent" style="overflow: hidden; width: 36px">
          <span data-testid="app-text-transition-container">1,234</span>
        </div>
      </article>
    `);
    const parent = document.querySelector<HTMLElement>('#latin-parent')!;
    const restore: Array<() => void> = [];

    expect(exposeTransitionTextOverflow(article, restore)).toBe(0);
    expect(restore).toHaveLength(0);
    expect(parent.style.getPropertyValue('overflow')).toBe('hidden');
  });
});
