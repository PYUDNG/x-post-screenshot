import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCaptureTarget,
  extractStatusId,
  findPostTrigger,
  makeScreenshotFilename,
  sanitizeFilenamePart,
} from '../../src/platform/menu';

function setArticle(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.querySelector<HTMLElement>('article')!;
}

describe('post menu resolution', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('recognises the logged-in caret trigger and extracts a status target', () => {
    const article = setArticle(`
      <article>
        <a href="/alice/status/123456">time</a>
        <button data-testid="caret" aria-label="更多">
          <svg><path d="M0 0"></path></svg>
        </button>
      </article>
    `);
    const trigger = article.querySelector<HTMLElement>('[data-testid="caret"]')!;
    expect(findPostTrigger(trigger)).toBe(trigger);
    expect(extractStatusId(article)).toBe('123456');
    const target = buildCaptureTarget(trigger);
    expect(target?.handle).toBe('alice');
    expect(target?.statusId).toBe('123456');
  });

  it('recognises the new icon-more trigger and rejects the retweet trigger', () => {
    const article = setArticle(`
      <article>
        <a href="/bob/status/9988">time</a>
        <button aria-haspopup="menu"><svg><use href="#icon-more"></use></svg></button>
        <button data-testid="retweet" aria-haspopup="menu">retweet</button>
      </article>
    `);
    const more = article.querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
    const retweet = article.querySelector<HTMLElement>('[data-testid="retweet"]')!;
    expect(findPostTrigger(more)).toBe(more);
    expect(findPostTrigger(retweet)).toBeNull();
  });

  it('ignores status links from nested quote articles when selecting IDs', () => {
    const article = setArticle(`
      <article>
        <a href="/outer/status/111">outer</a>
        <article><a href="/quoted/status/222">quoted</a></article>
      </article>
    `);
    expect(extractStatusId(article)).toBe('111');
  });

  it('sanitizes filename components and generates a stable name', () => {
    expect(sanitizeFilenamePart(' @Alice / test ')).toBe('Alice-test');
    expect(makeScreenshotFilename('alice', '123')).toBe('x-post-screenshot-alice-123.png');
  });
});
