/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type {
  LicitNode,
  LicitDocument,
  LicitAttrs,
} from '../models/licit-document';

/**
 * Create a blank document.
 *
 * This only creates a minimal document. Prefer {@link blankDocumentFromEditor} or {@link blankDocumentFromSchema} for a more complete result.
 *
 * @returns document
 */
export function blankDocument(...content: LicitNode[]): LicitDocument {
  return {
    type: 'doc',
    attrs: {},
    content,
  };
}
/**
 * Create a blank document node.
 *
 * @returns document node
 */
export function blankNode(type: string, ...content: LicitNode[]): LicitNode {
  return {
    type,
    attrs: {},
    content,
  };
}
/**
 * Create a blank document node.
 *
 * @returns document node
 */
export function attrsNode(
  type: string,
  attrs: LicitAttrs | undefined,
  ...content: LicitNode[]
): LicitNode {
  return {
    type,
    attrs,
    content,
  };
}
/**
 * Create a document text node. Empty string is not allowed.
 *
 * @returns document node
 */
export function textNode(text = ' '): LicitNode {
  return {
    type: 'text',
    text,
    attrs: {},
  };
}
