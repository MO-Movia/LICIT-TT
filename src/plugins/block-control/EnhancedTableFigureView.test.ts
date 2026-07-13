/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EnhancedTableFigureView } from './EnhancedTableFigureView';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import * as EnhancedTableCommands from './EnhancedTableCommands';
import * as commandHelpers from '../../commands';

// Mock dependencies
jest.mock('prosemirror-model');
jest.mock('prosemirror-view');
jest.mock('prosemirror-state');
jest.mock('./EnhancedTableCommands');
jest.mock('../../commands');
jest.mock('./ui/Icon', () => ({
  __esModule: true,
  Icon: {
    get: jest.fn(() => null),
  },
}));
jest.mock('./ui/ImageInlineEditor', () => ({
  __esModule: true,
  ImageInlineEditor: jest.fn(() => null),
}));

describe('EnhancedTableFigureView', () => {
  let mockNode: ProseMirrorNode;
  let mockView: EditorView;
  let mockGetPos: jest.Mock;
  let view: EnhancedTableFigureView;

  const createNode = (
    typeName: string,
    attrs: Record<string, unknown> = {},
    children: ProseMirrorNode[] = []
  ) =>
    ({
      attrs,
      type: { name: typeName },
      childCount: children.length,
      child: (index: number) => children[index],
      nodeSize:
        children.reduce((size, child) => size + (child.nodeSize || 1), 2) || 2,
      marks: [],
    }) as unknown as ProseMirrorNode;

  const createFigureNode = (
    attrs: Record<string, unknown>,
    children: ProseMirrorNode[] = []
  ) =>
    createNode(
      'enhanced_table_figure',
      {
        id: 'test-id',
        figureType: 'figure',
        orientation: 'portrait',
        ...attrs,
      },
      children
    );

  const getMenuItem = (id: string) =>
    view['getMenuItems']().find((item) => item.id === id);

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

  afterEach(() => {
    jest.restoreAllMocks();
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
      expect(landscapeView.contentDOM.style.width).toBe('100%');
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
      expect(view.contentDOM.style.width).toBe('100%');
    });

    it('should include maximized and selected classes during update', () => {
      view.selectNode();
      const updatedNode = {
        ...mockNode,
        attrs: {
          ...mockNode.attrs,
          orientation: 'landscape',
          maximized: true,
        },
      };

      view.update(updatedNode as unknown as ProseMirrorNode);

      expect(view.dom.classList.contains('landscape')).toBe(true);
      expect(view.dom.classList.contains('maximized')).toBe(true);
      expect(view.dom.classList.contains('ProseMirror-selectednode')).toBe(true);
      expect(view.dom.dataset.maximized).toBe('true');
    });
  });

  describe('node actions', () => {
    it('should dispatch resize attrs on resize end', () => {
      const setNodeMarkup = jest.fn().mockReturnValue('resize-tr');
      mockView.state = {
        ...mockView.state,
        tr: { setNodeMarkup },
      } as unknown as EditorView['state'];

      view.onResizeEnd(700, 400);

      expect(setNodeMarkup).toHaveBeenCalledWith(10, undefined, {
        ...mockNode.attrs,
        width: 700,
        height: 400,
      });
      expect(mockView.dispatch).toHaveBeenCalledWith('resize-tr');
    });

    it('should insert paragraphs above and below the figure', () => {
      const paragraph = { type: 'paragraph' };
      const tr = {
        doc: {},
        insert: jest.fn().mockReturnThis(),
        setSelection: jest.fn().mockReturnThis(),
      };
      mockNode = {
        ...mockNode,
        nodeSize: 8,
      } as unknown as ProseMirrorNode;
      view.node = mockNode;
      mockView.state = {
        ...mockView.state,
        tr,
        schema: {
          nodes: {
            paragraph: {
              create: jest.fn().mockReturnValue(paragraph),
            },
          },
        },
      } as unknown as EditorView['state'];
      (TextSelection.create as jest.Mock).mockReturnValue('text-selection');

      getMenuItem('insert-above')?.action();
      getMenuItem('insert-below')?.action();

      expect(tr.insert).toHaveBeenNthCalledWith(1, 10, paragraph);
      expect(tr.insert).toHaveBeenNthCalledWith(2, 18, paragraph);
      expect(tr.setSelection).toHaveBeenCalledWith('text-selection');
      expect(mockView.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should dispatch add notes and delete actions', () => {
      const tr = {
        delete: jest.fn().mockReturnValue('delete-tr'),
      };
      mockNode = {
        ...mockNode,
        nodeSize: 6,
      } as unknown as ProseMirrorNode;
      view.node = mockNode;
      mockView.state = {
        ...mockView.state,
        tr,
        schema: { nodes: {} },
      } as unknown as EditorView['state'];
      jest
        .spyOn(EnhancedTableCommands, 'addNotesCommand')
        .mockReturnValue('notes-tr' as never);

      getMenuItem('add-notes')?.action();
      getMenuItem('delete')?.action();

      expect(EnhancedTableCommands.addNotesCommand).toHaveBeenCalledWith(
        tr,
        mockView.state.schema,
        10
      );
      expect(tr.delete).toHaveBeenCalledWith(10, 16);
      expect(mockView.dispatch).toHaveBeenCalledWith('notes-tr');
      expect(mockView.dispatch).toHaveBeenCalledWith('delete-tr');
    });
  });

  describe('updateNotesTrigger', () => {
    it('should remain a no-op compatibility shim', () => {
      (mockNode.forEach as jest.Mock).mockImplementation(() => undefined); // Simulate no notes
      expect(view.updateNotesTrigger()).toBeUndefined();
    });
  });

  describe('notes detection', () => {
    it('should detect existing notes child nodes', () => {
      view.node = createFigureNode({}, [
        createNode('paragraph'),
        createNode('enhanced_table_figure_notes'),
      ]);

      expect(view.hasNotes()).toBe(true);
    });

    it('should return false when no notes child exists', () => {
      view.node = createFigureNode({}, [createNode('paragraph')]);

      expect(view.hasNotes()).toBe(false);
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
      const menu = { close: jest.fn() };
      const cropEditor = { close: jest.fn() };
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

    it('should allow events without a DOM node target through', () => {
      const event = new Event('click');
      Object.defineProperty(event, 'target', {
        value: null,
      });

      expect(view.stopEvent(event)).toBe(false);
    });
  });

  describe('menu handling', () => {
    it('should open the block menu and clear it on popup close', () => {
      const close = jest.fn();
      const createPopUp = jest
        .spyOn(commandHelpers, 'createPopUp')
        .mockReturnValue({ close } as never);
      const frameBody = document.createElement('div');
      frameBody.className = 'czi-editor-frame-body';
      frameBody.appendChild(view.dom);
      document.body.appendChild(frameBody);

      view.selectHandle.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(createPopUp).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          items: expect.any(Array),
        }),
        expect.objectContaining({
          anchor: view.selectHandle,
          autoDismiss: true,
          container: frameBody,
        })
      );

      const options = createPopUp.mock.calls[0][2] as { onClose: () => void };
      options.onClose();
      expect(view._menu).toBeUndefined();
      frameBody.remove();
    });

    it('should close an already open menu when handle is clicked again', () => {
      const close = jest.fn();
      view._menu = { close } as unknown as EnhancedTableFigureView['_menu'];

      view.selectHandle.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(close).toHaveBeenCalledWith(undefined);
      expect(view._menu).toBeUndefined();
    });
  });

  describe('menu items', () => {
    it('should expose table actions without image-only actions for table figures', () => {
      const items = view['getMenuItems']().filter((item) => !item.hidden);
      const ids = items.map((item) => item.id);

      expect(ids).toEqual([
        'insert-above',
        'insert-below',
        'apply-style',
        'add-notes',
        'delete',
      ]);
    });

    it('should expose image actions for figure nodes with a nested image', () => {
      const image = createNode('image', { src: 'data:image/png;base64,a' });
      const wrapper = createNode('paragraph', {}, [image]);
      view.node = createFigureNode({ figureType: 'figure' }, [wrapper]);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { read: jest.fn() },
      });

      const items = view['getMenuItems']();

      expect(items.find((item) => item.id === 'crop')?.hidden).toBe(false);
      expect(items.find((item) => item.id === 'crop')?.disabled).toBe(false);
      expect(items.find((item) => item.id === 'paste-clipboard')?.disabled).toBe(
        false
      );
    });

    it('should hide add notes when notes already exist', () => {
      view.node = createFigureNode({ figureType: 'figure' }, [
        createNode('enhanced_table_figure_notes'),
      ]);

      expect(getMenuItem('add-notes')?.hidden).toBe(true);
    });

    it('should disable image actions when figure has no image', () => {
      view.node = createFigureNode({ figureType: 'figure' }, [
        createNode('paragraph'),
      ]);

      expect(getMenuItem('crop')?.disabled).toBe(true);
      expect(getMenuItem('reset-crop')?.disabled).toBe(true);
      expect(getMenuItem('choose-file')?.disabled).toBe(true);
    });

    it('should continue searching after non-image descendants', () => {
      const text = createNode('text', {}, []);
      const paragraph = createNode('paragraph', {}, [text]);
      view.node = createFigureNode({ figureType: 'figure' }, [paragraph]);

      expect(getMenuItem('crop')?.disabled).toBe(true);
    });
  });

  describe('image actions', () => {
    const setupImageFigure = (imageAttrs: Record<string, unknown> = {}) => {
      const image = createNode('image', imageAttrs);
      const wrapper = createNode('paragraph', {}, [image]);
      view.node = createFigureNode({ figureType: 'figure' }, [wrapper]);
      return { image };
    };

    beforeEach(() => {
      mockView.state = {
        ...mockView.state,
        tr: {
          setNodeMarkup: jest.fn().mockReturnValue('image-tr'),
        },
      } as unknown as EditorView['state'];
    });

    it('should open crop popup and handle confirm, cancel, and close callbacks', () => {
      setupImageFigure({ src: 'data:image/png;base64,a', crop: 'old' });
      const cropEditor = { close: jest.fn() };
      const createPopUp = jest
        .spyOn(commandHelpers, 'createPopUp')
        .mockReturnValue(cropEditor as never);
      mockView.state.doc = {
        nodeAt: jest.fn().mockReturnValue({
          attrs: { src: 'data:image/png;base64,a', crop: 'old' },
        }),
      } as unknown as EditorView['state']['doc'];

      getMenuItem('crop')?.action();

      const props = createPopUp.mock.calls[0][1] as {
        onConfirm: (cropData: unknown) => void;
        onCancel: () => void;
      };
      const options = createPopUp.mock.calls[0][2] as { onClose: () => void };
      props.onConfirm({ left: 1 });
      props.onCancel();
      options.onClose();

      expect(mockView.state.tr.setNodeMarkup).toHaveBeenCalledWith(
        12,
        undefined,
        {
          src: 'data:image/png;base64,a',
          crop: 'old',
          cropData: { left: 1 },
        }
      );
      expect(cropEditor.close).toHaveBeenCalledWith({ left: 1 });
      expect(cropEditor.close).toHaveBeenCalledWith(null);
      expect(view._cropEditor).toBeUndefined();
      expect(mockView.dispatch).toHaveBeenCalledWith('image-tr');
    });

    it('should skip crop popup when image has no src', () => {
      setupImageFigure({});
      const createPopUp = jest.spyOn(commandHelpers, 'createPopUp');
      mockView.state.doc = {
        nodeAt: jest.fn().mockReturnValue({ attrs: {} }),
      } as unknown as EditorView['state']['doc'];

      getMenuItem('crop')?.action();

      expect(createPopUp).not.toHaveBeenCalled();
    });

    it('should skip crop popup when no image path exists', () => {
      view.node = createFigureNode({ figureType: 'figure' }, [
        createNode('paragraph'),
      ]);
      const createPopUp = jest.spyOn(commandHelpers, 'createPopUp');

      getMenuItem('crop')?.action();

      expect(createPopUp).not.toHaveBeenCalled();
    });

    it('should reset crop data when an image exists', () => {
      setupImageFigure({ src: 'data:image/png;base64,a', cropData: { left: 1 } });
      mockView.state.doc = {
        nodeAt: jest.fn().mockReturnValue({
          attrs: { src: 'data:image/png;base64,a', cropData: { left: 1 } },
        }),
      } as unknown as EditorView['state']['doc'];

      getMenuItem('reset-crop')?.action();

      expect(mockView.state.tr.setNodeMarkup).toHaveBeenCalledWith(
        12,
        undefined,
        {
          src: 'data:image/png;base64,a',
          cropData: null,
          crop: null,
        }
      );
      expect(mockView.dispatch).toHaveBeenCalledWith('image-tr');
    });

    it('should skip reset crop when no image path exists', () => {
      view.node = createFigureNode({ figureType: 'figure' }, [
        createNode('paragraph'),
      ]);

      getMenuItem('reset-crop')?.action();

      expect(mockView.state.tr.setNodeMarkup).not.toHaveBeenCalled();
    });

    it('should skip updating image attrs when the image node is missing', () => {
      mockView.state.doc = {
        nodeAt: jest.fn().mockReturnValue(null),
      } as unknown as EditorView['state']['doc'];

      view['updateImageAttrs'](99, { src: 'missing' });

      expect(mockView.state.tr.setNodeMarkup).not.toHaveBeenCalled();
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    it('should update image source from a chosen file', () => {
      setupImageFigure({ src: 'old-src' });
      const input = document.createElement('input');
      const file = new Blob(['image'], { type: 'image/png' });
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file],
      });
      jest.spyOn(input, 'click').mockImplementation(() => undefined);
      const createElement: typeof document.createElement =
        document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string): HTMLElement => {
        if (tagName === 'input') {
          return input;
        }
        return createElement(tagName);
      });
      mockView.state.doc = {
        nodeAt: jest.fn().mockReturnValue({ attrs: { src: 'old-src' } }),
      } as unknown as EditorView['state']['doc'];
      const readAsDataURL = jest.fn(function (this: FileReader) {
        Object.defineProperty(this, 'result', {
          configurable: true,
          value: 'data:image/png;base64,new',
        });
        this.onload?.({} as ProgressEvent<FileReader>);
      });
      jest
        .spyOn(globalThis, 'FileReader')
        .mockImplementation(() => ({ readAsDataURL } as unknown as FileReader));

      getMenuItem('choose-file')?.action();
      input.onchange?.({} as Event);

      expect(input.click).toHaveBeenCalled();
      expect(mockView.state.tr.setNodeMarkup).toHaveBeenCalledWith(
        12,
        undefined,
        {
          src: 'data:image/png;base64,new',
          crop: null,
          cropData: null,
        }
      );
    });

    it('should ignore choose file when no file is selected', () => {
      setupImageFigure({ src: 'old-src' });
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [],
      });
      jest.spyOn(input, 'click').mockImplementation(() => undefined);
      const createElement: typeof document.createElement =
        document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string): HTMLElement => {
        if (tagName === 'input') {
          return input;
        }
        return createElement(tagName);
      });

      getMenuItem('choose-file')?.action();
      input.onchange?.({} as Event);

      expect(mockView.state.tr.setNodeMarkup).not.toHaveBeenCalled();
    });

    it('should ignore chosen file when FileReader result is not a string', () => {
      setupImageFigure({ src: 'old-src' });
      const input = document.createElement('input');
      const file = new Blob(['image'], { type: 'image/png' });
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file],
      });
      jest.spyOn(input, 'click').mockImplementation(() => undefined);
      const createElement: typeof document.createElement =
        document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string): HTMLElement => {
        if (tagName === 'input') {
          return input;
        }
        return createElement(tagName);
      });
      const readAsDataURL = jest.fn(function (this: FileReader) {
        Object.defineProperty(this, 'result', {
          configurable: true,
          value: null,
        });
        this.onload?.({} as ProgressEvent<FileReader>);
      });
      jest
        .spyOn(globalThis, 'FileReader')
        .mockImplementation(() => ({ readAsDataURL } as unknown as FileReader));

      getMenuItem('choose-file')?.action();
      input.onchange?.({} as Event);

      expect(mockView.state.tr.setNodeMarkup).not.toHaveBeenCalled();
    });

    it('should paste the first image item from the clipboard', async () => {
      setupImageFigure({ src: 'old-src' });
      mockView.state.doc = {
        nodeAt: jest.fn().mockReturnValue({ attrs: { src: 'old-src' } }),
      } as unknown as EditorView['state']['doc'];
      const blob = new Blob(['image'], { type: 'image/png' });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          read: jest.fn().mockResolvedValue([
            { types: ['text/plain'], getType: jest.fn() },
            { types: ['image/png'], getType: jest.fn().mockResolvedValue(blob) },
          ]),
        },
      });
      const readAsDataURL = jest.fn(function (this: FileReader) {
        Object.defineProperty(this, 'result', {
          configurable: true,
          value: 'data:image/png;base64,pasted',
        });
        this.onload?.({} as ProgressEvent<FileReader>);
      });
      jest
        .spyOn(globalThis, 'FileReader')
        .mockImplementation(() => ({ readAsDataURL } as unknown as FileReader));

      getMenuItem('paste-clipboard')?.action();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockView.state.tr.setNodeMarkup).toHaveBeenCalledWith(
        12,
        undefined,
        {
          src: 'data:image/png;base64,pasted',
          crop: null,
          cropData: null,
        }
      );
    });

    it('should ignore clipboard items without image data', async () => {
      setupImageFigure({ src: 'old-src' });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          read: jest.fn().mockResolvedValue([
            { types: ['text/plain'], getType: jest.fn() },
          ]),
        },
      });

      getMenuItem('paste-clipboard')?.action();
      await Promise.resolve();

      expect(mockView.state.tr.setNodeMarkup).not.toHaveBeenCalled();
    });

    it('should ignore pasted image when FileReader result is not a string', async () => {
      setupImageFigure({ src: 'old-src' });
      const blob = new Blob(['image'], { type: 'image/png' });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          read: jest.fn().mockResolvedValue([
            { types: ['image/png'], getType: jest.fn().mockResolvedValue(blob) },
          ]),
        },
      });
      const readAsDataURL = jest.fn(function (this: FileReader) {
        Object.defineProperty(this, 'result', {
          configurable: true,
          value: null,
        });
        this.onload?.({} as ProgressEvent<FileReader>);
      });
      jest
        .spyOn(globalThis, 'FileReader')
        .mockImplementation(() => ({ readAsDataURL } as unknown as FileReader));

      getMenuItem('paste-clipboard')?.action();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockView.state.tr.setNodeMarkup).not.toHaveBeenCalled();
    });

    it('should return early when clipboard read is unavailable', () => {
      setupImageFigure({ src: 'old-src' });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {},
      });

      getMenuItem('paste-clipboard')?.action();

      expect(mockView.state.tr.setNodeMarkup).not.toHaveBeenCalled();
    });
  });
});
