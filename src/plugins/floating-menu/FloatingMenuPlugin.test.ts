/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */

import {Schema, Slice} from 'prosemirror-model';
import {DecorationSet, EditorView} from 'prosemirror-view';

const mockCreatePopUp = jest.fn();
const mockInsertReference = jest.fn();
const mockCreateKeyMapPlugin = jest.fn();
const mockCreateSliceManager = jest.fn();

jest.mock('../../commands', () => ({
  createPopUp: (...args: unknown[]) => mockCreatePopUp(...args),
}));

jest.mock('../referencing', () => ({
  insertReference: (...args: unknown[]) => mockInsertReference(...args),
}));

jest.mock('./slice', () => ({
  createSliceManager: (...args: unknown[]) => mockCreateSliceManager(...args),
}));

jest.mock('../../core', () => ({
  createKeyMapPlugin: (...args: unknown[]) => mockCreateKeyMapPlugin(...args),
  makeKeyMapWithCommon: (_name: string, key: string) => ({
    common: key,
    description: key,
  }),
}));

import {getDefaultMenuItems} from './FloatingMenuDefaults';
import {
  CMPluginKey,
  FloatingMenuPlugin,
  changeAttribute,
  addAltRightClickHandler,
  clipboardHasData,
  clipboardHasProseMirrorData,
  closeExistingPopup,
  copySelectionPlain,
  copySelectionRich,
  createCitationHandler,
  createInfoIconHandler,
  createMenuCallbacks,
  createOnCloseHandler,
  createSliceObject,
  getClosestHTMLElement,
  getDecorations,
  getDocSlices,
  openFloatingMenu,
  pasteAsPlainText,
  pasteAsReference,
  pasteFromClipboard,
  positionAboveOrBelow,
  showReferences,
  createNewSlice,
} from './FloatingMenuPlugin';

