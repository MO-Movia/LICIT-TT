/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

import {
  EditorState,
  Plugin,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import {schema} from 'prosemirror-schema-basic';
import {DOMParser} from 'prosemirror-model';
import {EditorView} from 'prosemirror-view';

type SelectionPlaceholderModule = typeof import('./selectionPlaceholderPlugin');

describe('SelectionPlaceholderPlugin', () => {
  let view: EditorView;
  let SelectionPlaceholderPlugin: SelectionPlaceholderModule['default'];
  let showSelectionPlaceholder: SelectionPlaceholderModule['showSelectionPlaceholder'];
  let hideSelectionPlaceholder: SelectionPlaceholderModule['hideSelectionPlaceholder'];

  beforeEach(() => {
    jest.resetModules();
    ({
      default: SelectionPlaceholderPlugin,
      showSelectionPlaceholder,
      hideSelectionPlaceholder,
    } = require('./selectionPlaceholderPlugin') as SelectionPlaceholderModule);

    const content = document.createElement('div');
    content.innerHTML = '<p>Hello World</p>';

    const doc = DOMParser.fromSchema(schema).parse(content);

    const state = EditorState.create({
      doc,
      schema,
      plugins: [new SelectionPlaceholderPlugin()],
    });

    const el = document.createElement('div');
    document.body.appendChild(el);

    view = new EditorView(el, {
      state,
    });
  });

  afterEach(() => {
    view.destroy();
  });

  it('should initialize plugin with empty decoration set', () => {
    const plugin = view.state.plugins.find(
      (p) => p instanceof SelectionPlaceholderPlugin
    ) as Plugin;

    const pluginState = plugin.getState(view.state);
    expect(pluginState.find()).toHaveLength(0);
  });

  it('should add a selection placeholder decoration', () => {
    const {state} = view;
    const {tr} = state;

    const newTr = showSelectionPlaceholder(state, tr) as Transaction;
    newTr.getMeta = jest.fn().mockReturnValue({add: {from: 1, to: 5}});
    const plugin = view.state.plugins.find(
      (p) => p instanceof SelectionPlaceholderPlugin
    ) as Plugin;

    const nextState = state.apply(newTr);
    const decorations = plugin.getState(nextState);

    expect(decorations.find()).toHaveLength(1);
    const deco = decorations.find()[0];
    expect(deco.spec.id.name).toBe('SelectionPlaceholderPlugin');
    expect(deco.type.attrs.class).toBe('czi-selection-placeholder');
  });
  it('should add a selection placeholder when selection is created', () => {
    const {state} = view;
    const selection = TextSelection.create(state.doc, 1, 5);
    const tr = state.tr.setSelection(selection);

    const newTr = showSelectionPlaceholder(state, tr) as Transaction;
    const plugin = view.state.plugins.find(
      (p) => p instanceof SelectionPlaceholderPlugin
    ) as Plugin;

    const nextState = state.apply(newTr);
    const decorations = plugin.getState(nextState);

    expect(decorations.find()).toHaveLength(1);
    const deco = decorations.find()[0];
    expect(deco.spec.id.name).toBe('SelectionPlaceholderPlugin');
    expect(deco.type.attrs.class).toBe('czi-selection-placeholder');
  });
  it('Selection should be empty if set not provided', () => {
    const {state} = view;
    const {tr} = state;

    const newTr = showSelectionPlaceholder(state, tr) as Transaction;
    newTr.getMeta = jest.fn().mockReturnValue({remove: jest.fn()});
    const plugin = view.state.plugins.find(
      (p) => p instanceof SelectionPlaceholderPlugin
    ) as Plugin;

    const nextState = state.apply(newTr);
    const decorations = plugin.getState(nextState);
    expect(decorations.find()).toHaveLength(0);
  });

  it('should not add placeholder if selection is empty', () => {
    const emptyTr = view.state.tr.setSelection(view.state.selection);
    const newTr = showSelectionPlaceholder(view.state, emptyTr) as Transaction;
    expect(
      newTr.getMeta(SelectionPlaceholderPlugin as unknown as Plugin)
    ).toBeUndefined();
  });

  it('should remove a selection placeholder decoration', () => {
    const {state} = view;
    let tr = showSelectionPlaceholder(state, state.tr) as Transaction;
    const plugin = view.state.plugins.find(
      (p) => p instanceof SelectionPlaceholderPlugin
    ) as Plugin;

    const nextState = state.apply(tr);
    const withPlaceholder = EditorState.create({
      schema,
      doc: nextState.doc,
      plugins: [plugin],
    });

    tr = hideSelectionPlaceholder(
      withPlaceholder,
      withPlaceholder.tr
    ) as Transaction;
    const finalState = withPlaceholder.apply(tr);

    const decorations = plugin.getState(finalState);
    expect(decorations.find()).toHaveLength(0);
  });

  it('should hide placeholder decoration', () => {
    const {state} = view;
    const selection = TextSelection.create(state.doc, 1, 5);
    const tr = state.tr.setSelection(selection);

    const newTr = showSelectionPlaceholder(state, tr) as Transaction;

    const plugin = view.state.plugins.find(
      (p) => p instanceof SelectionPlaceholderPlugin
    ) as Plugin;

    const nextState = state.apply(newTr);
    const result = hideSelectionPlaceholder(
      nextState,
      nextState.tr
    ) as Transaction;

    // Safely assert meta with known shape
    const meta = result.getMeta(plugin) as {remove?: unknown};

    expect(meta.remove).toBeDefined();
  });

  it('Should return same tr if plugin is not available', () => {
    const {state} = view;

    const stateWithoutPlugin = EditorState.create({
      doc: state.doc,
      schema,
    });

    const selection = TextSelection.create(stateWithoutPlugin.doc, 1, 5);
    const tr = stateWithoutPlugin.tr.setSelection(selection);

    const newTr = showSelectionPlaceholder(
      stateWithoutPlugin,
      tr
    ) as Transaction;
    expect(newTr).toBe(tr);
  });

  it('Should state tr if tr is null for showSelectionPlaceholder', () => {
    const {state} = view;

    const stateWithoutPlugin = EditorState.create({
      doc: state.doc,
      schema,
    });

    const newTr = showSelectionPlaceholder(stateWithoutPlugin) as Transaction;
    expect(newTr.doc).toEqual(stateWithoutPlugin.tr.doc);
    expect(newTr.steps).toHaveLength(0);
    expect(newTr.selection.from).toBe(stateWithoutPlugin.tr.selection.from);
    expect(newTr.selection.to).toBe(stateWithoutPlugin.tr.selection.to);
  });

  it('should be a singleton plugin', () => {
    const firstInstance = new SelectionPlaceholderPlugin();
    const secondInstance = new SelectionPlaceholderPlugin();
    expect((firstInstance as any).spec.key).toBe((secondInstance as any).spec.key);
  });
});
