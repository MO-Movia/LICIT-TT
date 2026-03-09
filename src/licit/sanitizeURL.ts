/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

const HTTP_PREFIX = /^http(s?):\/\//i;

export default function sanitizeURL(url?: string): string {
  if (!url) {
    return 'https://';
  }
  if (HTTP_PREFIX.test(url)) {
    return url;
  }
  return 'https://' + url;
}
