/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { sanitizeURL } from './sanitizeURL';

describe('sanitizeURL', () => {
  it('should handle sanitizeURL https:// + url', () => {
    expect(sanitizeURL('google.com')).toBe('https://google.com');
  });
  it('should handle sanitizeURL and return https://', () => {
    expect(sanitizeURL()).toBe('https://');
  });
  it('should handle sanitizeURL and return url', () => {
    expect(sanitizeURL('https://google.com')).toBe('https://google.com');
  });
});
