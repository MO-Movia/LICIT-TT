/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { toCSSColor } from './toCSSColor';

describe('toCSSColor', () => {
  it('should get color', () => {
    const sco = 'rgba(255, 255, 255, 0.5)';
    const test = toCSSColor(sco);
    expect(test).toBe('rgba(255, 255, 255, 0.5)');
  });
});
