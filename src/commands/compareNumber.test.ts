/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {compareNumber} from './compareNumber';

describe('compareNumber', () => {
  it('can sort numbers', () => {
    const numbers = [1, 5, 2, 9, 8, 0, -1, 3, 4, 7, 6, 1];
    const sorted = numbers.sort(compareNumber);
    expect(sorted).toEqual([-1, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
