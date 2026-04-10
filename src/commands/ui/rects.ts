/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export type Rect = {
  h: number;
  w: number;
  x: number;
  y: number;
};

export function isCollapsed(rect: Rect): boolean {
  return rect.w === 0 || rect.h === 0;
}

export function isIntersected(r1: Rect, r2: Rect, padding: number = 0): boolean {
  
  return !(
    r2.x - padding > r1.x + r1.w + padding ||
    r2.x + r2.w + padding < r1.x - padding ||
    r2.y - padding > r1.y + r1.h + padding ||
    r2.y + r2.h + padding < r1.y - padding
  );
}

export function fromXY(x: number, y: number, padding: number = 0): Rect {
  return {
    x: x - padding,
    y: y - padding,
    w: padding * 2,
    h: padding * 2,
  };
}

export function fromHTMlElement(el: HTMLElement): Rect {
  const display = document.defaultView.getComputedStyle(el).display;
  if (display === 'contents' && el.children.length === 1) {
    // el has no layout at all, use its children instead.
    return fromHTMlElement(el.children[0] as HTMLElement);
  }
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    w: rect.width,
    h: rect.height,
  };
}
