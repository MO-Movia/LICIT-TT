/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Mark, Schema} from 'prosemirror-model';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import React from 'react';
import {MarkToggleCommand, toggleCustomStyle} from './MarkToggleCommand';

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
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
      schema: {marks: {'mark-font-type': undefined}},
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return {isAtom: true, isLeaf: true, isText: false};
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
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
      schema: {marks: {'mark-font-type': undefined}},
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return {isAtom: true, isLeaf: true, isText: false};
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
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
      schema: {marks: 'vlaue'},
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return {isAtom: true, isLeaf: true, isText: false};
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
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
      schema: {marks: 'value'},
    } as unknown as EditorState;

    const test = plugin.isActive(state);
    expect(test).toBe(false);
  });

  it('should call when execute function return false', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'block+',
        },
        paragraph: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', {marks: []}, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', {marks: []}, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', {marks: []}, [
        mySchema.node('list_item', {marks: []}, [
          mySchema.node('paragraph', {marks: []}, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', {marks: []}, [
          mySchema.node('paragraph', {marks: []}, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', {marks: []}, [
        mySchema.node('paragraph', {marks: []}, [
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
        ranges: [{$from: {depth: 1, pos: 0}, $to: {pos: 1}}],
      },
      plugins: [],
      tr: null,
      schema: {marks: 'value'},
      doc: dummyDoc,
    } as unknown as EditorState;

    const test = plugin.execute(state);
    expect(test).toBe(true);
  });
  it('should handle execute when dispatch is present', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'block+',
        },
        paragraph: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', {marks: []}, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', {marks: []}, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', {marks: []}, [
        mySchema.node('list_item', {marks: []}, [
          mySchema.node('paragraph', {marks: []}, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', {marks: []}, [
          mySchema.node('paragraph', {marks: []}, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', {marks: []}, [
        mySchema.node('paragraph', {marks: []}, [
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
        ranges: [{$from: {depth: 1, pos: 0}, $to: {pos: 1}}],
      },
      plugins: [],
      tr: {
        doc: {
          resolve: () => {
            return {parent: {type: {}}};
          },
          nodesBetween: () => {},
        },
      },
      schema: {marks: 'value'},
      doc: dummyDoc,
    } as unknown as EditorState;
    plugin.doUpdate = true;
    const test = plugin.execute(
      state,
      null as unknown as ((tr: Transform) => void) | undefined,
      {dispatch: () => {}} as unknown as EditorView
    );
    expect(test).toBe(true);
  });
  it('executeWithUserInput function() should be return false', () => {
    const state = {
      plugins: [],
      schema: {marks: {'mark-font-type': undefined}},
      tr: {
        doc: {
          nodeAt: (_x) => {
            return {isAtom: true, isLeaf: true, isText: false};
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
      selection: {from: 1, to: 2},
      schema: {marks: {'mark-font-type': undefined}},
      doc: {
        nodeAt: (_x) => {
          return {isAtom: true, isLeaf: true, isText: false};
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return {isAtom: true, isLeaf: true, isText: false, marks: []};
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
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
      schema: {marks: {'mark-font-type': undefined}},
    } as unknown as EditorState;

    const test = plugin.execute(state);
    expect(test).toBe(false);
  });

  it('should return false when atomic node is selected', () => {
    const plugin = new MarkToggleCommand('bold');

    const state = {
      selection: {
        from: 1,
        to: 2,
        empty: false,
      },
      schema: {
        marks: {
          bold: {}, // mark exists
        },
      },
      doc: {
        nodeAt: () => ({
          isAtom: true,
          isLeaf: true,
          isText: false,
        }),
      },
      tr: {},
    } as unknown as EditorState;

    const result = plugin.execute(state);

    expect(result).toBe(false);
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
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
      schema: {marks: 'vlaue'},
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return {isAtom: true, isLeaf: true, isText: false};
        },
      },
    } as unknown as Transform;

    const test = plugin.executeCustom(state, tr, 2, 2);
    expect(test).toBe(tr);
  });

  it('should call when executeCustom function returns false', () => {
    const state = {
      doc: {
        type: {allowsMarkType: (_x) => false},

        nodesBetween: (from, to, callback) => {
          const node = state.doc;
          const {$from, $to} = state.selection.ranges[0];

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
        $cursor: {parentOffset: 0},
      },
      plugins: [],
      tr: {
        doc: {nodeAt: (_x) => ({isAtom: true, isLeaf: true, isText: false})},
      },
      schema: {marks: 'value'},
    } as unknown as EditorState;

    const tr = {
      doc: {nodeAt: (_x) => ({isAtom: true, isLeaf: true, isText: false})},
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

        nodesBetween: (_x, _y, _z: (node) => {return}) => {
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
        $cursor: {parentOffset: 0},
      },
      plugins: [],
      tr: {
        doc: {
          nodeAt: (_x) => {
            return {isAtom: true, isLeaf: true, isText: false};
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

  it('should return false when single atomic node is selected (to === from + 1)', () => {
  const plugin = new MarkToggleCommand('bold');

  const mySchema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'text*', group: 'block' },
      image: {
        inline: false,
        atom: true,
        group: 'block',
        attrs: { src: { default: '' } },
      },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const imageNode = mySchema.node('image', { src: 'test.jpg' });

  const state = {
    selection: {
      from: 1,
      to: 2, // to === from + 1
      empty: false,
    },
    schema: mySchema,
    doc: {
      nodeAt: () => imageNode,
    },
    tr: {},
  } as unknown as EditorState;

  const result = plugin.execute(state);
  expect(result).toBe(false);
});

it('should return true when dispatch is not provided', () => {
  const plugin = new MarkToggleCommand('bold');

  const mySchema = new Schema({
    nodes: {
      doc: { content: 'text*' },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.text('Test text'),
  ]);

  const state = {
    selection: {
      from: 1,
      to: 5,
      empty: false,
      $from: { marks: () => [] },
    },
    schema: mySchema,
    doc: dummyDoc,
    tr: {},
  } as unknown as EditorState;

  const result = plugin.execute(state); // No dispatch parameter
  expect(result).toBe(true);
});

it('should return false for atomic node in executeCustom when to === from + 1', () => {
  const plugin = new MarkToggleCommand('bold');

  const mySchema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'text*', group: 'block' },
      image: { atom: true, group: 'block', attrs: { src: { default: '' } } },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const state = {
    schema: mySchema,
  } as unknown as EditorState;

  const tr = {
    doc: {
      nodeAt: () => ({
        isAtom: true,
        isText: false,
        isLeaf: true,
      }),
    },
  } as unknown as Transform;

  const result = plugin.executeCustom(state, tr, 1, 2);
  expect(result).toBe(false);
});

it('should return false in executeCustomStyleForTable when mark type does not exist', () => {
  const plugin = new MarkToggleCommand('nonexistent');

  const mySchema = new Schema({
    nodes: {
      doc: { content: 'text*' },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const state = {
    schema: mySchema,
  } as unknown as EditorState;

  const tr = {} as unknown as Transform;

  const result = plugin.executeCustomStyleForTable(state, tr, 1, 5);
  expect(result).toBe(false);
});

it('should remove stored mark when cursor is at parentOffset 0 with mark present', () => {
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'text*' },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.text('Test'),
  ]);

  const boldMark = mySchema.marks.bold.create();
  const mockRemoveStoredMark = jest.fn().mockReturnThis();

  const state = {
    selection: {
      empty: true,
      $cursor: {
        parentOffset: 0,
        marks: () => [boldMark],
      },
      ranges: [{ $from: { depth: 0, pos: 0 }, $to: { pos: 0 } }],
    },
    storedMarks: null,
    doc: dummyDoc,
    tr: {
      removeStoredMark: mockRemoveStoredMark,
      addStoredMark: jest.fn().mockReturnThis(),
    },
  } as unknown as EditorState;

  const tr = state.tr as unknown as Transform;
  const markType = mySchema.marks.bold;

  toggleCustomStyle(markType, null, state, tr, 0, 0);

  expect(mockRemoveStoredMark).toHaveBeenCalled();
});

it('should add stored mark when cursor is at parentOffset 0 without mark', () => {
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'text*' },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.text('Test'),
  ]);

  const mockAddStoredMark = jest.fn().mockReturnThis();

  const state = {
    selection: {
      empty: true,
      $cursor: {
        parentOffset: 0,
        marks: () => [],
      },
      ranges: [{ $from: { depth: 0, pos: 0 }, $to: { pos: 0 } }],
    },
    storedMarks: null,
    doc: dummyDoc,
    tr: {
      removeStoredMark: jest.fn().mockReturnThis(),
      addStoredMark: mockAddStoredMark,
    },
  } as unknown as EditorState;

  const tr = state.tr as unknown as Transform;
  const markType = mySchema.marks.bold;

  toggleCustomStyle(markType, null, state, tr, 0, 0);

  expect(mockAddStoredMark).toHaveBeenCalled();
});

it('should skip nodes with override mark attribute set to true', () => {
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'text*' },
      text: { inline: true },
    },
    marks: {
      bold: {},
      override: {
        attrs: { bold: { default: null } },
      },
    },
  });

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.text('Test', [
      mySchema.marks.override.create({ bold: true }),
    ]),
  ]);

  const mockAddMark = jest.fn().mockReturnThis();

  const state = {
    selection: {
      empty: false,
      $cursor: null,
      ranges: [{ $from: { depth: 0, pos: 0 }, $to: { pos: 4 } }],
    },
    doc: dummyDoc,
  } as unknown as EditorState;

  const tr = {
    doc: dummyDoc,
    addMark: mockAddMark,
  } as unknown as Transform;

  const markType = mySchema.marks.bold;

  toggleCustomStyle(markType, null, state, tr, 0, 4);

  // Should not add mark because override.bold === true
  expect(mockAddMark).not.toHaveBeenCalled();
});

it('should apply mark to nodes without override or with override.bold !== true', () => {
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'text*' },
      text: { inline: true },
    },
    marks: {
      bold: {},
      override: {
        attrs: { bold: { default: null } },
      },
    },
  });

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.text('Test', [
      mySchema.marks.override.create({ bold: false }),
    ]),
  ]);

  const mockAddMark = jest.fn().mockReturnThis();

  const state = {
    selection: {
      empty: false,
      $cursor: null,
      ranges: [{ $from: { depth: 0, pos: 0 }, $to: { pos: 4 } }],
    },
    doc: dummyDoc,
  } as unknown as EditorState;

  const tr = {
    doc: dummyDoc,
    addMark: mockAddMark,
  } as unknown as Transform;

  const markType = mySchema.marks.bold;

  toggleCustomStyle(markType, null, state, tr, 0, 4);

  expect(mockAddMark).toHaveBeenCalled();
});

