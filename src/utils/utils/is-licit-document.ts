/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node } from '@tiptap/pm/model';
import type { LicitDocument, LicitNode } from '../models/licit-document';

/**
 * Test if supplied instance is a doc
 * @param doc document or string to test
 * @returns true if doc is an object matching the LicitDocument format.
 */
export function isLicitDocumentObject(doc: unknown): doc is LicitDocument {
  return (
    !!doc && typeof doc === 'object' && 'type' in doc && doc.type === 'doc'
  );
}

/**
 * Test if supplied object is a Licit formatted document
 *
 * Use {@link isLicitDocumentObject} for additional type information if you know doc is not a json string.
 *
 * @param doc document or string to test
 * @returns true if doc is an object or json string matching the LicitDocument format.
 */
export function isLicitDocument(doc: unknown): boolean {
  try {
    return isLicitDocumentObject(
      typeof doc === 'string' ? JSON.parse(doc) : doc
    );
  } catch {
    // cannot be a document
    return false;
  }
}

/**
 * Checks if licit content is defined and has been edited.
 * @param content Licit content to check if dirty
 * @returns True if value is defined and contains any dirty or deleted nodes.
 */
export function isDirty(content?: LicitDocument | LicitNode | Node): boolean {
  return (
    !!content?.attrs?.dirty ||
    !!(content?.attrs?.deletedObjectIds as unknown[])?.length ||
    !!(content instanceof Node ? content.children : content?.content)?.some?.(
      (n: LicitNode | Node) => isDirty(n)
    )
  );
}
