/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import menuBarPlugin, { markActive, getLink, addLinkCommand } from './index';
import { EditorState } from 'prosemirror-state';
import { MarkType } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';

const mockCreatePopUp = jest.fn<unknown, unknown[]>();
const mockRenderGrouped = jest.fn<unknown, []>(() => ({
  dom: document.createElement('div'),
  update: jest.fn(),
}));

jest.mock('../../../../commands', () => ({
  createPopUp: (...args: unknown[]): unknown => mockCreatePopUp(...args),
}));

jest.mock('prosemirror-menu', () => {
  const actual =
    jest.requireActual<Record<string, unknown>>('prosemirror-menu');
  return {
    ...actual,
    renderGrouped: (_view: unknown, _content: unknown) => {
      mockRenderGrouped();
      return {
        dom: document.createElement('div'),
        update: jest.fn(),
      };
    },
  };
});

describe('info-icon menu index', () => {
  beforeEach(() => {
    mockCreatePopUp.mockReset();
    mockCreatePopUp.mockReturnValue({ close: jest.fn(), update: jest.fn() });
    mockRenderGrouped.mockClear();
  });

  describe('markActive', () => {
    it('should return false for empty selection without stored marks', () => {
      const mockState = {
        selection: {
          from: 0,
          to: 0,
          empty: true,
          $from: {
            marks: () => [],
          },
        },
        storedMarks: null,
      } as unknown as EditorState;
      
      const mockMarkType = {
        isInSet: () => false,
      } as unknown as MarkType;
      
      expect(markActive(mockState, mockMarkType)).toBe(false);
    });

    it('should return true for empty selection with stored marks', () => {
      const mockMark = { type: 'test' };
      const mockState = {
        selection: {
          from: 0,
          to: 0,
          empty: true,
          $from: {
            marks: () => [],
          },
        },
        storedMarks: [mockMark],
      } as unknown as EditorState;
      
      const mockMarkType = {
        isInSet: () => true,
      } as unknown as MarkType;
      
      expect(markActive(mockState, mockMarkType)).toBe(true);
    });

    it('should return true for non-empty selection with mark in range', () => {
      const mockState = {
        selection: {
          from: 0,
          to: 5,
          empty: false,
          $from: {
            marks: () => [],
          },
        },
        storedMarks: null,
        doc: {
          rangeHasMark: () => true,
        },
      } as unknown as EditorState;
      
      const mockMarkType = {} as unknown as MarkType;
      
      expect(markActive(mockState, mockMarkType)).toBe(true);
    });

    it('should return false for non-empty selection without mark in range', () => {
      const mockState = {
        selection: {
          from: 0,
          to: 5,
          empty: false,
          $from: {
            marks: () => [],
          },
        },
        storedMarks: null,
        doc: {
          rangeHasMark: () => false,
        },
      } as unknown as EditorState;
      
      const mockMarkType = {} as unknown as MarkType;
      
      expect(markActive(mockState, mockMarkType)).toBe(false);
    });
  });

  describe('getLink', () => {
    it('should extract text content from selection', () => {
      const mockView = {
        state: {
          selection: {
            from: 0,
            to: 5,
          },
          doc: {
            cut: () => ({
              textContent: 'test',
            }),
          },
        },
      } as unknown as EditorView;
      
      expect(getLink(mockView)).toBe('test');
    });

    it('should trim whitespace from extracted text', () => {
      const mockView = {
        state: {
          selection: {
            from: 0,
            to: 5,
          },
          doc: {
            cut: () => ({
              textContent: '  test  ',
            }),
          },
        },
      } as unknown as EditorView;
      
      expect(getLink(mockView)).toBe('test');
    });
  });

  describe('addLinkCommand', () => {
    it('should return a promise', () => {
      const mockView = {} as unknown as EditorView;
      const result = addLinkCommand(mockView);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve promise when onClose is called', async () => {
      const mockView = {} as unknown as EditorView;
      const result = addLinkCommand(mockView);

      const [, , popUpProps] = mockCreatePopUp.mock.calls[0] as [
        unknown,
        unknown,
        { onClose: (value: string) => void },
      ];
      popUpProps.onClose('done');

      await expect(result).resolves.toBe('done');
    });
  });

  describe('menuBarPlugin', () => {
    it('returns null when the editor has no parent node', () => {
      const plugin = menuBarPlugin();
      const pluginView = plugin.spec.view({
        dom: document.createElement('div'),
      } as unknown as EditorView);

      expect(pluginView).toBeNull();
    });

    it('renders grouped menu content when a parent node exists', () => {
      const plugin = menuBarPlugin();
      const host = document.createElement('div');
      const editorDom = document.createElement('div');
      host.appendChild(editorDom);
      const state = {
        schema: {
          marks: {
            strong: {},
            em: {},
            link: {},
          },
        },
      } as unknown as EditorState;
      const view = {
        dom: editorDom,
        state,
      } as unknown as EditorView;

      const pluginView = plugin.spec.view(view);

      expect(pluginView).toBeDefined();
      expect(mockRenderGrouped).toHaveBeenCalled();
      expect(host.querySelector('.ProseMirror-menubar')).not.toBeNull();
    });
  });
});
