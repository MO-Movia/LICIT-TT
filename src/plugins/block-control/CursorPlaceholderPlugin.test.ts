import { CursorPlaceholderPlugin, showCursorPlaceholder, hideCursorPlaceholder, findCursorPlaceholderPos, specFinder, resetInstance, isPlugin, getSingletonInstance } from './CursorPlaceholderPlugin';
import { EditorState } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { Decoration, DecorationSet } from 'prosemirror-view';
jest.mock('prosemirror-state');
jest.mock('prosemirror-view');
jest.mock('prosemirror-transform');

// Mock Decoration.widget
jest.spyOn(Decoration, 'widget').mockImplementation((pos, element, spec) => {
  return { pos, element, spec } as unknown as Decoration;
});
describe('CursorPlaceholderPlugin', () => {
  let mockEditorState: EditorState;
  let mockTr: Transform;
  let mockDecorationSet: DecorationSet;

  beforeEach(() => {
    // Reset singleton before each test
    resetInstance();

    // Mock EditorState
    mockEditorState = {
      tr: {
        selection: {
          empty: false,
          from: 10,
        },
        deleteSelection: jest.fn().mockReturnThis(),
        setMeta: jest.fn().mockReturnThis(),
        mapping: {},
        doc: {},
      },
    } as unknown as EditorState;

    mockTr = mockEditorState.tr as unknown as Transform;

    // Mock DecorationSet
    mockDecorationSet = {
      find: jest.fn(),
      add: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      map: jest.fn().mockReturnThis(),
    } as unknown as DecorationSet;

    // Mock Decoration
    jest.spyOn(Decoration, 'widget').mockImplementation(() => ({} as any));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('specFinder', () => {
    it('should return true when spec matches placeholder ID', () => {
      const result = specFinder({ id: { name: 'CursorPlaceholderPlugin' } });
      expect(result).toBe(false);
    });

    it('should return false when spec does not match', () => {
      const result = specFinder({ id: { name: 'OtherPlugin' } });
      expect(result).toBe(false);
    });
  });

  describe('findCursorPlaceholderPos', () => {
    it('should return null when no plugin instance exists', () => {
      const result = findCursorPlaceholderPos(mockEditorState);
      expect(result).toBeNull();
    });

    it('should return position when decoration exists', () => {
      const plugin = new CursorPlaceholderPlugin();
      plugin.getState = jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue([{ from: 10 }]),
      });
      const result = findCursorPlaceholderPos(mockEditorState);
      expect(result).toBe(10);
    });

    it('should return null when no decoration exists', () => {
      const plugin = new CursorPlaceholderPlugin();
      plugin.getState = jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue([]),
      });
      const result = findCursorPlaceholderPos(mockEditorState);
      expect(result).toBeNull();
    });
  });

  describe('isPlugin', () => {
    it('should return true when plugin is null', () => {
      const result = isPlugin(null, mockTr);
      expect(result).toBe(true);
    });

    it('should return true when tr.selection is null', () => {
      const result = isPlugin({}, { selection: null });
      expect(result).toBe(true);
    });

    it('should return false when both plugin and tr.selection exist', () => {
      const result = isPlugin({}, mockTr);
      expect(result).toBe(false);
    });
  });

  describe('showCursorPlaceholder', () => {
    it('should return unchanged transaction when plugin check fails', () => {
      const result = showCursorPlaceholder(mockEditorState);
      expect(result).toBe(mockTr);
    });

    it('should delete selection when not empty and no existing placeholder', () => {
      const plugin = new CursorPlaceholderPlugin();
      plugin.getState = jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue([]),
      });
      const result = showCursorPlaceholder(mockEditorState);
      expect(mockTr.deleteSelection).toHaveBeenCalled();
    });

    it('should add placeholder meta when no existing placeholder', () => {
      const plugin = new CursorPlaceholderPlugin();
      plugin.getState = jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue([]),
      });
      const result = showCursorPlaceholder(mockEditorState);
      expect(mockTr.setMeta).toHaveBeenCalledWith(plugin, {
        add: { pos: mockTr.selection.from },
      });
    });

    it('should return unchanged transaction when placeholder already exists', () => {
      const plugin = new CursorPlaceholderPlugin();
      plugin.getState = jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue([{ from: 10 }]),
      });
      const result = showCursorPlaceholder(mockEditorState);
      expect(mockTr.setMeta).not.toHaveBeenCalled();
    });
  });

  describe('hideCursorPlaceholder', () => {
    it('should return unchanged transaction when no plugin exists', () => {
      const result = hideCursorPlaceholder(mockEditorState);
      expect(result).toBe(mockTr);
    });

    it('should add remove meta when placeholder exists', () => {
      const plugin = new CursorPlaceholderPlugin();
      plugin.getState = jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue([{ from: 10 }]),
      });
      const result = hideCursorPlaceholder(mockEditorState);
      expect(mockTr.setMeta).toHaveBeenCalledWith(plugin, { remove: {} });
    });

    it('should return unchanged transaction when no placeholder exists', () => {
      const plugin = new CursorPlaceholderPlugin();
      plugin.getState = jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue([]),
      });
      const result = hideCursorPlaceholder(mockEditorState);
      expect(mockTr.setMeta).not.toHaveBeenCalled();
    });
  });

  describe('resetInstance', () => {
  it('should reset the singleton instance', () => {
    // Create a new instance to set the singleton
    const plugin = new CursorPlaceholderPlugin();
    
    // Verify the singleton was set
    expect(getSingletonInstance()).toBe(plugin);
    
    // Reset the instance
    resetInstance();
    
    // Verify it's now null
    expect(getSingletonInstance()).toBeNull();
  });
});
});