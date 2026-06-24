/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {
  clipboardHasData,
  clipboardHasProseMirrorData,
  copySelectionPlain,
  copySelectionRich,
  createSourceContext,
  editorHasTextSelection,
  getDefaultMenuItems,
  pasteAsPlainText,
  pasteFromClipboard,
} from './FloatingMenuDefaults';
import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import type {FloatingMenuContext} from './model';
import type {Selection, Transaction} from 'prosemirror-state';
import { Node, ResolvedPos, Schema, Slice } from 'prosemirror-model';

describe('FloatingMenuDefaults', () => {
  describe('editorHasTextSelection', () => {
    it('should return undefined when text is selected', () => {
      const ctx: FloatingMenuContext = {
        editorView: {
          state: {
            selection: {
              empty: false,
            },
          },
        } as EditorView,
        editorState: {} as EditorState,
      };
      expect(editorHasTextSelection(ctx)).toBeUndefined();
    });

    it('should return error message when no text is selected', () => {
      const ctx: FloatingMenuContext = {
        editorView: {
          state: {
            selection: {
              empty: true,
            },
          },
        } as EditorView,
        editorState: {} as EditorState,
      };
      expect(editorHasTextSelection(ctx)).toBe('No text selected');
    });

    it('should handle undefined context', () => {
      expect(editorHasTextSelection(undefined!)).toBe('No text selected');
    });

    it('should handle context without editorView', () => {
      const ctx = {} as FloatingMenuContext;
      expect(editorHasTextSelection(ctx)).toBe('No text selected');
    });
  });

  describe('getDefaultMenuItems', () => {
    it('should return default menu items without config', () => {
      const items = getDefaultMenuItems();
      expect(items).toHaveLength(4);
      expect(items[0].label).toBe('Copy (Ctrl + C)');
      expect(items[1].label).toBe('Copy Without Formatting');
      expect(items[2].label).toBe('Paste (Ctrl + V)');
      expect(items[3].label).toBe('Paste As Plain Text');
    });

    it('should return menu items with config', () => {
      const mockHasClipboard = jest.fn(() => 'No clipboard data');
      const items = getDefaultMenuItems({
        hasClipboard: mockHasClipboard,
      });
      expect(items).toHaveLength(4);
      expect(items[2].disabled).toBe(mockHasClipboard);
      expect(items[3].disabled).toBe(mockHasClipboard);
    });

    it('should set isEdit flag correctly', () => {
      const items = getDefaultMenuItems();
      expect(items[0].isEdit).toBeUndefined();
      expect(items[1].isEdit).toBeUndefined();
      expect(items[2].isEdit).toBe(true);
      expect(items[3].isEdit).toBe(true);
    });
  });

  describe('copySelectionRich', () => {
    let mockView: Partial<EditorView>;
    let mockState: Partial<EditorState>;
    let mockContext: FloatingMenuContext;

    beforeEach(() => {
      mockState = {
        selection: {
          empty: false,
          content: jest.fn(() => ({
            content: {
              toJSON: jest.fn(() => ({type: 'paragraph'})),
            },
            openStart: 0,
            openEnd: 0,
          })),
          $from: {
            start: jest.fn(() => 0),
            depth: 0,
          } as unknown as ResolvedPos,
          $to: {
            end: jest.fn(() => 10),
            depth: 0,
          } as unknown as ResolvedPos,
        } as unknown as Selection,
        doc: {
          attrs: {
            objectId: 'doc123',
          },
          nodesBetween: jest.fn(),
        } as unknown as Node,
      };
      mockView = {
        state: mockState as EditorState,
        hasFocus: jest.fn(() => true),
        focus: jest.fn(),
      };
      mockContext = {
        editorView: mockView as EditorView,
        editorState: mockState as EditorState,
        paragraphPos: 0,
      };
      jest.clearAllMocks();
    });

    it('should copy rich text selection', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(() => Promise.resolve('')),
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      (mockView.state?.doc.nodesBetween as jest.Mock).mockImplementation(() => {});
      await copySelectionRich(mockContext);
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it('should focus view if not focused', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(() => Promise.resolve('')),
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockView.hasFocus = jest.fn(() => false);
      await copySelectionRich(mockContext).catch(() => undefined);
      expect(mockView.focus).toHaveBeenCalled();
    });

    it('should handle clipboard write errors', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(() => Promise.reject(new Error('Clipboard error'))),
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      (mockView.state?.doc.nodesBetween as jest.Mock).mockImplementation(() => {});
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await copySelectionRich(mockContext);
      expect(consoleSpy).toHaveBeenCalledWith('Clipboard write failed', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('copySelectionPlain', () => {
    let mockView: Partial<EditorView>;
    let mockState: Partial<EditorState>;
    let mockContext: FloatingMenuContext;

    beforeEach(() => {
      mockState = {
        selection: {
          from: 0,
          to: 5,
          empty: false,
        } as unknown as Selection,
        doc: {
          slice: jest.fn(() => ({
            content: {
              textBetween: jest.fn(() => 'sample text'),
            },
          })) as unknown as () => Slice,
        } as unknown as Node,
      };
      mockView = {
        state: mockState as EditorState,
        hasFocus: jest.fn(() => true),
        focus: jest.fn(),
      };
      mockContext = {
        editorView: mockView as EditorView,
        editorState: mockState as EditorState,
        paragraphPos: 0,
      };
      jest.clearAllMocks();
    });

    it('should copy plain text selection', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(() => Promise.resolve('')),
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      await copySelectionPlain(mockContext);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('sample text');
    });

    it('should not copy when selection is empty', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(() => Promise.resolve('')),
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      const emptyState = {
        selection: {
          from: 0,
          to: 0,
          empty: true,
        },
        doc: {
          slice: jest.fn(() => ({
            content: {
              textBetween: jest.fn(() => ''),
            },
          })),
        },
      } as unknown as EditorState;
      mockView.state = emptyState;
      mockContext.editorView = mockView as EditorView;
      mockContext.editorState = emptyState;
      await copySelectionPlain(mockContext);
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it('should focus view if not focused', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(() => Promise.resolve('')),
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockView.hasFocus = jest.fn(() => false);
      await copySelectionPlain(mockContext);
      expect(mockView.focus).toHaveBeenCalled();
    });

    it('should handle clipboard write errors', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(() => Promise.resolve('')),
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await copySelectionPlain(mockContext);
      expect(consoleSpy).toHaveBeenCalledWith('Clipboard write failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('pasteFromClipboard', () => {
    let mockView: Partial<EditorView>;
    let mockState: Partial<EditorState>;
    let mockDispatch: jest.Mock;
    let mockTr: Partial<Transaction>;
    let mockContext: FloatingMenuContext;

    beforeEach(() => {
      const scrollMock = jest.fn(() => mockTr) as unknown as () => Transaction;
      mockTr = {
        scrollIntoView: scrollMock,
      };
      mockDispatch = jest.fn();
      mockState = {
        selection: {
          from: 0,
          to: 0,
        } as unknown as Selection,
        tr: mockTr as Transaction,
        schema: {} as Schema,
      };
      mockView = {
        state: mockState as EditorState,
        hasFocus: jest.fn(() => true),
        focus: jest.fn(),
        dispatch: mockDispatch,
      };
      mockContext = {
        editorView: mockView as EditorView,
        editorState: mockState as EditorState,
        paragraphPos: 0,
      };
      jest.clearAllMocks();
    });

    it('should paste plain text from clipboard', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockClipboard.readText.mockResolvedValue('plain text');
      if (mockState.tr) {
        (mockState.tr as unknown as Record<string, unknown>).insertText = jest.fn(() => mockTr);
      }
      
      await pasteFromClipboard(mockContext);
      expect(mockState.tr?.insertText).toHaveBeenCalledWith('plain text', 0, 0);
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should paste JSON/ProseMirror data from clipboard', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      const jsonData = JSON.stringify({
        content: [{type: 'paragraph', content: [{type: 'text', text: 'formatted'}]}],
        openStart: 0,
        openEnd: 0,
      });
      mockClipboard.readText.mockResolvedValue(jsonData);
      const spy = jest.fn(() => mockTr);
      jest.spyOn(Slice, 'fromJSON').mockImplementation(() => {
        return {} as Slice;
      });
      if (mockState.tr) {
        (mockState.tr as unknown as Record<string, unknown>).replaceSelection = spy;
      }
      
      await pasteFromClipboard(mockContext);
      expect(spy).toHaveBeenCalled();
    });

    it('should focus view if not focused', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockClipboard.readText.mockResolvedValue('text');
      mockView.hasFocus = jest.fn(() => false);
      if (mockState.tr) {
        (mockState.tr as unknown as Record<string, unknown>).insertText = jest.fn(() => mockTr);
      }
      
      await pasteFromClipboard(mockContext);
      expect(mockView.focus).toHaveBeenCalled();
    });

    it('should handle clipboard read errors', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockClipboard.readText.mockRejectedValue(new Error('Clipboard error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await pasteFromClipboard(mockContext);
      expect(consoleSpy).toHaveBeenCalledWith('Clipboard paste failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('pasteAsPlainText', () => {
    let mockView: Partial<EditorView>;
    let mockState: Partial<EditorState>;
    let mockDispatch: jest.Mock;
    let mockTr: Partial<Transaction>;
    let mockContext: FloatingMenuContext;

    beforeEach(() => {
      const scrollMock = jest.fn(() => mockTr) as unknown as () => Transaction;
      mockTr = {
        scrollIntoView: scrollMock,
      };
      mockDispatch = jest.fn();
      mockState = {
        selection: {
          from: 0,
          to: 0,
        } as unknown as Selection,
        tr: mockTr as unknown as Transaction,
        schema: {} as Schema,
      };
      mockView = {
        state: mockState as EditorState,
        hasFocus: jest.fn(() => true),
        focus: jest.fn(),
        dispatch: mockDispatch,
      };
      mockContext = {
        editorView: mockView as EditorView,
        editorState: mockState as EditorState,
        paragraphPos: 0,
      };
      jest.clearAllMocks();
    });

    it('should paste as plain text', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockClipboard.readText.mockResolvedValue('some text');
      if (mockState.tr) {
        (mockState.tr as unknown as Record<string, unknown>).insertText = jest.fn(() => mockTr);
      }
      
      await pasteAsPlainText(mockContext);
      expect(mockState.tr?.insertText).toHaveBeenCalledWith('some text', 0, 0);
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should convert JSON to plain text', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      const jsonData = JSON.stringify({
        content: [{type: 'paragraph', content: [{type: 'text', text: 'formatted'}]}],
      });
      mockClipboard.readText.mockResolvedValue(jsonData);
      
      // Mock Slice.fromJSON to return a fragment with forEach
      const mockFragment = {
        forEach: jest.fn((callback: (node: {textContent: string}) => void) => {
          callback({textContent: 'formatted'});
          callback({textContent: 'text'});
        }),
      };
      const mockSlice = { content: mockFragment } as unknown as Slice;
      jest.spyOn(Slice, 'fromJSON').mockReturnValue(mockSlice);
      
      if (mockState.tr) {
        (mockState.tr as unknown as Record<string, unknown>).insertText = jest.fn(() => mockTr);
      }
      
      await pasteAsPlainText(mockContext);
      expect(mockState.tr?.insertText).toHaveBeenCalled();
      expect(mockFragment.forEach).toHaveBeenCalled();
    });

    it('should focus view if not focused', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockClipboard.readText.mockResolvedValue('text');
      mockView.hasFocus = jest.fn(() => false);
      if (mockState.tr) {
        (mockState.tr as unknown as Record<string, unknown>).insertText = jest.fn(() => mockTr);
      }
      
      await pasteAsPlainText(mockContext);
      expect(mockView.focus).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Mock the clipboard API
      const mockClipboard = {
        writeText: jest.fn(),
        readText: jest.fn(),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });
      mockClipboard.readText.mockRejectedValue(new Error('Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await pasteAsPlainText(mockContext);
      expect(consoleSpy).toHaveBeenCalledWith('Plain text paste failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('createSourceContext', () => {
    let mockView: Partial<EditorView>;

    beforeEach(() => {
      mockView = {
        focus: jest.fn(),
        state: {
          doc: {
            attrs: {
              objectId: 'doc123',
            },
            nodesBetween: jest.fn(),
          },
          selection: {
            $from: {
              start: jest.fn(() => 0),
              depth: 0,
            },
            $to: {
              end: jest.fn(() => 10),
              depth: 0,
            },
          },
        },
      } as unknown as Partial<EditorView>;
      jest.clearAllMocks();
    });

    it('should create source context with paragraph nodes', () => {
      const mockParagraphs = [
        {type: {name: 'paragraph'}, attrs: {objectId: 'para1'}, textContent: 'First paragraph'},
        {type: {name: 'paragraph'}, attrs: {objectId: 'para2'}, textContent: 'Second paragraph'},
      ];
      
      (mockView.state?.doc.nodesBetween as jest.Mock).mockImplementation((...args: unknown[]) => {
        const callback = args[2] as (node: unknown, pos: number) => void;
        mockParagraphs.forEach((node, i) => callback(node, i * 10));
      });

      const context = createSourceContext(mockView as EditorView, 20);
      
      expect(context.source).toBe('doc123');
      expect(context.from).toBe('para1');
      expect(context.to).toBe('para2');
      expect(context.ids).toEqual(['para1', 'para2']);
      expect(context.initialText).toBe('First paragraph');
    });

    it('should handle empty paragraph text', () => {
      (mockView.state?.doc.nodesBetween as jest.Mock).mockImplementation((...args: unknown[]) => {
        const callback = args[2] as (node: unknown, pos: number) => void;
        callback({type: {name: 'paragraph'}, attrs: {objectId: 'para1'}, textContent: ''}, 0);
      });

      const context = createSourceContext(mockView as EditorView);
      expect(context.initialText).toBe('Untitled');
    });

    it('should handle non-paragraph nodes', () => {
      (mockView.state?.doc.nodesBetween as jest.Mock).mockImplementation((...args: unknown[]) => {
        const callback = args[2] as (node: unknown, pos: number) => void;
        callback({type: {name: 'heading'}, attrs: {}, textContent: 'Heading'}, 0);
      });

      const context = createSourceContext(mockView as EditorView);
      expect(context.ids).toEqual([]);
      expect(context.initialText).toBe('Untitled');
    });

    it('should focus the view', () => {
      (mockView.state?.doc.nodesBetween as jest.Mock).mockImplementation(() => {});
      createSourceContext(mockView as EditorView);
      expect(mockView.focus).toHaveBeenCalled();
    });

    it('should limit initial text length', () => {
      const longText = 'A'.repeat(50);
      (mockView.state?.doc.nodesBetween as jest.Mock).mockImplementation((...args: unknown[]) => {
        const callback = args[2] as (node: unknown, pos: number) => void;
        callback({type: {name: 'paragraph'}, attrs: {}, textContent: longText}, 0);
      });

      const context = createSourceContext(mockView as EditorView, 10);
      expect(context.initialText).toHaveLength(10);
    });
  });

  describe('clipboardHasData', () => {
    it('should return true when clipboard has data', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.resolve('some text')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasData();
      expect(result).toBe(true);
      expect(mockClipboard.readText).toHaveBeenCalled();
    });

    it('should return false when clipboard is empty', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasData();
      expect(result).toBe(false);
    });

    it('should return false when clipboard read fails', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.reject(new Error('Clipboard error'))),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasData();
      expect(result).toBe(false);
    });
  });

  describe('clipboardHasProseMirrorData', () => {
    it('should return true for valid ProseMirror JSON with array content', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.resolve(JSON.stringify({
          content: [{type: 'paragraph'}],
          openStart: 0,
          openEnd: 0,
        }))),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasProseMirrorData();
      expect(result).toBe(true);
    });

    it('should return true for valid ProseMirror JSON with object content', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.resolve(JSON.stringify({
          content: {type: 'paragraph'},
          openStart: 0,
          openEnd: 0,
        }))),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasProseMirrorData();
      expect(result).toBe(true);
    });

    it('should return false for plain text', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.resolve('plain text')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasProseMirrorData();
      expect(result).toBe(false);
    });

    it('should return false for empty clipboard', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.resolve('')),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasProseMirrorData();
      expect(result).toBe(false);
    });

    it('should return false for JSON without content property', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.resolve(JSON.stringify({
          openStart: 0,
          openEnd: 0,
        }))),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasProseMirrorData();
      expect(result).toBe(false);
    });

    it('should return false when clipboard read fails', async () => {
      const mockClipboard = {
        readText: jest.fn(() => Promise.reject(new Error('Clipboard error'))),
      };

      Object.assign(globalThis.navigator, {
        clipboard: mockClipboard,
      });

      const result = await clipboardHasProseMirrorData();
      expect(result).toBe(false);
    });
  });
});
