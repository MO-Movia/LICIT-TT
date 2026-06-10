/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EnhancedTableFigureView } from './EnhancedTableFigureView';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';

// Mock dependencies
jest.mock('prosemirror-model');
jest.mock('prosemirror-view');
jest.mock('prosemirror-state');
jest.mock('./EnhancedTableCommands');
jest.mock('../../commands');
jest.mock('./ui/ImageInlineEditor');

describe('EnhancedTableFigureView', () => {
  let mockNode: ProseMirrorNode;
  let mockView: EditorView;
  let mockGetPos: jest.Mock;
  let view: EnhancedTableFigureView;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock node
    mockNode = {
      attrs: {
        id: 'test-id',
        figureType: 'table',
        orientation: 'portrait',
      },
      type: {
        name: 'enhanced_table_figure',
      },
      forEach: jest.fn(),
    } as unknown as ProseMirrorNode;

    // Setup mock view
    mockView = {
      state: {
        tr: {},
        schema: {},
        selection: {},
        doc: {},
      },
      dispatch: jest.fn(),
    } as unknown as EditorView;

    mockGetPos = jest.fn().mockReturnValue(10);

    // Create instance
    view = new EnhancedTableFigureView(mockNode, mockView, mockGetPos);
  });

  describe('constructor', () => {
    it('should initialize with correct DOM structure', () => {
      expect(view.dom).toBeDefined();
      expect(view.dom.tagName).toBe('DIV');
      expect(view.dom.className).toBe('enhanced-table-figure has-hover-handle');
      expect(view.dom.getAttribute('data-type')).toBe('enhanced-table-figure');
      expect(view.dom.getAttribute('data-id')).toBe('test-id');
      expect(view.dom.getAttribute('data-figure-type')).toBe('table');

      expect(view.contentDOM).toBeDefined();
      expect(view.contentScrollDOM.parentElement).toBe(view.dom);
      expect(view.contentDOM.parentElement).toBe(view.contentScrollDOM);
      expect(view.contentDOM.className).toBe('enhanced-table-figure-content');

      expect(view.selectHandle).toBeDefined();
      expect(view.selectHandle.getAttribute('aria-label')).toBe(
        'Enhanced content options'
      );
    });

    it('should set correct styles for portrait orientation', () => {
      expect(view.dom.style.width).toBe('624px');
      expect(view.dom.style.maxWidth).toBe('624px');
      expect(view.contentDOM.style.width).toBe('100%');
    });

    it('should set correct styles for landscape orientation', () => {
      const landscapeNode = {
        ...mockNode,
        attrs: {
          ...mockNode.attrs,
          orientation: 'landscape',
        },
      };
      const landscapeView = new EnhancedTableFigureView(
        landscapeNode as unknown as ProseMirrorNode,
        mockView,
        mockGetPos
      );

      expect(landscapeView.dom.style.width).toBe('624px');
      expect(landscapeView.dom.style.maxWidth).toBe('624px');
      expect(landscapeView.contentDOM.style.width).toBe('864px');
    });
  });

  describe('update', () => {
    it('should return false for different node type', () => {
      const differentNode = {
        ...mockNode,
        type: {
          name: 'different_type',
        },
      };
      const result = view.update(differentNode as unknown as ProseMirrorNode);
      expect(result).toBe(false);
    });

    it('should update node and return true for same type', () => {
      const updatedNode = {
        ...mockNode,
        attrs: {
          ...mockNode.attrs,
          id: 'new-id',
          figureType: 'figure',
        },
      };
      const result = view.update(updatedNode as unknown as ProseMirrorNode);
      expect(result).toBe(true);
      expect(view.node).toBe(updatedNode);
      expect(view.dom.getAttribute('data-id')).toBe('new-id');
      expect(view.dom.getAttribute('data-figure-type')).toBe('figure');
    });

    it('should update styles for landscape orientation', () => {
      const landscapeNode = {
        ...mockNode,
        attrs: {
          ...mockNode.attrs,
          orientation: 'landscape',
        },
      };
      view.update(landscapeNode as unknown as ProseMirrorNode);
      expect(view.contentDOM.style.width).toBe('864px');
    });
  });

  describe('updateNotesTrigger', () => {
    it('should remain a no-op compatibility shim', () => {
      (mockNode.forEach as jest.Mock).mockImplementation(() => undefined); // Simulate no notes
      expect(view.updateNotesTrigger()).toBeUndefined();
    });
  });

  describe('selection handling', () => {
    it('should add selected class on selectNode', () => {
      view.selectNode();
      expect(view.dom.classList.contains('ProseMirror-selectednode')).toBe(true);
      expect(view.dom.getAttribute('data-active')).toBe('true');
    });

    it('should remove selected class on deselectNode', () => {
      view.selectNode();
      view.deselectNode();
      expect(view.dom.classList.contains('ProseMirror-selectednode')).toBe(false);
      expect(view.dom.getAttribute('data-active')).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('should close open menu and crop editor on destroy', () => {
      const menu = {close: jest.fn()};
      const cropEditor = {close: jest.fn()};
      view._menu = menu as unknown as EnhancedTableFigureView['_menu'];
      view._cropEditor =
        cropEditor as unknown as EnhancedTableFigureView['_cropEditor'];

      view.destroy();
      expect(menu.close).toHaveBeenCalled();
      expect(cropEditor.close).toHaveBeenCalled();
    });
  });

  describe('stopEvent', () => {
    it('should stop events from the hamburger handle', () => {
      const event = new Event('click');
      Object.defineProperty(event, 'target', {
        value: view.selectHandle,
      });

      expect(view.stopEvent(event)).toBe(true);
    });

    it('should allow non-handle events through', () => {
      const event = new Event('click');
      Object.defineProperty(event, 'target', {
        value: document.createElement('div'),
      });

      expect(view.stopEvent(event)).toBe(false);
    });
  });

  describe('menu items', () => {
    it('should expose table actions without image-only actions for table figures', () => {
      const items = view['getMenuItems']().filter((item) => !item.hidden);
      const ids = items.map((item) => item.id);

      expect(ids).toEqual([
        'insert-above',
        'insert-below',
        'add-notes',
        'delete',
      ]);
    });
  });
});
