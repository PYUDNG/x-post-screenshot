import { describe, expect, it } from 'vitest';
import { detectLocale, normalizeLocale, translate } from '../../src/i18n';

describe('locale detection', () => {
  it('maps Simplified and Traditional Chinese variants', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh-CN');
    expect(normalizeLocale('zh-Hans')).toBe('zh-CN');
    expect(normalizeLocale('zh-TW')).toBe('zh-TW');
    expect(normalizeLocale('zh-HK')).toBe('zh-TW');
    expect(normalizeLocale('en-US')).toBe('en');
  });

  it('uses navigator languages when the page language is only zh', () => {
    expect(detectLocale('zh', ['zh-TW', 'en-US'])).toBe('zh-TW');
    expect(detectLocale('zh', ['zh-CN', 'en-US'])).toBe('zh-CN');
  });

  it('falls back to English', () => {
    expect(detectLocale('fr', ['fr-FR', 'de-DE'])).toBe('en');
    expect(detectLocale(undefined, [])).toBe('en');
  });

  it('provides all three UI translations', () => {
    expect(translate('en', 'menuSavePost')).toBe('Save post as image');
    expect(translate('zh-CN', 'menuSavePost')).toBe('保存帖子截图');
    expect(translate('zh-TW', 'menuSavePost')).toBe('儲存貼文截圖');
  });
});
