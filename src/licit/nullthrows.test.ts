/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import nullthrows from './nullthrows';

describe('nullthrows', () => {
  it('returns the value when it is defined', () => {
    expect(nullthrows(0)).toBe(0);
    expect(nullthrows('')).toBe('');
    expect(nullthrows(false)).toBe(false);
    const obj = {a: 1};
    expect(nullthrows(obj)).toBe(obj);
  });

  it('throws when the value is null', () => {
    expect(() => {
      nullthrows(null);
    }).toThrow('Got unexpected null');
  });

  it('throws when the value is undefined', () => {
    expect(() => {
      nullthrows(undefined);
    }).toThrow('Got unexpected undefined');
  });

  it('throws with a custom message when provided', () => {
    expect(() => {
      nullthrows(null, 'custom message');
    }).toThrow('custom message');
  });
});
