/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { EditorState } from '@tiptap/pm/state';
import type { Schema, Node } from '@tiptap/pm/model';

/**
 * Create a blank document node. Shorthand for `blankDocumentFromSchema(editor.schema)`.
 *
 * @returns document node
 */
export function blankDocumentFromEditor(editor: EditorState): Node {
  return blankDocumentFromSchema(editor.schema);
}

/**
 * Create a blank document node.
 *
 * @returns document node
 */
export function blankDocumentFromSchema(schema: Schema): Node {
  const doc = schema.topNodeType.createAndFill();
  if (!doc) {
    throw new Error('Invalid schema. Ensure schema topNodeType is defined.');
  }
  return doc;
}
