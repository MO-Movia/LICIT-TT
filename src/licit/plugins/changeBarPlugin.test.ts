/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { schema } from 'prosemirror-schema-basic';
import { EditorState } from 'prosemirror-state';
import { Decoration, EditorView } from 'prosemirror-view';
import ChangeBarPlugin, {
  CHANGE_BAR_RANGE_CLASS,
  type ChangeBarTestApi,
  addChangeBarRanges,
  changeBarPluginKey,
  clearChangeBars,
  createChangeBarDecorations,
  setChangeBarRanges,
} from './changeBarPlugin';

function createDoc(text = 'Hello World') {
  return schema.node('doc', null, [
    schema.nodes.paragraph.create(null, schema.text(text)),
  ]);
}

function createState(text = 'Hello World'): EditorState {
  return EditorState.create({
    doc: createDoc(text),
    schema,
    plugins: [new ChangeBarPlugin()],
  });
}

function createStateWithPlugin(
  plugin: ChangeBarPlugin,
  text = 'Hello World'
): EditorState {
  return EditorState.create({
    doc: createDoc(text),
    schema,
    plugins: [plugin],
  });
}

function getDecorationClass(decoration: Decoration): string {
  return (decoration as unknown as { type: { attrs: { class: string } } }).type
    .attrs.class;
}

describe('ChangeBarPlugin', () => {
  let view: EditorView | null = null;

  afterEach(() => {
    view?.destroy();
    view = null;
  });

  it('initializes with no changed ranges or decorations', () => {
    const state = createState();
    const pluginState = changeBarPluginKey.getState(state);

    expect(pluginState?.changedRanges).toHaveLength(0);
    expect(pluginState?.decorations.find()).toHaveLength(0);
  });

  it('initializes with optional test ranges', () => {
    const state = createStateWithPlugin(
      new ChangeBarPlugin({ testRanges: [[1, 6]] })
    );
    const pluginState = changeBarPluginKey.getState(state);

    expect(pluginState?.changedRanges).toEqual([{ from: 1, to: 6 }]);
    expect(pluginState?.decorations.find()).toHaveLength(1);
  });

  it('does not infer changed ranges from typed text', () => {
    const state = createState();
    const nextState = state.apply(state.tr.insertText(' updated', 6));
    const pluginState = changeBarPluginKey.getState(nextState);

    expect(pluginState?.changedRanges).toHaveLength(0);
    expect(pluginState?.decorations.find()).toHaveLength(0);
  });

  it('does not infer changed ranges from mark changes', () => {
    const state = createState();
    const nextState = state.apply(
      state.tr.addMark(1, 6, schema.marks.strong.create())
    );
    const pluginState = changeBarPluginKey.getState(nextState);

    expect(pluginState?.changedRanges).toHaveLength(0);
    expect(pluginState?.decorations.find()).toHaveLength(0);
  });

  it('renders bars from a fixed viewport layer', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    view = new EditorView(element, {
      state: createState(),
    });

    const layer = document.body.querySelector<HTMLElement>(
      '.licit-change-bar-layer'
    );

    expect(layer).not.toBeNull();
    expect(layer?.style.position).toBe('fixed');
    expect(layer?.style.pointerEvents).toBe('none');
    element.remove();
  });

  it('exposes a temporary browser test API when enabled', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    view = new EditorView(element, {
      state: createStateWithPlugin(
        new ChangeBarPlugin({
          exposeTestApi: true,
          testRanges: [[1, 6]],
        }),
        'Alpha Beta Gamma'
      ),
    });
    const testWindow = view.dom.ownerDocument.defaultView as Window & {
      licitChangeBars?: ChangeBarTestApi;
    };

    testWindow.licitChangeBars?.set([[7, 11]]);
    expect(testWindow.licitChangeBars?.get()).toEqual([{ from: 7, to: 11 }]);

    testWindow.licitChangeBars?.add([[12, 17]]);
    expect(testWindow.licitChangeBars?.get()).toEqual([
      { from: 7, to: 11 },
      { from: 12, to: 17 },
    ]);

    testWindow.licitChangeBars?.clear();
    expect(testWindow.licitChangeBars?.get()).toHaveLength(0);

    testWindow.licitChangeBars?.sample();
    expect(testWindow.licitChangeBars?.get()).toEqual([{ from: 1, to: 6 }]);

    view.destroy();
    view = null;
    expect(testWindow.licitChangeBars).toBeUndefined();
    element.remove();
  });

  it('sets API supplied position ranges', () => {
    const element = document.createElement('div');
    view = new EditorView(element, {
      state: createState('Alpha Beta Gamma'),
    });

    setChangeBarRanges(view, [
      [1, 6],
      { from: 7, to: 11 },
    ]);

    const pluginState = changeBarPluginKey.getState(view.state);
    const decorations = pluginState?.decorations.find() ?? [];

    expect(pluginState?.changedRanges).toEqual([
      { from: 1, to: 6 },
      { from: 7, to: 11 },
    ]);
    expect(decorations).toHaveLength(2);
    expect(getDecorationClass(decorations[0])).toBe(CHANGE_BAR_RANGE_CLASS);
  });

  it('adds API supplied position ranges to existing bars', () => {
    const element = document.createElement('div');
    view = new EditorView(element, {
      state: createState('Alpha Beta Gamma'),
    });

    setChangeBarRanges(view, [[1, 6]]);
    addChangeBarRanges(view, [[7, 11]]);

    const pluginState = changeBarPluginKey.getState(view.state);

    expect(pluginState?.changedRanges).toEqual([
      { from: 1, to: 6 },
      { from: 7, to: 11 },
    ]);
  });

  it('maps existing API supplied ranges across later document changes', () => {
    const state = createState('Alpha Beta Gamma');
    const stateWithRange = state.apply(
      state.tr.setMeta(changeBarPluginKey, {
        type: 'set',
        ranges: [{ from: 7, to: 11 }],
      })
    );
    const nextState = stateWithRange.apply(stateWithRange.tr.insertText('Say ', 1));
    const pluginState = changeBarPluginKey.getState(nextState);

    expect(pluginState?.changedRanges).toEqual([{ from: 11, to: 15 }]);
  });

  it('normalizes API ranges to valid textblock content', () => {
    const element = document.createElement('div');
    view = new EditorView(element, {
      state: createState(),
    });

    setChangeBarRanges(view, [[-10, 500]]);

    const pluginState = changeBarPluginKey.getState(view.state);

    expect(pluginState?.changedRanges).toEqual([{ from: 1, to: 12 }]);
  });

  it('clears API supplied ranges', () => {
    const element = document.createElement('div');
    view = new EditorView(element, {
      state: createState(),
    });

    setChangeBarRanges(view, [[1, 6]]);
    clearChangeBars(view);

    const pluginState = changeBarPluginKey.getState(view.state);

    expect(pluginState?.changedRanges).toHaveLength(0);
    expect(pluginState?.decorations.find()).toHaveLength(0);
  });

  it('splits decorations by textblock boundaries', () => {
    const doc = schema.node('doc', null, [
      schema.nodes.paragraph.create(null, schema.text('One')),
      schema.nodes.paragraph.create(null, schema.text('Two')),
    ]);
    const decorations = createChangeBarDecorations(doc, [[1, 9]]);

    expect(decorations.find()).toHaveLength(2);
  });
});
