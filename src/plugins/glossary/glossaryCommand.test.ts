/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {GlossaryCommand} from './glossaryCommand';
import type {IndexItem} from './types';
import {GlossaryNodeSpec} from './glossaryNodeSpec';
import {schema, builders} from 'prosemirror-test-builder';
import {EditorState, TextSelection} from 'prosemirror-state';
import {Schema} from 'prosemirror-model';
import {EditorView} from 'prosemirror-view';
import type {Transform} from 'prosemirror-transform';

describe('GlossaryCommand', () => {
  const runtime = {
    glossaryService: {
      openManagementDialog: (): Promise<null> => {
        return Promise.resolve(null);
      },
    },
  };

  const buildSchema = () =>
    new Schema({
      nodes: schema.spec.nodes.addToEnd('glossary', GlossaryNodeSpec),
      marks: schema.spec.marks,
    });

  it('should deleteGlossaryNode', () => {
    const effSchema = buildSchema();
    const {doc, p} = builders(effSchema, {p: {nodeType: 'paragraph'}});
    const state = EditorState.create({
      doc: doc(p('term')),
      schema: effSchema,
    });

    const gm = new GlossaryCommand(runtime);
    expect(gm.deleteGlossaryNode(state, 'term')).toBeDefined();
  });

  it('should executeWithUserInput using selection', () => {
    const effSchema = buildSchema();
    const {doc, p} = builders(effSchema, {p: {nodeType: 'paragraph'}});
    const state = EditorState.create({
      doc: doc(p('term')),
      schema: effSchema,
    });

    const dom = document.createElement('div');
    const view = new EditorView({mount: dom}, {state});
    const selection = TextSelection.create(view.state.doc, 1, 2);
    view.dispatch(view.state.tr.setSelection(selection));

    const glossaryCmd = new GlossaryCommand(runtime);
    const item: IndexItem = {
      id: '1',
      term: 'dig',
      definition: 'trio',
    };
    expect(
      glossaryCmd.executeWithUserInput(view.state, view.dispatch, view, item)
    ).toBe(true);
  });

  it('getSelectedText() returns the selected text in the editor view', () => {
    const effSchema = buildSchema();
    const {doc, p} = builders(effSchema, {p: {nodeType: 'paragraph'}});
    const state = EditorState.create({
      doc: doc(p('hello world')),
      schema: effSchema,
    });
    const dom = document.createElement('div');
    const view = new EditorView({mount: dom}, {state});

    const selection = TextSelection.create(view.state.doc, 1, 6);
    view.dispatch(view.state.tr.setSelection(selection));

    const gm = new GlossaryCommand(runtime);
    const selectedText = gm.getSelectedText(view);
    expect(selectedText).toBe('hello world');
  });

  it('should wait for user input without runtime', async () => {
    const gm = new GlossaryCommand();
    const mockState = {} as unknown as EditorState;
    expect(await gm.waitForUserInput(mockState)).toBeFalsy();
  });

  it('should render label', () => {
    const gm = new GlossaryCommand(runtime);
    expect(gm.renderLabel()).toBeNull();
  });

  it('should be active', () => {
    const gm = new GlossaryCommand(runtime);
    expect(gm.isActive()).toBeFalsy();
  });

  it('should execute custom', () => {
    const gm = new GlossaryCommand(runtime);
    const mockState = {} as unknown as EditorState;
    const mockTr = {} as unknown as Transform;
    expect(gm.executeCustom(mockState, mockTr)).toBe(mockTr);
  });

  it('should not execute null', () => {
    const gm = new GlossaryCommand(runtime);
    expect(gm.executeWithUserInput(null!)).toBeFalsy();
  });

  it('should execute cancel without errors', () => {
    const gm = new GlossaryCommand(runtime);
    expect(() => gm.cancel()).not.toThrow();
  });
});
