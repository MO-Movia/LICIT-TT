/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {getAttrs, LAYOUT} from './docNodeSpec';

function makeEl(width?: string, maxWidth?: string, padding?: string): HTMLElement {
  const el = document.createElement('div');
  if (width !== undefined) {
    el.style.width = width;
  }
  if (maxWidth !== undefined) {
    el.style.maxWidth = maxWidth;
  }
  if (padding !== undefined) {
    el.style.padding = padding;
  }
  return el;
}

describe('docNodeSpec getAttrs', () => {
  it('detects US letter landscape', () => {
    const el = makeEl('792pt', undefined, '0pt'); // 11in * 72pt
    const attrs = getAttrs(el);
    expect(attrs).toEqual({
      layout: LAYOUT.US_LETTER_LANDSCAPE,
      width: null,
      padding: null,
    });
  });

  it('detects US letter portrait using maxWidth', () => {
    const el = makeEl('', '612pt', '0pt'); // 8.5in * 72pt
    const attrs = getAttrs(el);
    expect(attrs).toEqual({
      layout: LAYOUT.US_LETTER_PORTRAIT,
      width: null,
      padding: null,
    });
  });

  it('detects A4 landscape', () => {
    const el = makeEl('842pt', undefined, '0pt'); // ~29.7cm
    const attrs = getAttrs(el);
    expect(attrs).toEqual({
      layout: LAYOUT.A4_LANDSCAPE,
      width: null,
      padding: null,
    });
  });

  it('detects A4 portrait', () => {
    const el = makeEl('595pt', undefined, '0pt'); // ~21cm
    const attrs = getAttrs(el);
    expect(attrs).toEqual({
      layout: LAYOUT.A4_PORTRAIT,
      width: null,
      padding: null,
    });
  });

  it('returns width and padding when no layout matches', () => {
    const el = makeEl('500pt', undefined, '12pt');
    const attrs = getAttrs(el) as {layout: string | null; width: number; padding: number};
    expect(attrs.layout).toBeNull();
    expect(attrs.width).toBeCloseTo(524, 5); // 500 + (12 * 2)
    expect(attrs.padding).toBeCloseTo(12, 5);
  });

  it('returns null layout when no width is provided', () => {
    const el = makeEl(undefined, undefined, undefined);
    const attrs = getAttrs(el);
    expect(attrs).toEqual({
      layout: null,
      width: null,
      padding: null,
    });
  });

  it('returns null layout when width is invalid', () => {
    const el = makeEl('auto', undefined, '0pt');
    const attrs = getAttrs(el);
    expect(attrs).toEqual({
      layout: null,
      width: null,
      padding: null,
    });
  });
});
