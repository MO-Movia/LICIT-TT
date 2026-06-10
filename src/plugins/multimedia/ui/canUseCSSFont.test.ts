/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {canUseCSSFont} from './canUseCSSFont';

describe('canUseCSSFont', () => {
  it('should cache check', () => {
    Object.defineProperty(document, 'fonts', {
      value: {
        check: () => true,
        ready: Promise.resolve(null!),
        status: 'loaded',
        values: () => [{}],
      },
    });
    const font = 'mock';
    const check = canUseCSSFont(font);
    expect(check).toBeDefined();
    expect(canUseCSSFont(font)).toStrictEqual(check);
  });
});
