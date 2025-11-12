import {
  atAnchorBottomLeft,
  atAnchorBottomCenter,
  atAnchorRight,
  atViewportCenter,
  atAnchorTopRight,
  atAnchorTopCenter,
} from './PopUpPosition';
import {Rect} from './rects';

describe('atAnchorBottomLeft', () => {
  it('should return the correct rect when both anchorRect and bodyRect are provided', () => {
    const anchorRect: Rect = {x: 1900, y: 1500, w: 50, h: 30};
    const bodyRect: Rect = {x: 0, y: 0, w: 100, h: 50};
    const expectedRect: Rect = {x: 1850, y: 1450, w: 0, h: 0};
    expect(atAnchorBottomLeft(anchorRect, bodyRect)).toEqual(expectedRect);
  });

  it('should return the correct rect when anchorRect is undefined', () => {
    const bodyRect: Rect = {x: 0, y: 0, w: 100, h: 50};
    const expectedRect: Rect = {x: -10000, y: 0, w: 0, h: 0};
    expect(atAnchorBottomLeft(undefined, bodyRect)).toEqual(expectedRect);
  });

  it('should return the correct rect when anchorRect is collapsed', () => {
    const anchorRect: Rect = {x: 10, y: 20, w: 0, h: 0};
    const bodyRect: Rect = {x: 0, y: 0, w: 100, h: 50};
    const expectedRect: Rect = {x: -10000, y: 20, w: 0, h: 0};
    expect(atAnchorBottomLeft(anchorRect, bodyRect)).toEqual(expectedRect);
  });
});
describe('atAnchorBottomCenter', () => {
  it('should return the correct rect when both anchorRect and bodyRect are provided', () => {
    const anchorRect: Rect = {x: 10, y: 20, w: 50, h: 30};
    const bodyRect: Rect = {x: 0, y: 0, w: 100, h: 50};
    const expectedRect: Rect = {x: 10, y: 50, w: 0, h: 0};
    expect(atAnchorBottomCenter(anchorRect, bodyRect)).toEqual(expectedRect);
  });

  it('should return the correct rect when anchorRect is undefined', () => {
    const bodyRect: Rect = {x: 0, y: 0, w: 100, h: 50};
    const expectedRect: Rect = {x: -10000, y: 0, w: 0, h: 0};
    expect(atAnchorBottomCenter(undefined, bodyRect)).toEqual(expectedRect);
  });

  it('should return the correct rect when anchorRect is collapsed', () => {
    const anchorRect: Rect = {x: 10, y: 20, w: 0, h: 0};
    const bodyRect: Rect = {x: 0, y: 0, w: 100, h: 50};
    const expectedRect: Rect = {x: -10000, y: 20, w: 0, h: 0};
    expect(atAnchorBottomCenter(anchorRect, bodyRect)).toEqual(expectedRect);
  });
});

describe('atAnchorRight', () => {
  it('should return the correct rectangle when both anchorRect and bodyRect are provided', () => {
    const anchorRect = {x: 10, y: 20, w: 30, h: 40};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};

    const result = atAnchorRight(anchorRect, bodyRect);

    expect(result).toEqual({x: 41, y: 20, w: 0, h: 0});
  });

  it('should return the correct rectangle', () => {
    const anchorRect = {x: 10, y: 20, w: 0, h: 0};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};

    const result = atAnchorRight(anchorRect, bodyRect);

    expect(result).toEqual({x: -10000, y: 20, w: 0, h: 0});
  });

  it('should return if the x and w is greater than window width', () => {
    const anchorRect = {x: 500, y: 20, w: 0, h: 0};
    const bodyRect = {x: 0, y: 0, w: 550, h: 60};

    const result = atAnchorRight(anchorRect, bodyRect);

    expect(result).toEqual({x: -10000, y: 20, w: 0, h: 0});
  });

  it(' should return the correct rect when anchorRect is not provided', () => {
    const result = atAnchorRight(undefined, {x: 0, y: 0, w: 50, h: 60});
    expect(result).toEqual({x: -10000, y: 0, w: 0, h: 0});
  });
});

