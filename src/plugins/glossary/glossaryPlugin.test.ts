/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {cache, updateCache} from './glossaryView';
import {GlossaryCommand} from './glossaryCommand';
import type {IndexItem} from './types';
import {GlossaryNodeSpec} from './glossaryNodeSpec';
import {schema, builders} from 'prosemirror-test-builder';
import {Schema} from 'prosemirror-model';
import {EditorState, TextSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {createEditor, doc, p} from 'jest-prosemirror';

describe('Glossary Helpers', () => {
  const runtime = {
    glossaryService: {
      openManagementDialog: (): Promise<IndexItem | null> => {
        return Promise.resolve(null);
      },
    },
  };

  const buildSchema = () =>
    new Schema({
      nodes: schema.spec.nodes.addToEnd('glossary', GlossaryNodeSpec),
      marks: schema.spec.marks,
    });

  beforeEach(() => {
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
  });

  it('should init cache from array', () => {
    const id = 'cacheA';
    updateCache([{id, term: id, definition: id}]);
    expect(cache[id]).toBeDefined();
  });

  it('should init cache from promise', async () => {
    const id = 'cacheP';
    const promise = Promise.resolve([{id, term: id, definition: id}]);
    updateCache(promise);
    await promise;
    expect(cache[id]).toBeDefined();
  });

  it('should executeWithUserInput', () => {
    const effSchema = buildSchema();
    const {doc: pmDoc, p: para} = builders(effSchema, {
      p: {nodeType: 'paragraph'},
    });
    const state = EditorState.create({
      doc: pmDoc(para('Hello')),
      schema: effSchema,
    });
    const dom = document.createElement('div');
    const view = new EditorView({mount: dom}, {state});

    const selection = TextSelection.create(view.state.doc, 1, 2);
    const tr = view.state.tr.setSelection(selection);
    view.dispatch(tr);

    const cmd = new GlossaryCommand(runtime);
    const item: IndexItem = {
      id: 'test',
      term: 'term',
      definition: 'def',
      description: 'desc',
    };

    const ok = cmd.executeWithUserInput(
      view.state,
      view.dispatch,
      view,
      item
    );
    expect(ok).toBeTruthy();
  });

  it('should Wait For User Input', async () => {
    const editor = createEditor(doc('<cursor>', p('Hello')));
    const dom = document.createElement('div');
    const view = new EditorView({mount: dom}, {state: editor.state});

    const glossaryCmd = new GlossaryCommand(runtime);
    const result = await glossaryCmd.waitForUserInput(
      editor.state,
      undefined,
      view
    );
    expect(result).toBeNull();
  });

  it('should return false when selection is empty doc', () => {
    const effSchema = buildSchema();
    const {doc: pmDoc} = builders(effSchema, {});
    const state = EditorState.create({doc: pmDoc(), schema: effSchema});

    const glossaryCmd = new GlossaryCommand(runtime);
    const result = glossaryCmd.isEnabled(state);
    expect(result).toBeFalsy();
  });
});