it('should handle markApplies when node does not allow marks', () => {
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'text*',
        group: 'block',
        marks: '', // Does not allow marks
      },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const plugin = new MarkToggleCommand('bold');

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('paragraph', null, [mySchema.text('Test')]),
  ]);

  const state = {
    schema: mySchema,
    doc: dummyDoc,
    selection: {
      ranges: [
        {
          $from: { depth: 1, pos: 1 },
          $to: { pos: 5 },
        },
      ],
    },
  } as unknown as EditorState;

  const tr = {
    doc: dummyDoc,
  } as unknown as Transform;

  const result = plugin.executeCustom(state, tr, 1, 5);

  expect(result).toBeDefined();
});

it('should handle markApplies when node has inline content and allows mark', () => {
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'text*',
        group: 'block',
        marks: 'bold',
      },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const plugin = new MarkToggleCommand('bold');

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('paragraph', null, [mySchema.text('Test')]),
  ]);

  const state = {
    schema: mySchema,
    doc: dummyDoc,
    selection: {
      ranges: [
        {
          $from: { depth: 1, pos: 1 },
          $to: { pos: 5 },
        },
      ],
    },
  } as unknown as EditorState;

  const tr = {
    doc: dummyDoc,
    addMark: jest.fn().mockReturnThis(),
  } as unknown as Transform;

  const result = plugin.executeCustom(state, tr, 1, 5);

  expect(result).toBeDefined();
});

