import { beforeEach, describe, expect, it } from 'vitest';
import { findStatusQuoteRow } from '../../src/platform/capture';

function setArticle(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.querySelector<HTMLElement>('article')!;
}

describe('detail footer detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds the reply-sort row around the target status quotes link', () => {
    const article = setArticle(`
      <article>
        <a href="/alice/status/123">time</a>
        <div data-engagement-action="like">engagement</div>
        <div id="quote-row">
          <div><button aria-haspopup="menu">Relevant</button></div>
          <div><a href="/alice/status/123/quotes">View quotes</a></div>
        </div>
      </article>
    `);
    const row = document.querySelector<HTMLElement>('#quote-row');
    expect(findStatusQuoteRow(article, '123')).toBe(row);
  });

  it('accepts the engagement quotes route', () => {
    const article = setArticle(`
      <article>
        <a href="/alice/status/456">time</a>
        <div id="quote-row">
          <div><button aria-haspopup="menu">Relevant</button></div>
          <div><a href="/alice/status/456/_engagements/quotes">View quotes</a></div>
        </div>
      </article>
    `);
    expect(findStatusQuoteRow(article, '456')).toBe(
      document.querySelector<HTMLElement>('#quote-row'),
    );
  });

  it('ignores quote links from nested posts', () => {
    const article = setArticle(`
      <article>
        <a href="/alice/status/123">time</a>
        <article>
          <a href="/bob/status/999/quotes">quoted post quotes</a>
        </article>
      </article>
    `);
    expect(findStatusQuoteRow(article, '999')).toBeNull();
  });

  it('does not hide a quote row that belongs to another status', () => {
    const article = setArticle(`
      <article>
        <a href="/alice/status/123">time</a>
        <div id="wrong-status">
          <button aria-haspopup="menu">Relevant</button>
          <a href="/alice/status/999/quotes">View quotes</a>
        </div>
      </article>
    `);
    expect(findStatusQuoteRow(article, '123')).toBeNull();
  });

  it('does not ascend past the engagement action container', () => {
    const article = setArticle(`
      <article>
        <a href="/alice/status/123">time</a>
        <div data-engagement-action="like">
          <div id="quote-row">
            <a href="/alice/status/123/quotes">View quotes</a>
          </div>
        </div>
      </article>
    `);
    expect(findStatusQuoteRow(article, '123')).toBeNull();
  });
});
