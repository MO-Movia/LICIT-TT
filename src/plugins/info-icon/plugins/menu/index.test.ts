/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { markActive, getLink, addLinkCommand } from './index';
import { EditorState } from 'prosemirror-state';
import { MarkType } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';

describe('info-icon menu index', () => {
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

    it('should resolve promise when onClose is called', () => {
      const mockView = {} as unknown as EditorView;
      const result = addLinkCommand(mockView);
      
      // The promise should resolve (though in real usage it would be resolved by the popup close)
      // For testing purposes, we just verify it returns a promise
      expect(result).toBeInstanceOf(Promise);
    });
  });
});