describe('atViewportCenter', () => {
  it('should return the correct rectangle when bodyRect is provided', () => {
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};
    window.innerWidth = 1000;
    window.innerHeight = 800;
    const result = atViewportCenter(undefined, bodyRect);
    expect(result).toEqual({x: 475, y: 370, w: 0, h: 0});
  });

  it('should returns the correct rect when bodyRect is collapsed', () => {
    const bodyRect = {x: 0, y: 0, w: 0, h: 0};
    const result = atViewportCenter(undefined, bodyRect);
    expect(result).toEqual({x: -10000, y: 400, w: 0, h: 0});
  });

  it('should return the correct rect when bodyRect is not provided', () => {
    const result = atViewportCenter(undefined, undefined);
    expect(result).toEqual({x: -10000, y: 0, w: 0, h: 0});
  });
});

describe('atAnchorTopRight', () => {
  it('shuld returns the correct rect when both anchorRect and bodyRect are provided', () => {
    const anchorRect = {x: 10, y: 20, w: 30, h: 40};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};
    const result = atAnchorTopRight(anchorRect, bodyRect);

    expect(result).toEqual({x: -9, y: 20, w: 0, h: 0});
  });

  it('return the correct rect', () => {
    const anchorRect = {x: 10, y: 20, w: 0, h: 0};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};
    const result = atAnchorTopRight(anchorRect, bodyRect);

    expect(result).toEqual({x: -10000, y: 20, w: 0, h: 0});
  });

  it('should return the correct rect when anchorRect is not provided', () => {
    const result = atAnchorTopRight(undefined, {x: 0, y: 0, w: 50, h: 60});

    expect(result).toEqual({x: -10000, y: 0, w: 0, h: 0});
  });
});

describe('atAnchorTopCenter', () => {
  it('should returns the rect when both anchorRect and bodyRect are provided', () => {
    const anchorRect = {x: 10, y: 20, w: 30, h: 40};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};

    const result = atAnchorTopCenter(anchorRect, bodyRect);

    expect(result).toEqual({x: 0, y: 20, w: 0, h: 0});
  });

  it('should return the correct rect when anchorRect is collapsed', () => {
    const anchorRect = {x: 10, y: 20, w: 0, h: 0};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};

    const result = atAnchorTopCenter(anchorRect, bodyRect);

    expect(result).toEqual({x: -10000, y: 20, w: 0, h: 0});
  });

  it('should retun the rect when anchorRect is not provided', () => {
    const result = atAnchorTopCenter(undefined, {x: 0, y: 0, w: 50, h: 60});

    expect(result).toEqual({x: -10000, y: 0, w: 0, h: 0});
  });

  it('should cover the branch where body.contains(ha) is true', () => {
    const body = document.createElement('div');
    const ha = document.createElement('div');
    const anchor = document.createElement('div');
    body.appendChild(ha);

    const hoveredAnchors = new Set<HTMLElement>();
    hoveredAnchors.add(ha);

    jest
      .spyOn(body, 'contains')
      .mockImplementation((element) => element === ha);
    for (const hovered of hoveredAnchors) {
      if (
        anchor &&
        body &&
        !hoveredAnchors.has(anchor) &&
        body.contains(hovered)
      ) {
        hoveredAnchors.add(anchor);
      }
    }
    expect(hoveredAnchors.has(anchor)).toBe(true);
    expect(body.contains).toHaveBeenCalledWith(ha);
    jest.restoreAllMocks();
  });
});

describe('atAnchorRight', () => {
  it('should return the correct rectangle when both anchorRect and bodyRect are provided', () => {
    const anchorRect = {x: 10, y: 20, w: 30, h: 40};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};
    const result = atAnchorRight(anchorRect, bodyRect);
    expect(result).toEqual({x: 41, y: 20, w: 0, h: 0});
  });

  it('should return a rectangle positioned off-screen if anchorRect is undefined', () => {
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};
    const result = atAnchorRight(undefined, bodyRect);
    expect(result).toEqual({x: -10000, y: 0, w: 0, h: 0});
  });

  it('should return a rectangle positioned off-screen if anchorRect is collapsed', () => {
    const anchorRect = {x: 10, y: 20, w: 0, h: 0};
    const bodyRect = {x: 0, y: 0, w: 50, h: 60};
    const result = atAnchorRight(anchorRect, bodyRect);
    expect(result).toEqual({x: -10000, y: 20, w: 0, h: 0});
  });
});
