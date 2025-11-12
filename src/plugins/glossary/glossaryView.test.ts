import {GlossaryPlugin} from './index';
import {schema, builders} from 'prosemirror-test-builder';
import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {Schema} from 'prosemirror-model';
import {GlossaryView} from './glossaryView';

describe('Glossary Plugin Extended', () => {
  const glossary = {
    from: 0,
    to: 9,
    type: 1,
    id: 1,
    description: 'Test description',
    term: 'term',
  };

  const mySchema = new Schema({
    nodes: schema.spec.nodes,
    marks: schema.spec.marks,
  });
  const plugin = new GlossaryPlugin({
    glossaryService: {
      openManagementDialog: (): Promise<null> => {
        return Promise.resolve(null);
      },
    },
  });
  const effSchema = plugin.getEffectiveSchema(mySchema);

  const newGlossaryNode = effSchema.node(effSchema.nodes.glossary, glossary);
  const {doc, p} = builders(mySchema, {p: {nodeType: 'paragraph'}});
  let gView: GlossaryView;
  beforeEach(() => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newGlossaryNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    gView = new GlossaryView(view.state.doc.nodeAt(6)!, view);
  });

  it('should require toDom defined', () => {
    expect(gView.ignoreMutation()).toBeTruthy();
  });

  it('should ignore mutations', () => {
    expect(() => new GlossaryView(null!, null!)).toThrow();
  });

  it('update should return true', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newGlossaryNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const gView = new GlossaryView(view.state.doc.nodeAt(6)!, view);

    gView['node'].sameMarkup(gView['node']);
    expect(gView.update(gView['node'])).toBe(true);
  });

  it('should return false when node markup is the same', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newGlossaryNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    gView = new GlossaryView(view.state.doc.nodeAt(6)!, view);
    const node = view.state.doc.nodeAt(0)!;
    expect(gView.update(node)).toBe(false);
  });

  it('stopEvent should return false', () => {
    expect(gView.stopEvent(null!)).toBe(false);
  });
});
