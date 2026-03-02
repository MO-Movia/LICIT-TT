/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import type {IndexItem} from './index';
import {cache, GlossaryPlugin} from './index';
import {schema, builders} from 'prosemirror-test-builder';
import {Schema} from 'prosemirror-model';
import {EditorState, TextSelection, Plugin, PluginKey} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {GlossaryCommand} from './glossaryCommand';
import type {Transform} from 'prosemirror-transform';
import {createEditor} from 'jest-prosemirror';

class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}
describe('GlossaryPlugin', () => {
  let plugin: GlossaryPlugin;
  const runtime = {
    glossaryService: {
      openManagementDialog: (): Promise<null> => {
        return Promise.resolve(null);
      },
    },
  };

  beforeEach(() => {
    plugin = new GlossaryPlugin(runtime);
  });

  describe('getEffectiveSchema', () => {
    it('should add a glossary node to the schema', () => {
      const mySchema = new Schema({
        nodes: schema.spec.nodes,
        marks: schema.spec.marks,
      });
      const effSchema = plugin.getEffectiveSchema(mySchema);
      plugin.initButtonCommands('dark');
      expect(effSchema.spec.nodes).toBeDefined();
    });
  });

  it('should init cache from array', () => {
    const id = 'cacheA';
    expect(cache[id]).toBeUndefined();
    const p = new GlossaryPlugin({
      ...runtime,
      cache: [{id, term: id, definition: id}],
    });
    expect(p).toBeTruthy();
    expect(cache[id]).toBeDefined();
  });
  it('should init cache from promise', async () => {
    const id = 'cacheP';
    expect(cache[id]).toBeUndefined();
    const promise = Promise.resolve([{id, term: id, definition: id}]);
    const p = new GlossaryPlugin({
      ...runtime,
      cache: promise,
    });
    await promise;
    expect(p).toBeTruthy();
    expect(cache[id]).toBeDefined();
  });
  describe('initKeyCommands', () => {
    it('should executeWithUserInput', () => {
      const modSchema = new Schema({
        nodes: schema.spec.nodes,
        marks: schema.spec.marks,
      });
      const glossary = {
        from: 0,
        to: 9,
        type: 1,
        id: 1,
        description: 'Test description',
        term: 'term',
      };
      const effSchema = plugin.getEffectiveSchema(modSchema);
      const {doc, p} = builders(effSchema, {p: {nodeType: 'paragraph'}});

      const state = EditorState.create({
        doc: doc(p(glossary)),
        schema: effSchema,
      });
      const dom = document.createElement('div');
      document.body.appendChild(dom);
      // Set up our document body
      document.body.innerHTML = '<div></div>';
      const view = new EditorView(
        {mount: dom},
        {
          state: state,
        }
      );

      const selection = TextSelection.create(view.state.doc, 1, 2);
      const tr = view.state.tr.setSelection(selection);
      view.updateState(
        view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
      );

      view.dispatch(tr);
      const glossaryCmd = new GlossaryCommand(runtime);
      expect(glossaryCmd.isEnabled(view.state, view)).toBeFalsy();

      const mockGlossaryObj: IndexItem = {
        id: 'test',
        description: 'Test description',
        definition: 'Test definition',
        term: 'term',
      };
      const test = glossaryCmd.executeWithUserInput(
        state,
        undefined,
        view,
        mockGlossaryObj
      );
      expect(test).toBeTruthy();
      const bok = glossaryCmd.executeWithUserInput(
        state,
        view.dispatch as (tr: Transform) => void,
        view,
        mockGlossaryObj
      );
      expect(bok).toBeTruthy();
    });
    it('should Wait For User Input', async () => {
      const modSchema = new Schema({
        nodes: schema.spec.nodes,
        marks: schema.spec.marks,
      });
      const glossaryObj = {
        from: 0,
        to: 9,
        type: 1,
        id: 1,
        description: 'Test description',
        term: 'term',
      };

      const effSchema = plugin.getEffectiveSchema(modSchema);
      const {doc, p} = builders(effSchema, {p: {nodeType: 'paragraph'}});
      const state = EditorState.create({
        doc: doc(p(glossaryObj)),
        schema: effSchema,
      });

      const dom = document.createElement('div');
      document.body.appendChild(dom);
      const view = new EditorView(
        {mount: dom},
        {
          state: state,
        }
      );
      const editor = createEditor(doc('<cursor>', p('Hello')));
      const glossaryCmd = new GlossaryCommand(runtime);
      const _test = await glossaryCmd.waitForUserInput(
        editor.state,
        undefined,
        view
      );
      expect(_test).toBeFalsy();
    });
    it('should _isEnabled function return false', () => {
      const glossaryCmd = new GlossaryCommand(runtime);
      const modSchema = new Schema({
        nodes: schema.spec.nodes,
        marks: schema.spec.marks,
      });
      const effSchema = plugin.getEffectiveSchema(modSchema);
      const {doc} = builders(effSchema, {});
      const state = EditorState.create({
        doc: doc(),
      });
      const _test = glossaryCmd.isEnabled(state);
      expect(_test).toBeFalsy();
    });
    it('should call initKeyCommands', () => {
      expect(plugin.initKeyCommands()).toBeDefined();
    });
  });
});
