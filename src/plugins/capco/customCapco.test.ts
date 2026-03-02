/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import { updateDocument } from './customCapco';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
describe('Capco Storage', () => {
  afterEach(() => {
    // Clear localStorage after each test
    localStorage.clear();
  });

  it('should handle updateDocument', () => {
    const customSchema = new Schema({
      nodes: {
        doc: {
          attrs: {
            capco: { default: 'capco' },
            author: { default: null },
          },
          content: 'paragraph+',
        },
        paragraph: {
          attrs: {
            capco: { default: 'capco' },
            author: { default: null },
          },
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
    });
    const mockEditorState1 = EditorState.create({
      doc: customSchema.nodeFromJSON({
        attrs: { capco: { default: 'capco' } },
        type: 'doc',
        content: [
          {
            attrs: { capco: { default: 'capco' } },
            type: 'paragraph',
            content: [
              {
                attrs: { capco: { default: 'capco' } },
                type: 'text',
                text: 'Hellow world',
              },
            ],
          },
        ],
      }),
    });

    // Create a mock `EditorState` instance with the desired selection
    const mockEditorState = EditorState.create({
      doc: customSchema.nodeFromJSON({
        attrs: { capco: { default: 'capco' } },
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hellow world',
              },
            ],
          },
        ],
      }),
      selection: TextSelection.create(
        mockEditorState1.doc,
        /* headPosition */ 0,

        /* selectionDepth */ 0
      ),
    });

    const mockEditorView = new EditorView(null, {
      state: mockEditorState,
    });
    const c = updateDocument('capco', 'updatedcapco', mockEditorView);
    expect(c).toBeUndefined();
  });
});
