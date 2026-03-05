/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import sanitizeURL from './sanitizeURL';

describe('sanitizeURL', () => {
  it('should return "http://" if no URL is provided', () => {
    const result = sanitizeURL();
    expect(result).toBe('https://');
  });

  it('should return the URL if it already contains "http://"', () => {
    const url = 'http://example.com';
    const result = sanitizeURL(url);
    expect(result).toBe(url);
  });

  it('should return the URL if it already contains "https://"', () => {
    const url = 'https://example.com';
    const result = sanitizeURL(url);
    expect(result).toBe(url);
  });

  it('should prepend "http://" if the URL does not contain "http://" or "https://"', () => {
    const url = 'example.com';
    const result = sanitizeURL(url);
    expect(result).toBe('https://example.com');
  });

  it('should handle a URL with other schemes (e.g., "ftp://") and prepend "http://"', () => {
    const url = 'ftp://example.com';
    const result = sanitizeURL(url);
    expect(result).toBe('https://ftp://example.com');
  });
});
