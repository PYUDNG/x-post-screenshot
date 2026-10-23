import { nativeGetComputedStyle, nativeQuerySelectorAll } from './native';
import type { ThemeInfo } from '../types';

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseCssColor(value: string): ParsedColor | null {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match?.[1]) {
    return null;
  }
  const parts = match[1]
    .split(/[\s,/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const r = Number.parseFloat(parts[0] ?? '0');
  const g = Number.parseFloat(parts[1] ?? '0');
  const b = Number.parseFloat(parts[2] ?? '0');
  const alphaText = parts[3];
  const alpha = alphaText === undefined ? 1 : Number.parseFloat(alphaText);
  if (![r, g, b, alpha].every(Number.isFinite)) {
    return null;
  }
  return {
    r,
    g,
    b,
    a: alpha > 1 ? alpha / 100 : alpha,
  };
}

export function isDarkColor(color: string): boolean {
  const parsed = parseCssColor(color);
  if (!parsed) {
    return false;
  }
  const luminance = (0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b) / 255;
  return luminance < 0.45;
}

function hasVisibleBackground(color: string): boolean {
  const parsed = parseCssColor(color);
  return parsed ? parsed.a > 0.01 : color !== 'transparent';
}

export function getEffectiveBackground(element: Element | null): string {
  let current: Element | null = element;
  while (current) {
    const color = nativeGetComputedStyle(current).backgroundColor;
    if (color && hasVisibleBackground(color)) {
      return color;
    }
    current = current.parentElement;
  }
  const documentElement = document.documentElement;
  if (documentElement) {
    const color = nativeGetComputedStyle(documentElement).backgroundColor;
    if (color && hasVisibleBackground(color)) {
      return color;
    }
  }
  return document.documentElement?.style.colorScheme === 'dark' ? '#000000' : '#ffffff';
}

export function getPageTheme(): ThemeInfo {
  const body = document.body ?? document.documentElement;
  let background = getEffectiveBackground(body);
  if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') {
    background = document.documentElement?.style.colorScheme === 'dark' ? '#000000' : '#ffffff';
  }
  const foregroundStyle = body ? nativeGetComputedStyle(body).color : '';
  const foreground = foregroundStyle || (isDarkColor(background) ? '#e7e9ea' : '#0f1419');
  return {
    background,
    foreground,
    dark: isDarkColor(background),
  };
}

export function getCaptureBackground(article: HTMLElement): string {
  return getEffectiveBackground(article);
}

export function hasAnyAnchorOrMedia(article: HTMLElement): boolean {
  return nativeQuerySelectorAll(article, 'a, img, video').length > 0;
}
