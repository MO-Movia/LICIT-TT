/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {schema} from 'prosemirror-schema-basic';
import {EditorState} from 'prosemirror-state';
import {DecorationSet} from 'prosemirror-view';
import {
  CursorPlaceholderPlugin,
  getSingletonInstance,
  resetInstance,
  showCursorPlaceholder,
} from './CursorPlaceholderPlugin';

describe('CursorPlaceholderPlugin real plugin state', () => {
  function createState(): EditorState {
    return EditorState.create({schema, plugins: [getSingletonInstance()]});
  }

  beforeEach(() => {
    resetInstance();
  });

  it('initializes with an empty decoration set', () => {
    const plugin = new CursorPlaceholderPlugin();
    const state = createState();

    expect(plugin.spec.state?.init({schema}, state)).toBe(DecorationSet.empty);
  });

  it('returns mapped decorations when transaction has no cursor action', () => {
    const plugin = new CursorPlaceholderPlugin();
    const state = createState();
    const set = DecorationSet.empty;
    const mapSpy = jest.spyOn(set, 'map');

    const result = plugin.spec.state?.apply.call(
      plugin,
      state.tr,
      set,
      state,
      state
    );

    expect(mapSpy).toHaveBeenCalledWith(state.tr.mapping, state.tr.doc);
    expect(result).toBe(set);
  });

  it('adds and removes the cursor placeholder decoration from metadata', () => {
    const plugin = getSingletonInstance();
    const state = createState();
    let set = DecorationSet.empty;

    const addTr = state.tr.setMeta(plugin, {add: {pos: 1}});
    set = plugin.spec.state?.apply.call(plugin, addTr, set, state, state);

    const found = set.find();
    expect(found).toHaveLength(1);
    expect(found[0].from).toBe(1);

    const removeTr = state.tr.setMeta(plugin, {remove: {}});
    set = plugin.spec.state?.apply.call(plugin, removeTr, set, state, state);

    expect(set.find()).toHaveLength(0);
  });

  it('returns singleton decorations through plugin props', () => {
    const state = createState();
    const decorations = getSingletonInstance().props.decorations as (
      state: EditorState
    ) => DecorationSet | null;

    expect(decorations(state)).toBe(
      getSingletonInstance().getState(state)
    );
  });

  it('shows a cursor placeholder without deleting an empty selection', () => {
    const state = createState();
    const deleteSelectionSpy = jest.spyOn(state.tr, 'deleteSelection');

    showCursorPlaceholder(state);

    expect(deleteSelectionSpy).not.toHaveBeenCalled();
  });
});
