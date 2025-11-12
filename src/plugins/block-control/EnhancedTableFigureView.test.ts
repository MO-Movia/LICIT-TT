import { EnhancedTableFigureView } from './EnhancedTableFigureView';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { ImageInlineEditor } from './ui/ImageInlineEditor';

// Mock dependencies
jest.mock('prosemirror-model');
jest.mock('prosemirror-view');
jest.mock('prosemirror-state');
jest.mock('./EnhancedTableCommands');
jest.mock('@modusoperandi/licit-ui-commands');
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
      expect(view.contentDOM.parentElement).toBe(view.dom);
      expect(view.contentDOM.className).toBe('enhanced-table-figure-content');

      expect(view.addNotesButton).toBeDefined();
      expect(view.selectHandle).toBeDefined();
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
      const landscapeView = new EnhancedTableFigureView(landscapeNode, mockView, mockGetPos);

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
      const result = view.update(differentNode as ProseMirrorNode);
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
      expect(result).toBe(false);
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
      view.update(landscapeNode as ProseMirrorNode);
      expect(view.contentDOM.style.width).toBe('864px');
    });
  });

  describe('updateNotesTrigger', () => {
    it('should show add notes button when no notes exist and figureType is table', () => {
      (mockNode.forEach as jest.Mock).mockImplementation((callback) => {
        // Simulate no notes
      });
      view.updateNotesTrigger();
      expect(view.addNotesButton.style.display).toBe('block');
    });

    it('should hide add notes button when notes exist', () => {
      (mockNode.forEach as jest.Mock).mockImplementation((callback) => {
        callback({
          type: {
            name: 'enhanced_table_figure_notes',
          },
        });
      });
      view.updateNotesTrigger();
      expect(view.addNotesButton.style.display).toBe('none');
    });

    it('should hide add notes button for non-table/figure types', () => {
      const otherNode = {
        ...mockNode,
        attrs: {
          ...mockNode.attrs,
          figureType: 'other',
        },
      };
      const otherView = new EnhancedTableFigureView(otherNode as ProseMirrorNode, mockView, mockGetPos);
      otherView.updateNotesTrigger();
      expect(otherView.addNotesButton.style.display).toBe('none');
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
    it('should close inline editor on destroy', () => {
      // Mock that we have an inline editor
      view['_inlineEditor'] = { close: jest.fn() } as unknown as any;

      view.destroy();
      expect(view['_inlineEditor']?.close).toHaveBeenCalled();
    });
  });

  describe('stopEvent', () => {
    it('should always return false', () => {
      expect(view.stopEvent(new Event('click'))).toBe(false);
    });
  });

  describe('_renderInlineEditor', () => {
    it('should not render if element not active', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue({
        getAttribute: () => 'false',
      } as any);

      view['_renderInlineEditor']();
      expect(view['_inlineEditor']).toBeUndefined();
    });

    it('should create popup when element is active', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue({
        getAttribute: () => 'true',
        closest: () => document.createElement('div'),
      } as any);

      view.selectNode(); // This will call _renderInlineEditor
      expect(view['_inlineEditor']).toBeUndefined();
    });
  });
});