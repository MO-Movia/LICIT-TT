/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState} from 'prosemirror-state';
import {Schema} from 'prosemirror-model';
import {
  blankDocumentFromEditor,
  blankDocumentFromSchema,
} from './licit-gen-pm';

describe('licit-gen-pm', () => {
  const schema = new Schema({
    nodes: {
      doc: {content: 'paragraph+'},
      paragraph: {content: 'text*', group: 'block'},
      text: {group: 'inline'},
    },
    marks: {},
  });

  it('creates a blank document from schema', () => {
    const doc = blankDocumentFromSchema(schema);
    expect(doc.type.name).toBe('doc');
    expect(doc.childCount).toBeGreaterThan(0);
  });

  it('creates a blank document from editor state', () => {
    const state = EditorState.create({schema});
    const doc = blankDocumentFromEditor(state);
    expect(doc.type.name).toBe('doc');
  });

  it('throws when schema cannot create a document', () => {
    const fakeSchema = {
      topNodeType: {
        createAndFill: () => null,
      },
    } as unknown as Schema;
    expect(() => blankDocumentFromSchema(fakeSchema)).toThrow(
      'Invalid schema. Ensure schema topNodeType is defined.'
    );
  });
});
