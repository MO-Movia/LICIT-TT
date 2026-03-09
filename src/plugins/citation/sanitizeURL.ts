

/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

export function sanitizeURL(url?: string): string {
  const HTTP_PREFIX = /^http(s?):\/\//i;
  if (!url) {
    return 'https://';
  }
  if (HTTP_PREFIX.test(url)) {
    return url;
  }
  return 'https://' + url;
}