type MockSliceManager = {
  addCitation: jest.Mock;
  addInfoIcon: jest.Mock;
  addSliceToList: jest.Mock;
  createSliceViaDialog: jest.Mock;
  getDocumentSlices: jest.Mock;
  insertReference: jest.Mock;
  isReadonly: boolean;
  setSliceAttrs: jest.Mock;
  setSlices: jest.Mock;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function createFloatingSchema(): Schema {
  return new Schema({
    nodes: {
      doc: {content: 'paragraph+'},
      paragraph: {
        content: 'text*',
        group: 'block',
        attrs: {
          objectId: {default: null},
          isDeco: {default: null},
        },
        toDOM: () => ['p', 0],
      },
      text: {group: 'inline'},
    },
    marks: {},
  });
}

function createMockSliceManager(): MockSliceManager {
  return {
    addCitation: jest.fn(),
    addInfoIcon: jest.fn(),
    addSliceToList: jest.fn(),
    createSliceViaDialog: jest.fn(),
    getDocumentSlices: jest.fn(),
    insertReference: jest.fn(),
    isReadonly: false,
    setSliceAttrs: jest.fn(),
    setSlices: jest.fn(),
  };
}

function createMockView(overrides: Record<string, unknown> = {}): EditorView {
  const schema = createFloatingSchema();
  const doc =
    (overrides.doc as ReturnType<Schema['node']>) ||
    schema.node('doc', null, [
      schema.node(
        'paragraph',
        {objectId: 'para-1'},
        [schema.text('Alpha paragraph')]
      ),
    ]);
  const selection =
    (overrides.selection as Record<string, unknown>) || {
      empty: false,
      from: 1,
      to: doc.content.size,
      $from: {depth: 1, start: () => 0, before: () => 0},
      $to: {depth: 1, end: () => doc.content.size},
      content: () => ({
        content: {toJSON: () => [{type: 'paragraph'}]},
        openStart: 0,
        openEnd: 0,
      }),
    };
  const tr = {
    insertText: jest.fn().mockReturnThis(),
    replaceSelection: jest.fn().mockReturnThis(),
    scrollIntoView: jest.fn().mockReturnThis(),
    setNodeMarkup: jest.fn().mockReturnThis(),
  };

  const baseState = {
    doc,
    schema,
    selection,
    tr,
  };

  return {
    dispatch: jest.fn(),
    docView: {
      node: {
        attrs: {
          objectId: 'doc-object-id',
          objectMetaData: {name: 'Document Name'},
        },
      },
    },
    dom: document.createElement('div'),
    editable: true,
    focus: jest.fn(),
    hasFocus: jest.fn(() => false),
    posAtCoords: jest.fn(() => ({pos: 7})),
    state: {
      ...baseState,
      ...(overrides.state as Record<string, unknown>),
    },
    ...overrides,
  } as unknown as EditorView;
}

describe('FloatingMenuDefaults', () => {
  it('should return default menu items', () => {
    const handlers = {
      enableCopy: () => true,
      enablePaste: () => true,
      enablePasteAsReference: () => false,
      enableCitationAndComment: () => true,
      enableTagAndInfoicon: () => true,
      copyRich: () => undefined,
      copyPlain: () => undefined,
      paste: () => undefined,
      pastePlain: () => undefined,
      pasteAsReference: () => undefined,
      createCitation: () => undefined,
      createInfoIcon: () => undefined,
      createSlice: () => undefined,
      showReferences: () => undefined,
      addComment: () => undefined,
      addTag: () => undefined,
    };

    const items = getDefaultMenuItems(handlers);
    expect(items.length).toBeGreaterThan(0);
    expect(items.map((item) => item.id)).toContain('copy');
    expect(items.map((item) => item.id)).toContain('paste');
  });
});

describe('FloatingMenuPlugin helpers', () => {
  let mockSliceManager: MockSliceManager;
  let clipboardWriteText: jest.Mock;
  let clipboardReadText: jest.Mock;

  beforeEach(() => {
    mockSliceManager = createMockSliceManager();
    mockCreateSliceManager.mockReturnValue(mockSliceManager);
    mockCreateKeyMapPlugin.mockImplementation((maps) => maps);
    mockCreatePopUp.mockReset();
    mockInsertReference.mockReset();
    clipboardWriteText = jest.fn().mockResolvedValue(undefined);
    clipboardReadText = jest.fn().mockResolvedValue('plain clipboard text');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: clipboardReadText,
        writeText: clipboardWriteText,
      },
    });
    jest.restoreAllMocks();
  });

  it('returns key command plugins and effective schema', () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    const schema = createFloatingSchema();

    const keyPlugins = plugin.initKeyCommands();

    expect(keyPlugins).toHaveLength(4);
    expect(plugin.getEffectiveSchema(schema)).toBe(schema);
  });

  it('copies rich text, updates popup state, and closes the popup', async () => {
    const plugin = new FloatingMenuPlugin(
      {isReadonly: false} as never,
      {instanceUrl: 'https://instance/', referenceUrl: 'https://ref/'}
    );
    const handle = {
      close: jest.fn(),
      props: {existing: true},
      update: jest.fn(),
    };
    plugin._popUpHandle = handle;
    plugin._urlConfig = {
      instanceUrl: 'https://instance/',
      referenceUrl: 'https://ref/',
    };
    const view = createMockView();
    jest.spyOn(CMPluginKey, 'get').mockReturnValue(plugin);
    jest.spyOn(global, 'Date').mockImplementation(
      () =>
        ({
          toISOString: () => '2026-04-24T00:00:00.000Z',
        } as Date)
    );

    copySelectionRich(view, plugin);
    await flushPromises();

    expect(view.focus).toHaveBeenCalled();
    expect(clipboardWriteText).toHaveBeenCalled();
    expect(handle.update).toHaveBeenCalledWith(
      expect.objectContaining({pasteAsReferenceEnabled: true})
    );
    expect(handle.close).toHaveBeenCalledWith(null);
    expect(plugin._popUpHandle).toBeNull();
  });

  it('skips rich copy when the selection is empty', () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    const view = createMockView({
      selection: {
        empty: true,
      },
    });

    expect(copySelectionRich(view, plugin)).toBeUndefined();
    expect(clipboardWriteText).not.toHaveBeenCalled();
  });

  it('creates a slice object from paragraph metadata and falls back to untitled', () => {
    const plugin = new FloatingMenuPlugin(
      {isReadonly: false} as never,
      {instanceUrl: 'https://instance/', referenceUrl: 'https://ref/'}
    );
    const schema = createFloatingSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', {objectId: 'one'}, [schema.text('First text')]),
      schema.node('paragraph', {objectId: 'two'}, []),
    ]);
    const view = createMockView({doc});
    plugin._urlConfig = {
      instanceUrl: 'https://instance/',
      referenceUrl: 'https://ref/',
    };
    jest.spyOn(CMPluginKey, 'get').mockReturnValue(plugin);
    jest.spyOn(global, 'Date').mockImplementation(
      () =>
        ({
          toISOString: () => '2026-04-24T00:00:00.000Z',
        } as Date)
    );

    const result = createSliceObject(view);

    expect(result.ids).toEqual(['one', 'two']);
    expect(result.from).toBe('one');
    expect(result.to).toBe('two');
    expect(result.referenceType).toBe('https://ref/');
    expect(result.source).toBe('doc-object-id');
    expect(result.name).toBe('First text - 2026-04-24');
  });

  it('creates an untitled slice object when paragraph ids and text are missing', () => {
    const plugin = new FloatingMenuPlugin(
      {isReadonly: false} as never,
      {}
    );
    const schema = createFloatingSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', {objectId: undefined}, []),
    ]);
    const view = createMockView({doc});
    plugin._urlConfig = {};
    jest.spyOn(CMPluginKey, 'get').mockReturnValue(plugin);
    jest.spyOn(global, 'Date').mockImplementation(
      () =>
        ({
          toISOString: () => '2026-04-24T00:00:00.000Z',
        } as Date)
    );

    const result = createSliceObject(view);

    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
    expect(result.name).toBe('Untitled - 2026-04-24');
  });

  it('copies plain text when a non-empty range is selected', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    const view = createMockView({
      state: {
        doc: {
          slice: jest.fn(() => ({
            content: {
              size: 4,
              textBetween: jest.fn(() => 'text copy'),
            },
          })),
        },
        selection: {
          from: 1,
          to: 3,
        },
      },
    });

    copySelectionPlain(view, plugin);
    await flushPromises();

    expect(clipboardWriteText).toHaveBeenCalledWith('text copy');
    expect(plugin._popUpHandle).toBeNull();
  });

  it('skips plain copy when the selection is collapsed', () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    const view = createMockView({
      hasFocus: jest.fn(() => true),
      state: {
        selection: {
          from: 4,
          to: 4,
        },
      },
    });

    expect(copySelectionPlain(view, plugin)).toBeUndefined();
    expect(clipboardWriteText).not.toHaveBeenCalled();
  });

  it('pastes parsed slice JSON from the clipboard', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    clipboardReadText.mockResolvedValue('{"content":[]}');
    const slice = {} as Slice;
    const fromJSONSpy = jest.spyOn(Slice, 'fromJSON').mockReturnValue(slice);
    const view = createMockView();

    await pasteFromClipboard(view, plugin);

    expect(fromJSONSpy).toHaveBeenCalled();
    expect(view.state.tr.replaceSelection).toHaveBeenCalledWith(slice);
    expect(view.dispatch).toHaveBeenCalled();
    expect(plugin._popUpHandle).toBeNull();
  });

  it('pastes plain text from the clipboard', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    clipboardReadText.mockResolvedValue('hello world');
    const view = createMockView();

    await pasteFromClipboard(view, plugin);

    expect(view.state.tr.insertText).toHaveBeenCalledWith(
      'hello world',
      view.state.selection.from,
      view.state.selection.to
    );
    expect(view.dispatch).toHaveBeenCalled();
  });

  it('handles clipboard paste errors and still closes the popup', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    clipboardReadText.mockRejectedValue(new Error('clipboard failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await pasteFromClipboard(createMockView(), plugin);

    expect(consoleSpy).toHaveBeenCalled();
    expect(plugin._popUpHandle).toBeNull();
  });

  it('pastes as reference when slice creation succeeds', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    plugin.sliceManager = mockSliceManager as never;
    mockSliceManager.createSliceViaDialog.mockResolvedValue({
      id: 'slice-id',
      source: 'slice-source',
      from: 'slice-from',
    });
    clipboardReadText.mockResolvedValue(
      JSON.stringify({sliceModel: {id: 'slice-model-id'}})
    );
    const view = createMockView();
    jest.spyOn(CMPluginKey, 'get').mockReturnValue(plugin);

    await pasteAsReference(view, plugin);

    expect(mockSliceManager.createSliceViaDialog).toHaveBeenCalledWith({
      id: 'slice-model-id',
    });
    expect(mockInsertReference).toHaveBeenCalledWith(
      view,
      'slice-id',
      'slice-source',
      'Document Name',
      'slice-from'
    );
    expect(plugin._popUpHandle).toBeNull();
  });

  it('returns early when slice creation dialog is cancelled', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    plugin.sliceManager = mockSliceManager as never;
    mockSliceManager.createSliceViaDialog.mockResolvedValue(null);
    clipboardReadText.mockResolvedValue(
      JSON.stringify({sliceModel: {id: 'slice-model-id'}})
    );

    await pasteAsReference(createMockView(), plugin);

    expect(mockInsertReference).not.toHaveBeenCalled();
    expect(plugin._popUpHandle).toBeNull();
  });

  it('handles missing slice dialog support in pasteAsReference', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    plugin.sliceManager = {} as never;
    clipboardReadText.mockResolvedValue(
      JSON.stringify({sliceModel: {id: 'slice-model-id'}})
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await pasteAsReference(createMockView(), plugin);

    expect(consoleSpy).toHaveBeenCalled();
    expect(plugin._popUpHandle).toBeNull();
  });

  it('pastes plain text from parsed ProseMirror JSON content', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    clipboardReadText.mockResolvedValue('{"content":[]}');
    jest.spyOn(Slice, 'fromJSON').mockReturnValue({
      content: {
        forEach: (cb: (node: {textContent: string}) => void) => {
          cb({textContent: 'one'});
          cb({textContent: 'two'});
        },
      },
    } as unknown as Slice);
    const view = createMockView();

    await pasteAsPlainText(view, plugin);

    expect(view.state.tr.insertText).toHaveBeenCalledWith(
      'one\ntwo',
      view.state.selection.from,
      view.state.selection.to
    );
  });

  it('falls back to raw clipboard text when plain-text JSON parsing fails', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;
    clipboardReadText.mockResolvedValue('raw text');
    const view = createMockView();

    await pasteAsPlainText(view, plugin);

    expect(view.state.tr.insertText).toHaveBeenCalledWith(
      'raw text',
      view.state.selection.from,
      view.state.selection.to
    );
    expect(plugin._popUpHandle).toBeNull();
  });

  it('reports whether the clipboard has any data or ProseMirror data', async () => {
    clipboardReadText.mockResolvedValue('content');
    await expect(clipboardHasData()).resolves.toBe(true);

    clipboardReadText.mockRejectedValue(new Error('no clipboard'));
    await expect(clipboardHasData()).resolves.toBe(false);

    clipboardReadText.mockResolvedValue('{"content":[]}');
    await expect(clipboardHasProseMirrorData()).resolves.toBe(true);

    clipboardReadText.mockResolvedValue('plain text');
    await expect(clipboardHasProseMirrorData()).resolves.toBe(false);

    clipboardReadText.mockResolvedValue('');
    await expect(clipboardHasProseMirrorData()).resolves.toBe(false);
  });

  it('builds paragraph decorations and side markers', () => {
    const schema = createFloatingSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', {
        objectId: 'one',
        isDeco: {isSlice: true, isTag: true, isComment: true},
      }, [schema.text('Decorated')]),
    ]);
    const state = {
      doc,
    } as never;

    const decorations = getDecorations(doc, state);

    expect(decorations.find()).toHaveLength(2);
  });

  it('skips non-paragraph nodes and undecorated paragraphs', () => {
    const schema = createFloatingSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', {objectId: 'one'}, [schema.text('Plain')]),
    ]);

    const decorations = getDecorations(doc, {doc} as never);

    expect(decorations.find()).toHaveLength(1);
  });

  it('returns only paragraph decorations when non-paragraph nodes are present', () => {
    const schema = new Schema({
      nodes: {
        doc: {content: 'block+'},
        heading: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['h1', 0],
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          attrs: {isDeco: {default: null}, objectId: {default: null}},
          toDOM: () => ['p', 0],
        },
        text: {group: 'inline'},
      },
      marks: {},
    });
    const doc = schema.node('doc', null, [
      schema.node('heading', null, [schema.text('Heading')]),
      schema.node('paragraph', {objectId: 'one'}, [schema.text('Para')]),
    ]);

    const decorations = getDecorations(doc, {doc} as never);

    expect(decorations.find()).toHaveLength(1);
  });

  it('positions the popup using defaults and viewport clamping', () => {
    expect(positionAboveOrBelow()).toEqual({x: 4, y: 4, w: 0, h: 0});

    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 200});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 180});

    const anchored = positionAboveOrBelow(
      {x: 190, y: 170, w: 20, h: 20},
      {x: 0, y: 0, w: 180, h: 220}
    );

    expect(anchored.x).toBeGreaterThanOrEqual(6);
    expect(anchored.y).toBeGreaterThanOrEqual(6);
  });

  it('positions the popup above the anchor when there is not enough space below', () => {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 600});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 500});

    const anchored = positionAboveOrBelow(
      {x: 20, y: 300, w: 20, h: 20},
      {x: 0, y: 0, w: 100, h: 250}
    );

    expect(anchored.y).toBeLessThan(300);
  });

  it('uses default body size estimates when popup dimensions are missing', () => {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 220});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 200});

    const anchored = positionAboveOrBelow(
      {x: 0, y: 0, w: 10, h: 10},
      {x: 0, y: 0, w: 0, h: 0}
    );

    expect(anchored.x).toBe(6);
    expect(anchored.y).toBe(6);
  });

  it('creates menu callbacks with the expected enablement', () => {
    const view = createMockView();
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    const callbacks = createMenuCallbacks(view, plugin, false, true);

    expect(callbacks.enableCopy()).toBe(true);
    expect(callbacks.enablePaste()).toBe(false);
    expect(callbacks.enablePasteAsReference()).toBe(true);
    expect(callbacks.enableCitationAndComment()).toBe(true);
    expect(callbacks.enableTagAndInfoicon()).toBe(true);
  });

  it('closes an existing popup and clears popup-open on close', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pm-hamburger-wrapper popup-open';
    const anchor = document.createElement('span');
    wrapper.appendChild(anchor);
    document.body.appendChild(wrapper);

    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin._popUpHandle = {close: jest.fn()} as never;

    closeExistingPopup(plugin);
    expect(plugin._popUpHandle?.close).toHaveBeenCalledWith(null);

    const onClose = createOnCloseHandler(plugin, anchor);
    onClose();

    expect(plugin._popUpHandle).toBeNull();
    expect(wrapper.classList.contains('popup-open')).toBe(false);
  });

  it('opens a floating menu using supplied menu items', async () => {
    const plugin = new FloatingMenuPlugin(
      {isReadonly: false} as never,
      {},
      [{id: 'custom'} as never]
    );
    mockCreatePopUp.mockReturnValue({close: jest.fn()});

    openFloatingMenu(plugin, createMockView(), 9, undefined, {x: 1, y: 2});
    await flushPromises();

    expect(mockCreatePopUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        context: expect.objectContaining({paragraphPos: 9}),
        items: [{id: 'custom'}],
        isReadonly: false,
      }),
      expect.objectContaining({
        autoDismiss: false,
        contextPos: {x: 1, y: 2},
        position: positionAboveOrBelow,
      })
    );
  });

  it('handles errors while opening a floating menu', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    mockCreatePopUp.mockImplementation(() => {
      throw new Error('popup failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    openFloatingMenu(plugin, createMockView());
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('loads document slices and stores them', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin.sliceManager = mockSliceManager as never;
    mockSliceManager.getDocumentSlices.mockResolvedValue(['slice-a']);
    const view = createMockView();

    await getDocSlices.call(plugin, view);

    expect(mockSliceManager.setSlices).toHaveBeenCalledWith(['slice-a'], view.state);
    expect(mockSliceManager.setSliceAttrs).toHaveBeenCalledWith(view);
  });

  it('handles document slice loading failures', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin.sliceManager = mockSliceManager as never;
    mockSliceManager.getDocumentSlices.mockRejectedValue(new Error('load failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await getDocSlices.call(plugin, createMockView());

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('changes paragraph decoration attributes when a target node exists', () => {
    const view = createMockView({
      state: {
        doc: {
          nodeAt: jest.fn(() => ({
            attrs: {
              isDeco: {isSlice: false},
            },
          })),
        },
        selection: {
          $from: {
            before: () => 1,
          },
        },
        tr: {
          setNodeMarkup: jest.fn().mockReturnThis(),
        },
      },
    });

    changeAttribute(view);

    expect(view.state.tr.setNodeMarkup).toHaveBeenCalledWith(
      1,
      undefined,
      expect.objectContaining({
        isDeco: expect.objectContaining({isSlice: true}),
      })
    );
    expect(view.dispatch).toHaveBeenCalled();
  });

  it('returns early when changeAttribute cannot find a node', () => {
    const view = createMockView({
      state: {
        doc: {
          nodeAt: jest.fn(() => null),
        },
        selection: {
          $from: {
            before: () => 1,
          },
        },
        tr: {
          setNodeMarkup: jest.fn(),
        },
      },
    });

    expect(changeAttribute(view)).toBeUndefined();
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it('creates a new slice, inserts references, and handles plugin shortcuts', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin.sliceManager = mockSliceManager as never;
    mockSliceManager.createSliceViaDialog.mockResolvedValue({
      id: 'slice-id',
      source: 'slice-source',
      from: 'slice-from',
    });
    mockSliceManager.insertReference.mockResolvedValue({
      id: 'ref-id',
      source: 'ref-source',
      from: 'ref-from',
    });
    const baseView = createMockView();
    const view = createMockView({
      state: {
        ...baseView.state,
        doc: Object.assign(baseView.state.doc, {
          nodeAt: jest.fn(() => ({
            attrs: {isDeco: {isSlice: false}},
          })),
        }),
        tr: {
          ...baseView.state.tr,
          setNodeMarkup: jest.fn().mockReturnThis(),
        },
      },
    });
    jest.spyOn(CMPluginKey, 'get').mockReturnValue(plugin);

    createNewSlice(view);
    await flushPromises();
    showReferences(view);
    await flushPromises();
    createInfoIconHandler(view);
    createCitationHandler(view);

    expect(mockSliceManager.addSliceToList).toHaveBeenCalled();
    expect(mockInsertReference).toHaveBeenCalledWith(
      view,
      'ref-id',
      'ref-source',
      'Document Name',
      'ref-from'
    );
    expect(mockSliceManager.addInfoIcon).toHaveBeenCalled();
    expect(mockSliceManager.addCitation).toHaveBeenCalled();
  });

  it('handles missing plugins and rejected slice actions gracefully', async () => {
    jest.spyOn(CMPluginKey, 'get').mockReturnValue(null);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const view = createMockView();

    expect(createNewSlice(view)).toBeUndefined();
    expect(showReferences(view)).toBeUndefined();
    expect(createInfoIconHandler(view)).toBeUndefined();
    expect(createCitationHandler(view)).toBeUndefined();

    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin.sliceManager = mockSliceManager as never;
    mockSliceManager.createSliceViaDialog.mockRejectedValue(new Error('slice failed'));
    mockSliceManager.insertReference.mockRejectedValue(new Error('reference failed'));
    jest.spyOn(CMPluginKey, 'get').mockReturnValue(plugin);

    createNewSlice(view);
    await flushPromises();
    showReferences(view);
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('finds the closest HTMLElement only for matching DOM targets', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'target';
    const child = document.createElement('span');
    wrapper.appendChild(child);

    expect(getClosestHTMLElement(null, '.target')).toBeNull();
    expect(getClosestHTMLElement({} as EventTarget, '.target')).toBeNull();
    expect(getClosestHTMLElement(child, '.target')).toBe(wrapper);
  });

  it('adds an alt-right-click handler that opens only when a position is found', async () => {
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin.sliceManager = mockSliceManager as never;
    const view = createMockView({
      posAtCoords: jest.fn()
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({pos: 11}),
    });
    mockCreatePopUp.mockReturnValue({close: jest.fn()});

    addAltRightClickHandler(view, plugin);
    view.dom.dispatchEvent(new MouseEvent('contextmenu', {
      altKey: true,
      bubbles: true,
      button: 2,
      clientX: 1,
      clientY: 2,
    }));
    view.dom.dispatchEvent(new MouseEvent('contextmenu', {
      altKey: true,
      bubbles: true,
      button: 2,
      clientX: 3,
      clientY: 4,
    }));
    await flushPromises();

    expect(mockCreatePopUp).toHaveBeenCalledTimes(1);
  });

  it('covers plugin state transitions and view event handlers', async () => {
    const schema = createFloatingSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', {objectId: 'one'}, [schema.text('A')]),
    ]);
    const plugin = new FloatingMenuPlugin({isReadonly: false} as never);
    plugin.sliceManager = mockSliceManager as never;
    plugin._urlConfig = {};
    const pluginState = plugin.spec.state.init({}, {
      doc,
    } as never);
    jest
      .spyOn(DecorationSet.prototype, 'map')
      .mockImplementation(function mapped() {
        return this;
      });

    const unchanged = plugin.spec.state.apply(
      {
        docChanged: false,
        mapping: {},
        doc,
      } as never,
      pluginState,
      null,
      {doc} as never
    );
    expect(unchanged.decorations).toBeDefined();

    const unchangedWithoutDecos = plugin.spec.state.apply(
      {
        docChanged: false,
        mapping: {},
        doc,
      } as never,
      {decorations: undefined},
      null,
      {doc} as never
    );
    expect(unchangedWithoutDecos.decorations).toBeUndefined();

    const rescanned = plugin.spec.state.apply(
      {
        doc,
        docChanged: true,
        getMeta: () => ({forceRescan: true}),
        mapping: {},
        steps: [],
      } as never,
      pluginState,
      null,
      {doc} as never
    );
    expect(rescanned.decorations).toBeDefined();

    const rescannedByStep = plugin.spec.state.apply(
      {
        doc,
        docChanged: true,
        getMeta: () => undefined,
        mapping: {},
        steps: [{toJSON: () => ({stepType: 'replace'})}],
      } as never,
      pluginState,
      null,
      {doc} as never
    );
    expect(rescannedByStep.decorations).toBeDefined();

    const view = createMockView({state: {doc}});
    mockCreatePopUp.mockReturnValue({close: jest.fn()});
    plugin.spec.view(view);

    const wrapper = document.createElement('span');
    wrapper.className = 'pm-hamburger-wrapper';
    const icon = document.createElement('span');
    icon.className = 'float-icon';
    icon.dataset.pos = '4';
    wrapper.appendChild(icon);
    view.dom.appendChild(wrapper);

    icon.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}));
    view.dom.dispatchEvent(new MouseEvent('contextmenu', {
      altKey: true,
      bubbles: true,
      button: 2,
      clientX: 10,
      clientY: 20,
    }));
    await flushPromises();

    plugin._popUpHandle = {close: jest.fn()} as never;
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    view.dom.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}));
    view.editable = false;
    view.dom.dispatchEvent(new MouseEvent('contextmenu', {
      altKey: true,
      bubbles: true,
      button: 2,
      clientX: 10,
      clientY: 20,
    }));

    expect(mockCreatePopUp).toHaveBeenCalled();
  });
});
