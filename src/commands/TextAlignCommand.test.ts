import { TextAlignCommand, setTextAlign } from './TextAlignCommand';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-test-builder';
import { Transform } from 'prosemirror-transform';
import { CellSelection,tableNodes } from 'prosemirror-tables';

describe('TextAlignCommand', () => {
  let plugin!: TextAlignCommand;
  let schema1;
  let command: TextAlignCommand;
  let dispatch: jest.Mock;
  beforeEach(() => {
    plugin = new TextAlignCommand('left');
    schema1 = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    command = new TextAlignCommand('right');
    dispatch = jest.fn();
  });
  it('should create', () => {
    expect(plugin).toBeTruthy();
  });

  it('should be isEnabled method true', () => {
    const state = {
      selection: { to: 2, from: 1 },
      schema: { nodes: {} },
      doc: {
        nodesBetween: (_x, _y, _z: (a, b) => { return }) => {
          return;
        },
      },
      tr: {
        setSelection: (_selection) => {
          return true;
        },
      },
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);

    expect(test).toBeTruthy();
  });
  it('should check the condition (keepLooking && node.attrs.align === this._alignment)', () => {
    const mySchema = new Schema({
      nodes: {
        doc: {
          attrs: { lineSpacing: { default: 'test' } },
          content: 'block+',
        },
        paragraph: {
          attrs: { lineSpacing: { default: 'test' }, align: { default: null } },
          content: 'text*',
          group: 'block',
        },
        heading: {
          attrs: { lineSpacing: { default: 'test' }, align: { default: null } },
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

    const dummyDoc = mySchema.node('doc', { align: 'left' }, [
      mySchema.node('heading', { lineSpacing: 'test', align: 'left' }, [
        mySchema.text('Heading 1'),
      ]),
      mySchema.node('paragraph', { lineSpacing: 'test', align: 'left' }, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', { lineSpacing: 'test' }, [
        mySchema.node('list_item', { lineSpacing: 'test' }, [
          mySchema.node('paragraph', { lineSpacing: 'test' }, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', { lineSpacing: 'test' }, [
          mySchema.node('paragraph', { lineSpacing: 'test' }, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', { lineSpacing: 'test' }, [
        mySchema.node('paragraph', { lineSpacing: 'test' }, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);

    const state = {
      doc: dummyDoc,
      selection: { from: 0, to: 1 },
    } as unknown as EditorState;
    command._alignment = 'left';
    expect(command.isActive(state)).toBeTruthy();
  });

  it('expect function should be return false ', () => {
    const state = undefined as unknown as EditorState;
    const test = plugin.isEnabled(state);
    expect(test).toBeFalsy();
  });

  it('should enable the command when text align is enabled', () => {
    const state = EditorState.create({ schema: schema1 });
    const isEnabled = command.isActive(state);
    expect(isEnabled).toBe(false);
  });

  it('execute with dispatch', () => {
    const state = EditorState.create({ schema: schema1 });
    const test = command.execute(state, dispatch);
    expect(test).toBeTruthy();
  });
  it('execute without dispatch', () => {
    const state = EditorState.create({ schema: schema1 });
    const test = command.execute(state);
    expect(test).toBeTruthy();
  });
  it('should execute without doc changes', () => {
    const dispatchMock = jest.fn();

    const state = {
      selection: {},
      tr: {
        setSelection: jest.fn().mockReturnThis(),
        docChanged: false,
      },
      schema: {},
    } as unknown as EditorState;

    const result = plugin.execute(state, dispatchMock);

    expect(dispatchMock).not.toHaveBeenCalled();

    expect(result).toBe(false);
  });

  it('should handle execute when selection.$head.parent.attrs.align !== this._alignment', () => {
    plugin._alignment = 'right';
    const test = plugin.execute({ schema: {}, selection: { $head: { parent: { attrs: { align: 'left' } } } }, tr: { setSelection: () => { return {}; } } } as unknown as EditorState);
    expect(test).toBeDefined();
  });

  it('should handle executecustom', () => {
    jest
      .spyOn(TextSelection, 'create')
      .mockReturnValue({} as unknown as TextSelection);
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
      },
      plugins: [],
      schema: { nodes: {} },
      tr: {
        doc: {
          nodeAt: () => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;
    const tr = {
      setSelection: () => {
        return {};
      },
      doc: {},
    } as unknown as Transform;
    const test = plugin.executeCustom(state, tr, 0, 1);
    expect(test).toBeDefined();
  });
  it('should handle executecustom without alignment', () => {
    jest
      .spyOn(TextSelection, 'create')
      .mockReturnValue({} as unknown as TextSelection);
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
      },
      plugins: [],
      schema: { nodes: {} },
      tr: {
        doc: {
          nodeAt: () => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;
    const tr = {
      setSelection: () => {
        return {};
      },
      doc: {},
    } as unknown as Transform;
    plugin._alignment = '';
    const test = plugin.executeCustom(state, tr, 0, 1);
    expect(test).toBeDefined();
  });
  it('should not render label', () => {
    expect(command.renderLabel()).toBeNull();
  });

  it('should handle setTextAlign', () => {
    const test = setTextAlign({ selection: {} as unknown as CellSelection, doc: { nodesBetween: () => { return {}; } } } as unknown as Transform, { nodes: { 'blockquote': null, 'heading': null, 'paragraph': null } } as unknown as Schema);
    expect(test).toBeDefined();
  });
    it('should handle setTextAlign when align !== alignment && allowedNodeTypes.has(nodeType)', () => {
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

    const test = setTextAlign({ selection: {from:0,to:6} as unknown as CellSelection,setNodeMarkup:()=>{return {};},
       doc: doc } as unknown as Transform,
        { nodes: { 'blockquote': null, 'heading': null, 'paragraph': schema.nodes.paragraph } } as unknown as Schema,'left');
    expect(test).toBeDefined();
  });
  it('should handle setTextAlign when selection instance of cellselection', () => {
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
    const test = setTextAlign({ selection: selection, doc: doc } as unknown as Transform, { nodes: { 'blockquote': null, 'heading': null, 'paragraph': null } } as unknown as Schema);
    expect(test).toBeDefined();
  });
  it('should handle setTextAlign when selection instance of cellselection when alignment not null', () => {
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
    const test = setTextAlign({ selection: selection, doc: doc,setNodeMarkup:()=>{return {};} } as unknown as Transform,
      { nodes: { 'blockquote': {}, 'heading': {},
       'paragraph': schema.nodes.paragraph} } as unknown as Schema,'left');
    expect(test).toBeDefined();
  });
});
