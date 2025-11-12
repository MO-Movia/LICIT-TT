import { updateIndentLevel, setNodeIndentMarkup, setListNodeIndent } from './updateIndentLevel';
import { Mark, Node, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH } from './NodeNames';
import * as consolidateListNodes from './consolidateListNodes';
import * as isListNode from './isListNode';
import * as clamp from './ui/clamp';
import { EditorView } from 'prosemirror-view';
import { CellSelection,tableNodes } from 'prosemirror-tables';
require('prosemirror-schema-basic');

declare let require;

describe('updateIndentLevel', () => {
  let schema1;
  let doc;
  let trr;

  beforeEach(() => {
    schema1 = new Schema({
      nodes: {
        doc: { content: 'text*' },
        text: {},
      },
      marks: {
        bold: {},
      },
    });

    doc = schema1.node('doc', {}, [schema1.text('Hello world')]);

    trr = document.createElement('tr');
    // Add some descendant nodes for testing
    trr.innerHTML = '<td>Cell 1</td><td>Cell 2</td><td>Cell 3</td>';
  });
  const mySchema = new Schema({
    nodes: {
      doc: {
        attrs: { indent: { default: 'test' } },
        content: 'block+',
      },
      paragraph: {
        attrs: { indent: { default: 'test' } },
        content: 'text*',
        group: 'block',
      },
      heading: {
        attrs: { indent: { default: 'test' } },
        content: 'text*',
        group: 'block',
        defining: true,
      },
      bullet_list: {
        content: 'list_item+',
        group: 'block',
      },
      list_item: {
        attrs: { indent: { default: 'test' } },
        content: 'paragraph',
        defining: true,
      },
      blockquote: {
        attrs: { indent: { default: 'test' } },
        content: 'block+',
        group: 'block',
      },
      text: {
        inline: true,
      },
    },
  });

  // Create a dummy document using the defined schema
  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('heading', { indent: 'test' }, [mySchema.text('Heading 1')]),
    mySchema.node('paragraph', { indent: 'test' }, [
      mySchema.text('This is a paragraph'),
    ]),
    mySchema.node('bullet_list', { indent: 'test' }, [
      mySchema.node('list_item', { indent: 'test' }, [
        mySchema.node('paragraph', { indent: 'test' }, [
          mySchema.text('List item 1'),
        ]),
      ]),
      mySchema.node('list_item', { indent: 'test' }, [
        mySchema.node('paragraph', { indent: 'test' }, [
          mySchema.text('List item 2'),
        ]),
      ]),
    ]),
    mySchema.node('blockquote', { indent: 'test' }, [
      mySchema.node('paragraph', { indent: 'test' }, [
        mySchema.text('This is a blockquote'),
      ]),
    ]),
  ]);

  it('should be check the condition !doc', () => {
    const state = {} as unknown as EditorState;
    const tr = { selection: { from: 1, to: 2 } } as unknown as Transform;
    const sc = {} as unknown as Schema;
    const view = {} as unknown as EditorView;

    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });
    it('should handle updateIndentLevel when selection instance of cellselection', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: {},
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0],
          parseDOM: [{ tag: 'p' }],
        },
        ...tableNodes({
          tableGroup: 'block',
          cellContent: 'paragraph',
          cellAttributes: {}
        }),
      },
    });

    const doc = schema.node('doc', null, [
      schema.node('table', null, [
        schema.node('table_row', null, [
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('A')]),
          ]),
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('B')]),
          ]),
        ]),
      ]),
    ]);

    const selection = CellSelection.create(doc, 2, 2);
    const test = updateIndentLevel( {} as unknown as EditorState,
      { selection: selection, doc: doc } as unknown as Transform,{ nodes: { 'blockquote': null, 'heading': null, 'paragraph': null } } as unknown as Schema
      ,1,{} as unknown as EditorView
      );
    expect(test).toBeDefined();
  });
  it('should check the condition inside setListNodeIndent function() !listItem', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: { nodeAt: () => { return { attrs: { indent: '2' } }; } },
      selection: { from: 1, to: 2 },
      getMeta: () => {
        return 'dryrun';
      },
    } as unknown as Transform;
    const sc = {
      nodes: { paragraph: PARAGRAPH, heading: HEADING, blockquote: BLOCKQUOTE, 'list_item': 'list_item' },
    } as unknown as Schema;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    const test = setListNodeIndent(state, tr, sc, 0, 0);
    expect(test).toBeTruthy();
  });
  it('should check the condition inside setNodeIndentMarkup function() !listItem', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: { nodeAt: () => { return { attrs: { indent: '2' } }; } },
      selection: { from: 1, to: 2 },
      getMeta: () => {
        return 'dryrun';
      },
    } as unknown as Transform;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    const test = setNodeIndentMarkup(state, tr, 0, 0);
    expect(test).toBeTruthy();
  });
  it('should be check the condition !selection', () => {
    const state = {} as unknown as EditorState;
    const tr = { doc: dummyDoc } as unknown as Transform;
    const sc = {} as unknown as Schema;
    const view = {} as unknown as EditorView;

    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });
  it('should be check the condition !listNodePoses.length', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: dummyDoc,
      selection: { from: 1, to: 2 },
      getMeta: () => { }
    } as unknown as Transform;
    const sc = {
      nodes: { paragraph: PARAGRAPH, heading: HEADING, blockquote: BLOCKQUOTE },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;

    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should be check the condition inside setListNodeIndent function() !listItem', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: dummyDoc,
      selection: { from: 1, to: 2 },
      getMeta: () => {
        return 'dryrun';
      },
    } as unknown as Transform;
    const sc = {
      nodes: { paragraph: PARAGRAPH, heading: HEADING, blockquote: BLOCKQUOTE },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should be return tr inside setListNodeIndent function()', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: dummyDoc,
      selection: { from: 1, to: 2 },
      getMeta: () => {
        return 'dryrun';
      },
      delete: () => {
        return;
      },
    } as unknown as Transform;
    const sc = {
      nodes: {
        paragraph: PARAGRAPH,
        heading: HEADING,
        blockquote: BLOCKQUOTE,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    jest
      .spyOn(consolidateListNodes, 'consolidateListNodes')
      .mockReturnValue(tr as unknown as Transform);
    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should be return tr inside setListNodeIndent function()', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
        },
        heading: {
          content: 'text*',
          group: 'block',
        },
        blockquote: {
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });

    const doc = mySchema.node('doc', null, [
      mySchema.node('paragraph', null, [mySchema.text('Paragraph 1')]),
      mySchema.node('heading', null, [mySchema.text('Heading 1')]),
      mySchema.node('blockquote', null, [
        mySchema.node('paragraph', null, [mySchema.text('Blockquote 1')]),
      ]),
      mySchema.node('paragraph', null, [mySchema.text('Paragraph 2')]),
    ]);

    const state = {} as unknown as EditorState;

    const tr = {
      doc: dummyDoc,
      selection: { from: 0, to: doc.content.size },
      getMeta: () => 'dryrun',
      setNodeMarkup: () => true,
    } as unknown as Transform;

    const sc = {
      nodes: {
        paragraph: PARAGRAPH,
        heading: undefined,
        blockquote: undefined,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    jest
      .spyOn(consolidateListNodes, 'consolidateListNodes')
      .mockReturnValue(tr as unknown as Transform);
    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should be check the condition indentNew === listNode.attrs.indent', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: { indent: { default: 5 } },
          content: 'block+',
        },
        paragraph: {
          attrs: { indent: { default: 5 } },
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: { indent: { default: 5 } },
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: { indent: { default: 5 } },
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: { indent: { default: 5 } },
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });

    // Create a dummy document using the defined schema
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', { indent: 5 }, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', { indent: 5 }, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', { indent: 5 }, [
        mySchema.node('list_item', { indent: 5 }, [
          mySchema.node('paragraph', { indent: 5 }, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', { indent: 5 }, [
          mySchema.node('paragraph', { indent: 5 }, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', { indent: 5 }, [
        mySchema.node('paragraph', { indent: 5 }, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);
    jest.spyOn(clamp, 'clamp').mockReturnValue(5);
    const state = {} as unknown as EditorState;

    const tr = {
      doc: dummyDoc,
      selection: { from: 0, to: doc.content.size },
      getMeta: () => {
        return 'dryrun';
      },
      setNodeMarkup: () => {
        return true;
      },
    } as unknown as Transform;
    const sc = {
      nodes: {
        paragraph: PARAGRAPH,
        heading: undefined,
        blockquote: undefined,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    jest
      .spyOn(consolidateListNodes, 'consolidateListNodes')
      .mockReturnValue(tr as unknown as Transform);

    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });
  it('should be check the condition inside the function setNodeIndentMarkup() indentNew === listNode.attrs.indent', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: { indent: { default: 5 } },
          content: 'block+',
        },
        paragraph: {
          attrs: { indent: { default: 5 } },
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: { indent: { default: 5 } },
          content: 'text*',
          group: 'block',
          defining: true,
        },
        bullet_list: {
          content: 'list_item+',
          group: 'block',
        },
        list_item: {
          attrs: { indent: { default: 5 } },
          content: 'paragraph',
          defining: true,
        },
        blockquote: {
          attrs: { indent: { default: 5 } },
          content: 'block+',
          group: 'block',
        },
        text: {
          inline: true,
        },
      },
    });

    // Create a dummy document using the defined schema
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', { indent: 5 }, [mySchema.text('Heading 1')]),
      mySchema.node('paragraph', { indent: 5 }, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', { indent: 5 }, [
        mySchema.node('list_item', { indent: 5 }, [
          mySchema.node('paragraph', { indent: 5 }, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', { indent: 5 }, [
          mySchema.node('paragraph', { indent: 5 }, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', { indent: 5 }, [
        mySchema.node('paragraph', { indent: 5 }, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);
    jest.spyOn(clamp, 'clamp').mockReturnValueOnce(7).mockReturnValueOnce(5);
    const state = {} as unknown as EditorState;

    const tr = {
      doc: dummyDoc,
      selection: { from: 0, to: doc.content.size },
      getMeta: () => {
        return 'dryrun';
      },
      setNodeMarkup: () => {
        return true;
      },
    } as unknown as Transform;
    const sc = {
      nodes: {
        paragraph: PARAGRAPH,
        heading: undefined,
        blockquote: undefined,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    jest
      .spyOn(consolidateListNodes, 'consolidateListNodes')
      .mockReturnValue(tr as unknown as Transform);

    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should be check the condition !tr.doc inside the function setNodeIndentMarkup()', () => {
    const state = {} as unknown as EditorState;
    const tr = { doc: undefined } as unknown as Transform;
    const test = setNodeIndentMarkup(state, tr, 9, 7);
    expect(test).toBeTruthy();
  });
  it('should be check the condition !node inside the function setNodeIndentMarkup()', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: {
        nodeAt: () => {
          return false;
        },
      },
    } as unknown as Transform;
    const test = setNodeIndentMarkup(state, tr, 9, 7);
    expect(test).toBeDefined();
  });

  it('should return tr inside setListNodeIndent function with actual document', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: dummyDoc,
      selection: { from: 1, to: 2 },
    } as unknown as Transform;
    const sc = {
      nodes: {
        paragraph: PARAGRAPH,
        heading: HEADING,
        blockquote: BLOCKQUOTE,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;

    jest.spyOn(isListNode, 'isListNode').mockReturnValue(false);
    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should return tr inside setListNodeIndent function()', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: dummyDoc,
      selection: { from: 1, to: 2 },
      getMeta: () => {
        return 'dryrun';
      },
      delete: () => {
        return;
      },
    } as unknown as Transform;
    const sc = {
      nodes: {
        paragraph: PARAGRAPH,
        heading: HEADING,
        blockquote: BLOCKQUOTE,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    jest
      .spyOn(consolidateListNodes, 'consolidateListNodes')
      .mockReturnValue(tr as unknown as Transform);
    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should check the condition inside setListNodeIndent function() !listItem', () => {
    const state = {} as unknown as EditorState;
    const tr = {
      doc: dummyDoc,
      selection: { from: 1, to: 2 },
      getMeta: () => {
        return 'dryrun';
      },
    } as unknown as Transform;
    const sc = {
      nodes: { paragraph: PARAGRAPH, heading: HEADING, blockquote: BLOCKQUOTE },
    } as unknown as Schema;
    const view = {} as unknown as EditorView;
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should check the condition !doc', () => {
    const state = {} as unknown as EditorState;
    const tr = { selection: { from: 1, to: 2 } } as unknown as Transform;
    const sc = {} as unknown as Schema;
    const view = {} as unknown as EditorView;

    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });

  it('should check the condition !selection', () => {
    const state = {} as unknown as EditorState;
    const tr = { doc: dummyDoc } as unknown as Transform;
    const sc = {} as unknown as Schema;
    const view = {} as unknown as EditorView;

    const test = updateIndentLevel(state, tr, sc, 5, view);
    expect(test).toBeTruthy();
  });
  it('should check the condition inside setListNodeIndent function() !listItem', () => {
    const state = {} as unknown as EditorState;
    const linkmark = new Mark();
    const mockschema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        list_item: {
          content: 'text*',
          attrs: {
            styleName: { default: 'test' },
          },
          toDOM() {
            return ['p', 0];
          },
        },
        paragraph: {
          content: 'text*',
          attrs: {
            styleName: { default: 'test' },
          },
          toDOM() {
            return ['p', 0];
          },
        },
        heading: {
          attrs: { level: { default: 1 }, styleName: { default: '' } },
          content: 'inline*',
          marks: '',
          toDOM(node) {
            return [
              'h' + node.attrs.level,
              { 'data-style-name': node.attrs.styleName },
              0,
            ];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        link: linkmark,
      },
    });
    const mockdoc = mockschema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, styleName: 'Normal' },
          content: [
            {
              type: 'text',
              text: 'Hello, ProseMirror!',
            },
          ],
          marks: [{ type: 'link', attrs: { ['overridden']: true } }],
        },
                {
          type: 'list_item',
          attrs: { level: 1, styleName: 'Normal' },
          content: [
            {
              type: 'text',
              text: 'Hello, ProseMirror!',
            },
          ],
          marks: [{ type: 'link', attrs: { ['overridden']: true } }],
        },
      ],
    });
    const tr1 = {
      delete:()=>{return {};},
      doc: mockdoc,
      selection: { from: 1, to: 2 },
      getMeta: () => {
        return 'dryrun';
      },
    } as unknown as Transform;
    jest.spyOn(tr1.doc, 'nodeAt').mockReturnValue({ type: 'test',attrs:{indent:'1'} } as unknown as Node);
    jest.spyOn(isListNode, 'isListNode').mockReturnValue(true) as unknown as Node;
    const test = setListNodeIndent(state, tr1, mockschema, 0, 1);
    expect(test).toBeTruthy();
  });
});
