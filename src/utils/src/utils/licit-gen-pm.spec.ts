/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {
  blankDocumentFromEditor,
  blankDocumentFromSchema,
} from './licit-gen-pm';
import type { EditorState } from '@tiptap/pm/state';
import { schema } from '@tiptap/pm/schema-basic';

describe('Licit ProseMirror Generator Utils', () => {
  it('should create blankDocumentFromEditor', () => {
    expect(
      blankDocumentFromEditor({
        schema,
      } as EditorState)
    ).toBeDefined();
  });
  it('should create blankDocumentFromSchema', () => {
    expect(blankDocumentFromSchema(schema)).toBeDefined();
  });
});
