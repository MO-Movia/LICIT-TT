/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {
  POSITION_MODE_PARAGRAPH,
  toAbsoluteFromStored,
} from './CitationPosition';

describe('CitationPosition', () => {
  it('converts paragraph-relative citation positions to absolute positions', () => {
    expect(
      toAbsoluteFromStored({
        from: 4,
        to: 9,
        paragraphPos: 12,
        positionMode: POSITION_MODE_PARAGRAPH,
      })
    ).toEqual({ from: 16, to: 21 });
  });

  it('keeps legacy global citation positions unchanged', () => {
    expect(toAbsoluteFromStored({ from: 4, to: 9 })).toEqual({
      from: 4,
      to: 9,
    });
  });

  it('returns null when paragraph-relative positions are missing the paragraph start', () => {
    expect(
      toAbsoluteFromStored({
        from: 4,
        to: 9,
        positionMode: POSITION_MODE_PARAGRAPH,
      })
    ).toBeNull();
  });
});
