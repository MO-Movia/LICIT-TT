import {
  isCollapsed,
  isIntersected,
  fromXY,
  fromHTMlElement,
  Rect,
} from './rects';

describe('isCollapsed', () => {
  it('should return true if rect has zero width', () => {
    const rect: Rect = {x: 0, y: 0, w: 0, h: 10};
    expect(isCollapsed(rect)).toBe(true);
  });

  it('should return true if rect has zero height', () => {
    const rect: Rect = {x: 0, y: 0, w: 10, h: 0};
    expect(isCollapsed(rect)).toBe(true);
  });

  it('should return false if rect has non-zero width and height', () => {
    const rect: Rect = {x: 0, y: 0, w: 10, h: 10};
    expect(isCollapsed(rect)).toBe(false);
  });
});

describe('fromHTMLElement', () => {
  it('should create a Rect object from an HTMLElement', () => {
    const el = document.createElement('div');
    el.style.width = '100px';
    el.style.height = '50px';
    el.style.left = '10px';
    el.style.top = '20px';

    const expectedRect: Rect = {x: 0, y: 0, w: 0, h: 0};
    expect(fromHTMlElement(el)).toEqual(expectedRect);
  });

  it('should handle "contents" display and use the first child element', () => {
    const parent = document.createElement('div');
    parent.style.display = 'contents';

    const child = document.createElement('div');
    child.style.width = '50px';
    child.style.height = '30px';
    child.style.left = '5px';
    child.style.top = '10px';

    parent.appendChild(child);

    const expectedRect: Rect = {x: 0, y: 0, w: 0, h: 0};
    expect(fromHTMlElement(parent)).toEqual(expectedRect);
  });

  describe('isIntersected', () => {
    it('should return true if r1 and r2 intersect', () => {
      const r1: Rect = {x: 0, y: 0, w: 10, h: 10};
      const r2: Rect = {x: 5, y: 5, w: 10, h: 10};
      expect(isIntersected(r1, r2)).toBe(true);
    });

    it('should return false if r1 and r2 do not intersect', () => {
      const r1: Rect = {x: 0, y: 0, w: 10, h: 10};
      const r2: Rect = {x: 20, y: 20, w: 10, h: 10};
      expect(isIntersected(r1, r2)).toBe(false);
    });

    it('should consider padding when provided', () => {
      const r1: Rect = {x: 0, y: 0, w: 10, h: 10};
      const r2: Rect = {x: 5, y: 5, w: 10, h: 10};
      const padding = 5;
      expect(isIntersected(r1, r2, padding)).toBe(true);
    });
  });

  describe('fromXY', () => {
    it('should create a Rect object from x and y coordinates', () => {
      const x = 10;
      const y = 20;
      const padding = 5;
      const expectedRect: Rect = {x: 5, y: 15, w: 10, h: 10};
      expect(fromXY(x, y, padding)).toEqual(expectedRect);
    });

    it('should use a default padding of 0 if not provided', () => {
      const x = 10;
      const y = 20;
      const expectedRect: Rect = {x: 10, y: 20, w: 0, h: 0};
      expect(fromXY(x, y)).toEqual(expectedRect);
    });
  });
});