it('should check depth 0 and verify doc type allowsMarkType', () => {
  const mySchema = new Schema({
    nodes: {
      doc: {
        content: 'text*',
        marks: 'bold', // Doc allows bold marks
      },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const plugin = new MarkToggleCommand('bold');

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.text('Test'),
  ]);

  const state = {
    schema: mySchema,
    doc: dummyDoc,
    selection: {
      ranges: [
        {
          $from: { depth: 0, pos: 0 },
          $to: { pos: 4 },
        },
      ],
    },
  } as unknown as EditorState;

  const tr = {
    doc: dummyDoc,
    addMark: jest.fn().mockReturnThis(),
  } as unknown as Transform;

  const result = plugin.executeCustom(state, tr, 0, 4);

  expect(result).toBeDefined();
});

it('should return false in executeCustomStyleForTable for atomic node', () => {
  const plugin = new MarkToggleCommand('bold');

  const mySchema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'text*', group: 'block' },
      image: { atom: true, group: 'block', attrs: { src: { default: '' } } },
      text: { inline: true },
    },
    marks: {
      bold: {},
    },
  });

  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('paragraph', null, [mySchema.text('Test')]),
  ]);

  const state = {
    schema: mySchema,
    doc: dummyDoc,
  } as unknown as EditorState;

  const tr = {
    doc: {
      nodeAt: () => ({
        isAtom: true,
        isText: false,
        isLeaf: true,
      }),
    },
  } as unknown as Transform;

  const result = plugin.executeCustomStyleForTable(state, tr, 1, 2);
  expect(result).toBe(false);
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
            return {isAtom: true, isLeaf: true, isText: false};
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
          attrs: {lineSpacing: {default: 'test'}},
          content: 'block+',
        },
        paragraph: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: {lineSpacing: {default: 'test'}},
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', {marks: []}, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', {marks: []}, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', {marks: []}, [
        mySchema.node('list_item', {marks: []}, [
          mySchema.node('paragraph', {marks: []}, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', {marks: []}, [
          mySchema.node('paragraph', {marks: []}, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', {marks: []}, [
        mySchema.node('paragraph', {marks: []}, [
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
              $from: {depth: 1, pos: 0},
              $to: {pos: 1},
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
          ranges: [{$from: {depth: 1, pos: 0}, $to: {pos: 1}}],
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
