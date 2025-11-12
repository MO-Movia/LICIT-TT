import {BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH} from './NodeNames';
import {TextLineSpacingCommand,setTextLineSpacing} from './TextLineSpacingCommand';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {schema} from 'prosemirror-schema-basic';
import {Schema} from 'prosemirror-model';

describe('TextLineSpacingCommand', () => {
  let plugin!: TextLineSpacingCommand;
  let schema1;
  let command: TextLineSpacingCommand;
  let dispatch: jest.Mock;
  beforeEach(() => {
    plugin = new TextLineSpacingCommand('tab');
    schema1 = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    command = new TextLineSpacingCommand('right');
    dispatch = jest.fn();
  });
  it('should create', () => {
    expect(plugin).toBeTruthy();
  });

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

  // Create a dummy document using the defined schema
  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('heading', {lineSpacing: 'test'}, [
      mySchema.text('Heading 1'),
    ]),
    mySchema.node('paragraph', {lineSpacing: 'test'}, [
      mySchema.text('This is a paragraph'),
    ]),
    mySchema.node('bullet_list', {lineSpacing: 'test'}, [
      mySchema.node('list_item', {lineSpacing: 'test'}, [
        mySchema.node('paragraph', {lineSpacing: 'test'}, [
          mySchema.text('List item 1'),
        ]),
      ]),
      mySchema.node('list_item', {lineSpacing: 'test'}, [
        mySchema.node('paragraph', {lineSpacing: 'test'}, [
          mySchema.text('List item 2'),
        ]),
      ]),
    ]),
    mySchema.node('blockquote', {lineSpacing: 'test'}, [
      mySchema.node('paragraph', {lineSpacing: 'test'}, [
        mySchema.text('This is a blockquote'),
      ]),
    ]),
  ]);

  it('should enable the command when text align is enabled', () => {
    const state = EditorState.create({schema: schema1});
    const isEnabled = command.isActive(state);
    expect(isEnabled).toBe(false);
  });

  it('execute', () => {
    const state = EditorState.create({schema: schema1});
    command._lineSpacing = undefined;
    const test = command.execute(state, dispatch);
    expect(test).toBeDefined();
  });

  it('should be check condition !selection', () => {
    const state = {
      selection: {to: 2, from: 1},
      schema: {nodes: {heading: HEADING, paragraph: PARAGRAPH}},
      doc: {
        nodesBetween: (_x, _y, _z: (a, b) => {return}) => {
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

    expect(test).toBeFalsy();
  });
  it('should be check condition !selection', () => {
    const state = {
      selection: {to: 2, from: 1},
      schema: {nodes: {heading: HEADING, paragraph: PARAGRAPH}},
      doc: {
        nodesBetween: (_x, _y, _z: (a, b) => {return}) => {
          return;
        },
      },
      tr: {
        setSelection: (_selection) => {
          return true;
        },
      },
    } as unknown as EditorState;
    plugin._lineSpacing = null;
    plugin.isActive = ()=>{return null;};

    const test = plugin.isEnabled(state);

    expect(test).toBeFalsy();
  });

  it('should be check condition !doc', () => {
    const state = {
      selection: {to: 2, from: 1},
      schema: {
        nodes: {
          heading: undefined,
          paragraph: undefined,
          list_item: undefined,
          blockquote: undefined,
        },
      },
      doc: {
        nodesBetween: (_x, _y, _z: (a, b) => {return}) => {
          return;
        },
      },
      tr: {
        setSelection: (_selection) => {
          return {
            doc: {
              nodesBetween: (_x, _y, _z: (a, b) => {return}) => {
                return;
              },
            },
            selection: {from: 1, to: 2},
          };
        },
      },
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);

    expect(test).toBe(false);
  });

  it('should be check the condition docChanged:false', () => {
    const state = {
      selection: {to: 2, from: 1},
      schema: {
        nodes: {
          heading: HEADING,
          paragraph: PARAGRAPH,
          list_item: LIST_ITEM,
          blockquote: BLOCKQUOTE,
        },
      },
      doc: {
        nodesBetween: (_x, _y, _z: (a, b) => {return}) => {
          return;
        },
      },
      tr: {
        setSelection: (_selection) => {
          return {doc: dummyDoc, selection: {from: 1, to: 2}};
        },
      },
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);

    expect(test).toBeFalsy();
  });

  it('should be check the condition docChanged:true', () => {
    const state = EditorState.create({schema: schema1});
    const test = plugin.isEnabled(state);

    expect(test).toBeTruthy();
  });

  it('should not render label', () => {
    expect(command.renderLabel()).toBeNull();
  });

  it('should execute custom', () => {
    expect(
      command.executeCustom(
        null as unknown as EditorState,
        null as unknown as Transform
      )
    ).toBeNull();
  });

  it('should create group', () => {
    expect(TextLineSpacingCommand.createGroup().length).toBe(1);
  });
  it('should handle isActive ',()=>{
    command._lineSpacing = '2.0'; // Change this to test different values
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          attrs: { lineSpacing: { default: '2.0' } }, // Add lineSpacing attribute
          parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ lineSpacing: dom.getAttribute('lineSpacing') || '2.0' }) }],
          toDOM: (node) => ['p', { lineSpacing: node.attrs.lineSpacing }, 0],
        },
        heading: {
          content: 'text*',
          group: 'block',
          attrs: { level: { default: 1 }, lineSpacing: { default: '2.0' } },
          parseDOM: [{ tag: 'h1', getAttrs: (dom) => ({ lineSpacing: dom.getAttribute('lineSpacing') || '2.0' }) }],
          toDOM: (node) => ['h1', { lineSpacing: node.attrs.lineSpacing }, 0],
        },
        text: { group: 'inline' },
      },
    });

    // Define `_lineSpacing` value that should match nodes


    // ProseMirror JSON Document (Matching All Conditions)
    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineSpacing: '2.0' },
          content: [{ type: 'text', text: 'First paragraph (wrong lineSpacing)' }],
        },
        {
          type: 'heading',
          attrs: { level: 1, lineSpacing: '2.0' },
          content: [{ type: 'text', text: 'Heading with correct lineSpacing' }],
        },
        {
          type: 'paragraph',
          attrs: { lineSpacing: '2.0' },
          content: [{ type: 'text', text: 'Paragraph with correct lineSpacing' }],
        },
      ],
    };

    // Convert JSON into a ProseMirror Node
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    expect(command.isActive({selection:{from:0,to:25},doc:docNode,schema:mySchema} as unknown as EditorState)).toBeTruthy();
  });
  it('should handle isActive ',()=>{
    command._lineSpacing = '2.0'; // Change this to test different values
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        heading: {
          content: 'text*',
          group: 'block',
          attrs: { level: { default: 1 }, lineSpacing: { default: '2.0' } },
          parseDOM: [{ tag: 'h1', getAttrs: (dom) => ({ lineSpacing: dom.getAttribute('lineSpacing') || '2.0' }) }],
          toDOM: (node) => ['h1', { lineSpacing: node.attrs.lineSpacing }, 0],
        },
        text: { group: 'inline' },
      },
    });

    // Define `_lineSpacing` value that should match nodes


    // ProseMirror JSON Document (Matching All Conditions)
    const jsonDoc = {
      type: 'doc',
      content: [

        {
          type: 'heading',
          attrs: { level: 1, lineSpacing: '2.0' },
          content: [{ type: 'text', text: 'Heading with correct lineSpacing' }],
        },

      ],
    };

    // Convert JSON into a ProseMirror Node
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    expect(command.isActive({selection:{from:0,to:25},doc:docNode,schema:mySchema} as unknown as EditorState)).toBeTruthy();
  });
  it('should handle setTextLineSpacing',()=>{
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        heading: {
          content: 'text*',
          group: 'block',
          attrs: { level: { default: 1 }, lineSpacing: { default: '2.0' } },
          parseDOM: [{ tag: 'h1', getAttrs: (dom) => ({ lineSpacing: dom.getAttribute('lineSpacing') || '2.0' }) }],
          toDOM: (node) => ['h1', { lineSpacing: node.attrs.lineSpacing }, 0],
        },
        text: { group: 'inline' },
      },
    });
    const tr=  {
      setSelection: (_selection) => {
        return {doc: dummyDoc, selection: {from: 1, to: 2}};
      },
    } as unknown as Transform;
    expect(setTextLineSpacing(tr,mySchema,null!)).toBeTruthy();
  });
});
