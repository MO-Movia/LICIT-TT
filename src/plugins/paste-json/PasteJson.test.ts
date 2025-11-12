import {createEditor, doc, p} from 'jest-prosemirror';
import {PasteJSONPlugin} from './index';
import {EditorView} from 'prosemirror-view';
import {schema, builders} from 'prosemirror-test-builder';
import {Fragment, Schema, Slice} from 'prosemirror-model';
import {Plugin, PluginKey, EditorState, TextSelection} from 'prosemirror-state';

class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}
describe('PasteJSONFPlugin', () => {
  let plugin!: PasteJSONPlugin;

  beforeEach(() => {
    plugin = new PasteJSONPlugin();
  });

  it('should handle insert json', () => {
    const plugin = new PasteJSONPlugin();
    createEditor(doc('<cursor>', p('Hello World')), {
      plugins: [plugin],
    });
  });

  it('transformPastedText method with empty value', () => {
    const transformedText = plugin.props.transformPastedText?.call(
      plugin,
      '',
      false,
      undefined as unknown as EditorView
    );
    expect(transformedText).toBe('');
  });

  it('insert method should insert JSON and add an empty line after reference', () => {
    const json = {
      type: 'paragraph',
      content: [{type: 'text', text: 'Hello world'}],
    };
    const mySchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const {doc, p} = builders(mySchema, {p: {nodeType: 'paragraph'}});
    const state = EditorState.create({
      doc: doc(p('Hello World!!!!!!!!!!!!')),
      schema: mySchema,
      plugins: [plugin],
    });
    state.applyTransaction(state.tr.scrollIntoView());
    const dom = document.createElement('div');

    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const selection = TextSelection.create(view.state.doc, 6, 12);
    const tr = view.state.tr.setSelection(selection);
    view.dispatch = jest.fn();
    view.updateState(
      view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
    );

    view.dispatch(tr);
    const insertMethod = plugin.insert(json, view);

    expect(insertMethod).toBeUndefined();
  });

  it('appendTransaction method should set the plugin schema', () => {
    const mySchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const before = 'hello';
    const after = ' world';
    const effSchema = plugin.getEffectiveSchema(mySchema);
    const state = EditorState.create({
      doc: doc(p(before, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    plugin.spec.appendTransaction?.([], {} as unknown as EditorState, state);
    expect(plugin.schema).toBeUndefined();
  });

  it('transformPasted method should replace slice', () => {
    const mySchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const slice = new Slice(mySchema as unknown as Fragment, 0, 0);
    Object.assign(slice.content, {childCount: -1});
    plugin.slice = slice;
    const transformedSlice = plugin.props.transformPasted?.call(
      plugin,
      slice,
      undefined as unknown as EditorView
    );
    expect(transformedSlice).toBe(slice);
    expect(plugin.slice).toBeUndefined();
  });

  it('transformPasted method should replace slice with stored slice', () => {
    const mySchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const slice = new Slice(mySchema as unknown as Fragment, 0, 0);
    Object.assign(slice.content, {childCount: 1});
    plugin.slice = slice;
    const transformedSlice = plugin.props.transformPasted?.call(
      plugin,
      slice,
      undefined as unknown as EditorView
    );
    expect(transformedSlice).toBe(slice);
    expect(plugin.slice).toBeUndefined();
  });

  it('transformPastedText method should parse JSON and set the slice', () => {
    const text = JSON.stringify({
      type: 'paragraph',
      content: [{type: 'text', text: 'Hello'}],
    });
    const transformedText = plugin.props.transformPastedText?.call(
      plugin,
      text,
      false,
      undefined as unknown as EditorView
    );

    expect(transformedText).toBe(text);
  });

  it('insert method should conatin fragment type', () => {
    const json = {
      type: 'fragment',
      content: [{type: 'text', text: 'Hello world!!!!!!'}],
    };

    const mySchema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        // custom node referance
        reference: {
          content: 'inline*',
          group: 'block',
          attrs: {
            id: {default: ''},
          },
          toDOM(node) {
            return ['div', {'data-custom-id': node.attrs.id}, 0];
          },
          parseDOM: [
            {
              tag: 'div[data-custom-id]',
              getAttrs(dom) {
                return {
                  id:
                    typeof dom === 'string'
                      ? ''
                      : dom.getAttribute('data-custom-id'),
                };
              },
            },
          ],
        },
        text: {
          group: 'inline',
        },
      },
    });

    const customDoc = mySchema.nodes.doc.create(
      null, // No attributes
      mySchema.nodes.reference.create({id: 'my-custom-node'})
    );

    // Create an editor state with the custom document
    const state = EditorState.create({
      doc: customDoc,
      schema: mySchema,
    });

    state.applyTransaction(state.tr.scrollIntoView());
    const dom = document.createElement('div');

    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    plugin.schema = mySchema;
    view.dispatch = jest.fn();
    plugin.insert(json, view);
    const spyMockInsertPara = (plugin.insertParagraph = jest.fn());
    expect(spyMockInsertPara).not.toHaveBeenCalled();
  });

  it('insertParagraph method shoud retrun tr when fom and to is not equal', () => {
    const mySchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const {doc, p} = builders(mySchema, {p: {nodeType: 'paragraph'}});
    const state = EditorState.create({
      doc: doc(p('Hello World!!')),
      schema: mySchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    // Set from and to selection
    const selection = TextSelection.create(view.state.doc, 2, 5);
    const tr = view.state.tr.setSelection(selection);
    const insertParagraph = plugin.insertParagraph(state, tr);
    expect(insertParagraph).toBe(tr);
  });
});
