import { Schema } from 'prosemirror-model';
import { EditorState, EditorStateConfig, Transaction } from 'prosemirror-state';
import { DecorationSet, EditorView } from 'prosemirror-view';
import { LicitHighlightTextPlugin, PluginState } from '.';
const writeText = jest.fn().mockReturnValue('copy');

Object.assign(navigator, {
  clipboard: {
    writeText,
  },
});
describe('LicitHighlightTextPlugin', () => {
  jest.mock('prosemirror-model', () => {
    const originalModule: { DOMParser: () => object } =
      jest.requireActual('prosemirror-model');
    jest.spyOn(originalModule, 'DOMParser').mockReturnValue({
      fromSchema: jest.fn(() => ({
        parse: jest.fn(),
      })),
    });
  });
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });
  const plugin = new LicitHighlightTextPlugin();
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'paragraph+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        attrs: { objectId: { default: null } },
        parseDOM: [
          {
            tag: 'p',
            getAttrs: (dom) => ({
              objectId: dom.getAttribute('data-objectid'),
            }),
          },
        ],
        toDOM: (node) => [
          'p',
          { 'data-objectid': node.attrs.objectiId as string },
          0,
        ],
      },
      text: { group: 'inline' },
    },
  });
  const docJson = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { objectId: 'modusoperandi' },
        content: [
          {
            type: 'text',
            text: 'This is a dummy text node in ProseMirror.',
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { objectId: 'modusoperandi' },
        content: [
          {
            type: 'text',
            text: 'This is a dummy text node in ProseMirror.',
          },
        ],
      },
    ],
  };
  const docNode = mySchema.nodeFromJSON(docJson);

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });

  it('should handle init', () => {
    expect(
      plugin.spec.state?.init(
        null as unknown as EditorStateConfig,
        { docNode } as unknown as EditorState
      )
    ).toBeDefined();
  });

  it('should handle apply', () => {
    return expect(
      plugin.spec.state?.apply(
        {
          doc: docNode,
          docChanged: false,
          getMeta: () => {
            return {
              searchTerm: 'searchTerm',
              highlightClass: 'match-highlight',
              selectedHighlight: 'modusoperandi',
            };
          },
        } as unknown as Transaction,
        {} as unknown as PluginState,
        {} as unknown as EditorState,

        {} as unknown as EditorState
      )
    ).toBeDefined();
  });
  it('should handle apply without searchterm', () => {
    expect(
      plugin.spec.state?.apply(
        {
          doc: docNode,
          docChanged: false,
          getMeta: () => {
            return {
              searchTerm: '',
              highlightClass: 'match-highlight',
              selectedHighlight: 'modusoperandi',
            };
          },
        } as unknown as Transaction,
        {} as unknown as PluginState,
        {} as unknown as EditorState,

        {} as unknown as EditorState
      )
    ).toBeDefined();
  });
  it('should handle apply without selectedhighlight', () => {
    expect(
      plugin.spec.state?.apply(
        {
          doc: docNode,
          docChanged: false,
          getMeta: () => {
            return {
              searchTerm: 'searchTerm',
              highlightClass: 'match-highlight',
              selectedHighlight: '',
            };
          },
        } as unknown as Transaction,
        {} as unknown as PluginState,
        {} as unknown as EditorState,

        {} as unknown as EditorState
      )
    ).toBeDefined();
  });

  it('should handle apply when undefined is searchterm', () => {
    expect(
      plugin.spec.state?.apply(
        {
          doc: docNode,
          docChanged: false,
          getMeta: () => {
            return {
              searchTerm: undefined,
              highlightClass: 'match-highlight',
              selectedHighlight: 'modusoperandi',
            };
          },
        } as unknown as Transaction,
        {} as unknown as PluginState,
        {} as unknown as EditorState,

        {} as unknown as EditorState
      )
    ).toBeDefined();
  });

  it('should handle updateSearchTerm', () => {
    const HighlightDocProperties = {
      highlightClass: 'match-highlight',
      selectedHighlight: 'paragrapghId',
      individualHighlightClass: 'individual-highlight',
    };
    expect(
      LicitHighlightTextPlugin.updateSearchTerm(
        {
          dispatch: () => undefined,
          state: { tr: { setMeta: () => undefined } },
        } as unknown as EditorView,
        'test',
        HighlightDocProperties
      )
    ).toBeUndefined();
  });

  it('should handle updateSearchTerm when there is no selected id', () => {
    expect(
      LicitHighlightTextPlugin.updateSearchTerm(
        {
          dispatch: () => undefined,
          state: { tr: { setMeta: () => undefined } },
        } as unknown as EditorView,
        'test',
        {
          highlightClass: '',
        }
      )
    ).toBeUndefined();
  });
  it('should handle apply when state empty', () => {
    const pluginInstance = plugin;
    jest.spyOn(pluginInstance, 'getState').mockReturnValue({} as PluginState);
    const boundDecorations = pluginInstance.spec.props?.decorations?.bind(
      pluginInstance
    ) as (state: EditorState) => unknown;
    expect(boundDecorations?.({} as unknown as EditorState)).toBeUndefined();
  });

  describe('Decoration Props', () => {
    it('should return decorations from plugin state', () => {
      const pluginInstance = plugin;
      jest.spyOn(pluginInstance, 'getState').mockReturnValue({
        highlightClass: 'hi',
        decorations: DecorationSet.empty,
      });

      const boundDecorations = pluginInstance.spec.props?.decorations?.bind(
        pluginInstance
      ) as (state: EditorState) => unknown;
      const result = boundDecorations?.({} as unknown as EditorState);

      expect(result).toBeDefined();
    });

    it('should handle undefined plugin state', () => {
      const pluginInstance = plugin;
      jest.spyOn(pluginInstance, 'getState').mockReturnValue(undefined);

      const boundDecorations = pluginInstance.spec.props?.decorations?.bind(
        pluginInstance
      ) as (state: EditorState) => unknown;
      const result = boundDecorations?.({} as unknown as EditorState);

      expect(result).toBeUndefined();
    });
  });

  describe('Update Search Term', () => {
    it('should handle updateSearchTerm with all properties', () => {
      const HighlightDocProperties = {
        highlightClass: 'match-highlight',
        selectedHighlight: 'paragraphId',
        individualHighlightClass: 'individual-highlight',
      };

      const mockDispatch = jest.fn();
      const mockSetMeta = jest.fn();

      LicitHighlightTextPlugin.updateSearchTerm(
        {
          dispatch: mockDispatch,
          state: { tr: { setMeta: mockSetMeta } },
        } as unknown as EditorView,
        'test',
        HighlightDocProperties
      );

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle updateSearchTerm without selectedHighlight', () => {
      const HighlightDocProperties = {
        highlightClass: 'match-highlight',
      };

      const mockDispatch = jest.fn();
      const mockSetMeta = jest.fn();

      LicitHighlightTextPlugin.updateSearchTerm(
        {
          dispatch: mockDispatch,
          state: { tr: { setMeta: mockSetMeta } },
        } as unknown as EditorView,
        'test',
        HighlightDocProperties
      );

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Highlight Finding', () => {
    it('should find highlights in specified range', () => {
      const state = {
        searchTerm: 'dummy',
        highlightClass: 'match-highlight',
        selectedHighlight: 'modusoperandi',
        individualHighlightClass: 'individual-highlight',
      };

      const decorations = LicitHighlightTextPlugin.findHighlightsInRange(
        docNode,
        state.searchTerm,
        state as PluginState,
        { from: 0, to: docNode.content.size }
      );

      expect(Array.isArray(decorations)).toBe(true);
    });

    it('should handle regex special characters in search term', () => {
      const state = {
        searchTerm: 'dummy.*',
        highlightClass: 'match-highlight',
      };

      const decorations = LicitHighlightTextPlugin.findHighlightsInRange(
        docNode,
        state.searchTerm,
        state as PluginState,
        { from: 0, to: docNode.content.size }
      );

      expect(Array.isArray(decorations)).toBe(true);
    });
  });

  describe('Changed Ranges Detection', () => {
    it('should detect changed ranges', () => {
      const tr = {
        doc: docNode,
        mapping: {
          maps: [
            {
              forEach: (
                fn: (a: number, b: number, c: number, d: number) => void
              ) => fn(0, 5, 0, 5),
            },
          ],
        },
        steps: [{}],
      } as unknown as Transaction;

      const ranges = LicitHighlightTextPlugin.getChangedRanges(tr);
      expect(ranges).toBeDefined();
      expect(Array.isArray(ranges)).toBe(true);
    });

    it('should merge overlapping ranges', () => {
      const tr = {
        doc: docNode,
        mapping: {
          maps: [
            {
              forEach: (
                fn: (a: number, b: number, c: number, d: number) => void
              ) => fn(0, 5, 0, 5),
            },
            {
              forEach: (
                fn: (a: number, b: number, c: number, d: number) => void
              ) => fn(4, 8, 4, 8),
            },
          ],
        },
        steps: [{}, {}],
      } as unknown as Transaction;

      const ranges = LicitHighlightTextPlugin.getChangedRanges(tr);
      expect(ranges.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Plugin State Initialization', () => {
    it('should handle init', () => {
      expect(
        plugin.spec.state?.init(
          null as unknown as EditorStateConfig,
          { docNode } as unknown as EditorState
        )
      ).toBeDefined();
    });

    it('should initialize with empty decorations', () => {
      const initState = plugin.spec.state?.init(
        null as unknown as EditorStateConfig,
        { docNode } as unknown as EditorState
      );
      expect(initState?.decorations).toBeDefined();
    });
  });

  describe('Plugin State Application', () => {
    const mockEditorState = {
      doc: docNode,
      schema: mySchema,
      selection: { from: 0, to: 0 },
      plugins: [],
    } as unknown as EditorState;

    it('should handle apply with search meta', () => {
      const result = plugin.spec.state?.apply(
        {
          doc: docNode,
          docChanged: false,
          getMeta: () => ({
            searchTerm: 'dummy',
            highlightClass: 'match-highlight',
            selectedHighlight: 'modusoperandi',
            individualHighlightClass: 'individual-highlight',
          }),
        } as unknown as Transaction,
        { decorations: DecorationSet.empty } as unknown as PluginState,
        mockEditorState,
        mockEditorState
      );
      expect(result).toBeDefined();
      expect(result?.decorations).toBeDefined();
    });

    it('should handle document changes', () => {
      const result = plugin.spec.state?.apply(
        {
          doc: docNode,
          docChanged: true,
          getMeta: () => null,
          mapping: { maps: [] },
        } as unknown as Transaction,
        {
          decorations: DecorationSet.empty,
          searchTerm: 'dummy',
        } as unknown as PluginState,
        mockEditorState,
        mockEditorState
      );
      expect(result).toBeDefined();
    });

    it('should handle empty search term', () => {
      const result = plugin.spec.state?.apply(
        {
          doc: docNode,
          docChanged: false,
          getMeta: () => ({
            searchTerm: '',
            highlightClass: 'match-highlight',
          }),
        } as unknown as Transaction,
        { decorations: DecorationSet.empty } as unknown as PluginState,
        mockEditorState,
        mockEditorState
      );
      expect(result?.decorations).toBeDefined();
    });
  });

  it('should return an empty array when searchTerm is empty or null', () => {
    const stateWithEmptySearchTerm = {
      searchTerm: '',
    } as unknown as PluginState;
    const stateWithNullSearchTerm = {
      searchTerm: null,
    } as unknown as PluginState;
    const resultEmpty = LicitHighlightTextPlugin.findHighlightsInRange(
      docNode,
      stateWithEmptySearchTerm.searchTerm,
      stateWithEmptySearchTerm,
      { from: 0, to: docNode.content.size }
    );
    const resultNull = LicitHighlightTextPlugin.findHighlightsInRange(
      docNode,
      stateWithNullSearchTerm.searchTerm,
      stateWithNullSearchTerm,
      { from: 0, to: docNode.content.size }
    );
    expect(resultEmpty).toEqual([]);
    expect(resultNull).toEqual([]);
  });
  it('should return changed ranges when encountering non-textblock nodes', () => {
    const tr = {
      doc: {
        content: { size: 50 },
        nodesBetween: jest.fn(
          (from, _to, callback: (a: unknown, b: unknown) => unknown) => {
            callback({ isTextblock: false }, from);
          }
        ),
      },
      mapping: {
        maps: [
          {
            forEach: (
              fn: (a: number, b: number, c: number, d: number) => unknown
            ) => fn(5, 10, 5, 10),
          },
        ],
      },
      steps: [{}],
    } as unknown as Transaction;
    const ranges = LicitHighlightTextPlugin.getChangedRanges(tr);
    expect(ranges).toBeDefined();
    expect(Array.isArray(ranges)).toBe(true);
    expect(ranges.length).toBeGreaterThan(0);
  });
  describe('LicitHighlightTextPlugin findHighlights method', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'text*' },
        text: {},
      },
    });
    it('should use empty string as highlightClass when state.highlightClass is undefined', () => {
      const doc = schema.node('doc', null, [
        schema.text('test highlight test'),
      ]);
      const state: PluginState = {
        decorations: DecorationSet.empty,
        searchTerm: 'highlight',
        highlightClass: undefined!,
      };
      const result = LicitHighlightTextPlugin.findHighlights(
        doc,
        state.searchTerm,
        state
      );
      expect(result).toBeInstanceOf(DecorationSet);
      expect(result.find()).toHaveLength(1);
      const decoration = result.find()[0];
      expect((decoration.spec as Record<string, unknown>).class).toBeFalsy();
    });
  });

  describe('toggleWholeWordMatching', () => {
    it('should update search term with matchWholeWordsOnly flag', () => {
      jest.spyOn(LicitHighlightTextPlugin, 'getPluginState').mockReturnValue({
        searchTerm: 'test',
        highlightClass: 'highlight-class',
        decorations: DecorationSet.empty,
      } as PluginState);
      const updateSearchTermSpy = jest
        .spyOn(LicitHighlightTextPlugin, 'updateSearchTerm')
        .mockImplementation(() => undefined);
      const mockView = {
        state: {
          plugins: [],
        },
      } as unknown as EditorView;

      LicitHighlightTextPlugin.toggleWholeWordMatching(mockView, true);
      expect(updateSearchTermSpy).toHaveBeenCalledWith(
        mockView,
        'test',
        expect.objectContaining({
          searchTerm: 'test',
          highlightClass: 'highlight-class',
          matchWholeWordsOnly: true,
        })
      );
      updateSearchTermSpy.mockRestore();
    });

    it('should not update search term when plugin state is undefined', () => {
      jest
        .spyOn(LicitHighlightTextPlugin, 'getPluginState')
        .mockReturnValue(undefined);
      const updateSearchTermSpy = jest
        .spyOn(LicitHighlightTextPlugin, 'updateSearchTerm')
        .mockImplementation(() => undefined);

      const mockView = {
        state: {
          plugins: [],
        },
      } as unknown as EditorView;

      LicitHighlightTextPlugin.toggleWholeWordMatching(mockView, true);

      expect(updateSearchTermSpy).not.toHaveBeenCalled();
      updateSearchTermSpy.mockRestore();
    });

    it('should not update search term when search term is empty', () => {
      jest.spyOn(LicitHighlightTextPlugin, 'getPluginState').mockReturnValue({
        searchTerm: '',
        highlightClass: 'highlight-class',
        decorations: DecorationSet.empty,
      } as PluginState);

      const updateSearchTermSpy = jest
        .spyOn(LicitHighlightTextPlugin, 'updateSearchTerm')
        .mockImplementation(() => undefined);
      const mockView = {
        state: {
          plugins: [],
        },
      } as unknown as EditorView;

      LicitHighlightTextPlugin.toggleWholeWordMatching(mockView, true);
      expect(updateSearchTermSpy).not.toHaveBeenCalled();
      updateSearchTermSpy.mockRestore();
    });
  });

  describe('refreshHighlights', () => {
    it('should update search term with existing plugin state', () => {
      const mockPluginState = {
        searchTerm: 'test',
        highlightClass: 'highlight-class',
        decorations: DecorationSet.empty,
      } as PluginState;

      jest
        .spyOn(LicitHighlightTextPlugin, 'getPluginState')
        .mockReturnValue(mockPluginState);

      const updateSearchTermSpy = jest
        .spyOn(LicitHighlightTextPlugin, 'updateSearchTerm')
        .mockImplementation(() => undefined);

      const mockView = {
        state: {
          plugins: [],
        },
      } as unknown as EditorView;

      LicitHighlightTextPlugin.refreshHighlights(mockView);
      expect(updateSearchTermSpy).toHaveBeenCalledWith(
        mockView,
        'test',
        mockPluginState
      );

      updateSearchTermSpy.mockRestore();
    });

    it('should not update search term when plugin state is undefined', () => {
      jest
        .spyOn(LicitHighlightTextPlugin, 'getPluginState')
        .mockReturnValue(undefined);

      const updateSearchTermSpy = jest
        .spyOn(LicitHighlightTextPlugin, 'updateSearchTerm')
        .mockImplementation(() => undefined);

      const mockView = {
        state: {
          plugins: [],
        },
      } as unknown as EditorView;

      LicitHighlightTextPlugin.refreshHighlights(mockView);

      expect(updateSearchTermSpy).not.toHaveBeenCalled();
      updateSearchTermSpy.mockRestore();
    });

    it('should not update search term when search term is empty', () => {
      jest.spyOn(LicitHighlightTextPlugin, 'getPluginState').mockReturnValue({
        searchTerm: '',
        highlightClass: 'highlight-class',
        decorations: DecorationSet.empty,
      } as PluginState);

      const updateSearchTermSpy = jest
        .spyOn(LicitHighlightTextPlugin, 'updateSearchTerm')
        .mockImplementation(() => undefined);

      const mockView = {
        state: {
          plugins: [],
        },
      } as unknown as EditorView;

      LicitHighlightTextPlugin.refreshHighlights(mockView);
      expect(updateSearchTermSpy).not.toHaveBeenCalled();
      updateSearchTermSpy.mockRestore();
    });
  });

  it('should handle updateSearchTerm with default empty properties', () => {
    const mockDispatch = jest.fn();
    const mockSetMeta = jest.fn().mockReturnValue({});

    const mockView = {
      dispatch: mockDispatch,
      state: {
        tr: {
          setMeta: mockSetMeta,
        },
      },
    } as unknown as EditorView;
    LicitHighlightTextPlugin.updateSearchTerm(mockView, 'test');
    expect(mockSetMeta).toHaveBeenCalledWith('search', {
      searchTerm: 'test',
    });
    expect(mockDispatch).toHaveBeenCalled();
  });
});
