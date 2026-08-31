/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import DOMPurify from 'dompurify';

/**
 * Whitelist of tags/attributes that may appear in an info-icon description.
 * The description is produced by ProseMirror's DOMSerializer against the
 * info-icon dialog schema (prosemirror-schema-basic + list nodes), so only
 * these tags/attrs are expected. Anything else (inline event handlers,
 * <script>, <img onerror>, etc.) is stripped before the string reaches the
 * live DOM, satisfying strict CSP `unsafe-inline` policies.
 */
const ALLOWED_TAGS = [
  'p',
  'a',
  'em',
  'i',
  'strong',
  'b',
  'br',
  'ul',
  'ol',
  'li',
];

const ALLOWED_ATTR = ['href'];

/**
 * Sanitizes an info-icon description HTML string for safe insertion via
 * innerHTML. Returns the cleaned HTML. Null/undefined/empty input returns
 * an empty string.
 */
export function sanitizeDescription(description?: string | null): string {
  if (!description) {
    return '';
  }
  return DOMPurify.sanitize(description, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
