import { Mark, Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import { EditorView } from '@tiptap/pm/view';
import React from 'react';
import { MarkToggleCommand, toggleCustomStyle } from './MarkToggleCommand';

describe('MarkToggleCommand', () => {
  let plugin!: MarkToggleCommand;
  beforeEach(() => {
    plugin = new MarkToggleCommand('bold');
  });
  it('should create', () => {
    expect(plugin).toBeTruthy();
  });

  it('should call when executeCustom function return first false', () => {
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: { marks: { 'mark-font-type': undefined } },
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
    } as unknown as Transform;

    const test = plugin.executeCustom(state, tr, 2, 2);
    expect(test).toBe(false);
  });

  it('should call when executeCustom function return first false', () => {
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: { marks: { 'mark-font-type': undefined } },
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
    } as unknown as Transform;

    const test = plugin.executeCustomStyleForTable(state, tr, 2, 2);
    expect(test).toBe(false);
  });

  it('should call when executeCustom function return second false', () => {
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: { marks: 'vlaue' },
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
    } as unknown as Transform;

    const test = plugin.executeCustom(state, tr, 1, 2);
    expect(test).toBe(false);
  });

  it('should call when isActive function return false', () => {
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 5,
        to: 2,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: { marks: 'value' },
    } as unknown as EditorState;

    const test = plugin.isActive(state);
    expect(test).toBe(false);
  });

  it('should call when execute function return false', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'block+',
        },
        paragraph: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', { marks: [] }, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', { marks: [] }, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', { marks: [] }, [
        mySchema.node('list_item', { marks: [] }, [
          mySchema.node('paragraph', { marks: [] }, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', { marks: [] }, [
          mySchema.node('paragraph', { marks: [] }, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', { marks: [] }, [
        mySchema.node('paragraph', { marks: [] }, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 5,
        to: 2,
        ranges: [{ $from: { depth: 1, pos: 0 }, $to: { pos: 1 } }],
      },
      plugins: [],
      tr: null,
      schema: { marks: 'value' },
      doc: dummyDoc,
    } as unknown as EditorState;

    const test = plugin.execute(state);
    expect(test).toBe(true);
  });
  it('should handle execute when dispatch is present', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'block+',
        },
        paragraph: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', { marks: [] }, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', { marks: [] }, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', { marks: [] }, [
        mySchema.node('list_item', { marks: [] }, [
          mySchema.node('paragraph', { marks: [] }, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', { marks: [] }, [
          mySchema.node('paragraph', { marks: [] }, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', { marks: [] }, [
        mySchema.node('paragraph', { marks: [] }, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 5,
        to: 2,
        ranges: [{ $from: { depth: 1, pos: 0 }, $to: { pos: 1 } }],
      },
      plugins: [],
      tr: {
        doc: {
          resolve: () => {
            return { parent: { type: {} } };
          },
          nodesBetween: () => {},
        },
      },
      schema: { marks: 'value' },
      doc: dummyDoc,
    } as unknown as EditorState;
    plugin.doUpdate = true;
    const test = plugin.execute(
      state,
      null as unknown as ((tr: Transform) => void) | undefined,
      { dispatch: () => {} } as unknown as EditorView
    );
    expect(test).toBe(true);
  });
  it('executeWithUserInput function() should be return false', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-font-type': undefined } },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;

    const test = plugin.executeWithUserInput(state);
    expect(test).toBeFalsy();
  });

  it('waitForUserInput function() should be return undefined', () => {
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-font-type': undefined } },
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false, marks: [] };
          },
        },
      },
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const event_ = {
      currentTarget: document.createElement('div'),
    } as unknown as Event;

    const editorview = {} as unknown as EditorView;

    const result = plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_ as unknown as React.SyntheticEvent
    );

    expect(result).toBeDefined();
  });

  it('should call when excute function return false', () => {
    const state = {
      doc: {},
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: { marks: { 'mark-font-type': undefined } },
    } as unknown as EditorState;

    const test = plugin.execute(state);
    expect(test).toBe(false);
  });

  it('should call when excute function return false', () => {
    const state = {
      doc: {},
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: { marks: 'value' },
    } as unknown as EditorState;
    const test = plugin.execute(state);
    expect(test).toBe(false);
  });

  it('should call when excute function return tr', () => {
    const state = {
      doc: {},
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
        empty: 1,
        ranges: 3,
        $cursor: 6,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: { marks: 'vlaue' },
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
    } as unknown as Transform;

    const test = plugin.executeCustom(state, tr, 2, 2);
    expect(test).toBe(tr);
  });

  it('should call when executeCustom function returns false', () => {
    const state = {
      doc: {
        type: { allowsMarkType: (_x) => false },

        nodesBetween: (from, to, callback) => {
          const node = state.doc;
          const { $from, $to } = state.selection.ranges[0];

          if (from <= $from.pos && to >= $to.pos) {
            // If the range from 'from' to 'to' covers the entire doc, call the callback with the doc node.
            callback(node);
          } else {
            // Otherwise, traverse the document nodes and call the callback for each node within the range.
            node.nodesBetween(from, to, callback);
          }
        },
      },
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
        ranges: [
          {
            $from: {
              pos: 1,
              depth: 0,
            },
            $to: {
              pos: 5,
            },
            from: 1,
            to: 5,
          },
        ],
        $cursor: { parentOffset: 0 },
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => ({ isAtom: true, isLeaf: true, isText: false }),
        },
      },
      schema: { marks: 'value' },
    } as unknown as EditorState;

    const tr = {
      doc: { nodeAt: (_x) => ({ isAtom: true, isLeaf: true, isText: false }) },
    } as unknown as Transform;

    const test = plugin.executeCustom(state, tr, 1, 21);
    expect(test).toBeDefined();
  });

  it('should call when executeCustom function return true', () => {
    const state = {
      doc: {
        type: {
          allowsMarkType: (_x) => {
            return true;
          },
        },

        nodesBetween: (_x, _y, _z: (node) => { return }) => {
          ('');
        },
      },
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 1,
        to: 2,
        ranges: [
          {
            $from: {
              pos: 1,
              depth: 0,
            },
            $to: {
              pos: 5,
            },

            from: 1,
            to: 5,
          },
        ],
        $cursor: { parentOffset: 0 },
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: {
        marks: {
          bold: {
            create: (_attributes) => {
              return 'created_attrs';
            },
          },
        },
      },
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return {
            isAtom: true,
            isLeaf: true,
            isText: false,
            descendants: () => {},
          };
        },
        rangeHasMark: (_X) => {
          return {};
        },
        nodesBetween: () => {
          return {};
        },
      },
      addMark: (_x, _y, _z) => {
        return '';
      },
    } as unknown as Transform;

    const test = plugin.executeCustom(state, tr, 1, 21);
    expect(test).toBeDefined();
  });
  it('should call when isActive function return false', () => {
    const state = {
      doc: {
        nodeAt: (_x) => {
          return '';
        },
      },
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 2,
        to: 3,
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
      schema: {
        marks: {
          bold: {
            create: (_attributes) => {
              return 'created_attrs';
            },
          },
        },
      },
    } as unknown as EditorState;

    const test = plugin.isActive(state);
    expect(test).toBe(false);
  });
  describe('toggleCustomStyle', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'block+',
        },
        paragraph: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', { marks: [] }, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', { marks: [] }, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', { marks: [] }, [
        mySchema.node('list_item', { marks: [] }, [
          mySchema.node('paragraph', { marks: [] }, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', { marks: [] }, [
          mySchema.node('paragraph', { marks: [] }, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', { marks: [] }, [
        mySchema.node('paragraph', { marks: [] }, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);
    it('should return tr when selection is empty and no stored marks', () => {
      const mt = {
        isInSet: () => {
          return;
        },
        create: () => {
          return {};
        },
      };
      const attrs = {};
      const state = {
        selection: {
          empty: 0,
          $cursor: {
            parentOffset: 0,
            marks: () => {
              // Implement the logic for the marks function here
              return; // Return the appropriate value based on the logic
            },
          },
          ranges: [
            {
              $from: { depth: 1, pos: 0 },
              $to: { pos: 1 },
            },
          ],
        },
        doc: dummyDoc,
        tr: {
          removeStoredMark: () => {
            return {};
          },
          addStoredMark: () => {
            return {};
          },
        },
      } as unknown as EditorState;

      const tr = {} as unknown as Transform;
      const test = toggleCustomStyle(mt, attrs, state, tr, 1, 1);
      expect(test).toStrictEqual({});
    });
    it('should return tr when selection is empty and no stored marks', () => {
      const mt = {
        isInSet: () => {
          return true;
        },
        create: () => {
          return {};
        },
      };
      const attrs = {};
      const state = {
        storedMarks: true,
        selection: {
          empty: 0,
          $cursor: {
            parentOffset: 0,
            marks: () => [] as Mark[], // Use Mark[] instead of any[]
          },
          ranges: [{ $from: { depth: 1, pos: 0 }, $to: { pos: 1 } }],
        },
        doc: dummyDoc,
        tr: {
          removeStoredMark: () => {
            return {};
          },
          addStoredMark: () => {
            return {};
          },
        },
      } as unknown as EditorState;
      const tr = {} as unknown as Transform;
      const test = toggleCustomStyle(mt, attrs, state, tr, 1, 1);
      expect(test).toStrictEqual({});
    });
  });

  it('should not render label', () => {
    expect(plugin.renderLabel()).toBeNull();
  });
});
