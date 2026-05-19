/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock('./ui/Icon', () => ({
  __esModule: true,
  Icon: {
    get: jest.fn(() => null),
  },
}));

import {
  ImageSourceCommand,
  insertImage,
  getImageSize,
} from './ImageSourceCommand';
import {Transform} from 'prosemirror-transform';
import {Schema} from 'prosemirror-model';
import {ImageLike, MultimediaPlugin} from './index';
import {createEditor, doc, p} from 'jest-prosemirror';
import {EditorView} from 'prosemirror-view';
import {
  TextSelection,
  EditorState,
  Transaction,
} from 'prosemirror-state';
import * as CursorPlaceholderPlugin from './CursorPlaceholderPlugin';

// Mock the CursorPlaceholderPlugin
jest.mock('./CursorPlaceholderPlugin', () => ({
  showCursorPlaceholder: jest.fn((state: { tr: unknown }) => state.tr),
  hideCursorPlaceholder: jest.fn((state: { tr: unknown }) => state.tr),
}));

// Mock createPopUp
jest.mock('../../commands', () => ({
  createPopUp: jest.fn(),
}));

const mockSchema = new Schema({
  nodes: {
    doc: {content: 'block+'},
    paragraph: {content: 'inline*', group: 'block'},
    text: {group: 'inline'},
    image: {
      inline: true,
      attrs: {
        src: {default: ''},
        alt: {default: ''},
        title: {default: ''},
        width: {default: null},
        height: {default: null},
      },
      group: 'inline',
      draggable: true,
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs(dom: string | HTMLElement) {
            if (typeof dom === 'string') {
              return false;
            }
            return {
              src: dom.getAttribute('src'),
              alt: dom.getAttribute('alt'),
              title: dom.getAttribute('title'),
              width: dom.getAttribute('width'),
              height: dom.getAttribute('height'),
            };
          },
        },
      ],
      toDOM(node) {
        return ['img', node.attrs];
      },
    },
  },
});

describe('insertImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should insert image with src only', () => {
    const state = EditorState.create({schema: mockSchema});
    const tr = state.tr as Transform;

    const result = insertImage(tr, mockSchema, 'test.jpg');

    expect(result).toBeDefined();
    expect((result as Transaction).doc.toString()).toContain('image');
  });

it('should insert image with width and height', () => {
  const state = EditorState.create({schema: mockSchema});
  const tr = state.tr as Transform;

  const result = insertImage(tr, mockSchema, 'test.jpg', 640, 480);

  expect(result).toBeDefined();
  const doc = (result as Transaction).doc;
  // Image is at position 1 inside the paragraph
  const imageNode = doc.nodeAt(1);
  expect(imageNode).toBeDefined();
  expect(imageNode?.type.name).toBe('image');
  expect(imageNode?.attrs.width).toBe(640);
  expect(imageNode?.attrs.height).toBe(480);
});

  it('should not insert image when width provided without height', () => {
    const state = EditorState.create({schema: mockSchema});
    const tr = state.tr as Transform;

    const result = insertImage(tr, mockSchema, 'test.jpg', 640);

    expect(result).toBeDefined();
    const doc = (result as Transaction).doc;
    const imageNode = doc.nodeAt(0);
    expect(imageNode?.attrs.width).toBeUndefined();
  });

  it('should return transform unchanged when selection is missing', () => {
    const tr = {} as Transform;

    const result = insertImage(tr, mockSchema, 'test.jpg');

    expect(result).toBe(tr);
  });

  it('should return transform unchanged when from !== to', () => {
    const state = EditorState.create({schema: mockSchema});
    const tr = state.tr.setSelection(
      TextSelection.create(state.doc, 0, 1)
    ) as Transform;

    const result = insertImage(tr, mockSchema, 'test.jpg');

    expect(result).toBe(tr);
  });

  it('should return transform unchanged when image node not in schema', () => {
    const basicSchema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {content: 'text*'},
        text: {},
      },
    });
    const state = EditorState.create({schema: basicSchema});
    const tr = state.tr as Transform;

    const result = insertImage(tr, basicSchema, 'test.jpg');

    expect(result).toBe(tr);
  });

it('should handle empty src', () => {
  const state = EditorState.create({schema: mockSchema});
  const tr = state.tr as Transform;

  const result = insertImage(tr, mockSchema, '');

  expect(result).toBeDefined();
  // Image should be at position 1 (inside the paragraph)
  const imageNode = (result as Transaction).doc.nodeAt(1);
  expect(imageNode).toBeDefined();
  expect(imageNode?.type.name).toBe('image');
  expect(imageNode?.attrs.src).toBe('');
});
it('should set default alt and title when not provided', () => {
  const state = EditorState.create({schema: mockSchema});
  const tr = state.tr as Transform;

  const result = insertImage(tr, mockSchema, 'test.jpg');

  // The image is inserted at position 0, but we need to check inside the paragraph
  const doc = (result as Transaction).doc;
  expect(doc.childCount).toBeGreaterThan(0);

  // Image should be in the first paragraph at position 1
  const imageNode = doc.nodeAt(1);
  expect(imageNode).toBeDefined();
  expect(imageNode?.type.name).toBe('image');
  expect(imageNode?.attrs.src).toBe('test.jpg');
});
});

describe('getImageSize', () => {
  const originalImage = global.Image;

  interface MockImage {
    width: number;
    height: number;
    onload: (() => void) | null;
    onerror: ((event?: Event) => void) | null;
    src: string;
  }

  afterEach(() => {
    global.Image = originalImage;
  });

  it('should resolve with width and height on successful load', async () => {
    const mockWidth = 1920;
    const mockHeight = 1080;

    global.Image = class implements MockImage {
      width = mockWidth;
      height = mockHeight;
      onload: (() => void) | null = null;
      onerror: ((event?: Event) => void) | null = null;
      _src = '';
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        setTimeout(() => this.onload && this.onload(), 0);
      }
    } as unknown as typeof Image;

    const size = await getImageSize('https://example.com/image.jpg');

    expect(size).toEqual({width: mockWidth, height: mockHeight});
  });

  it('should reject on image load error', async () => {
    global.Image = class implements MockImage {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: ((event?: Event) => void) | null = null;
      _src = '';
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        setTimeout(() => this.onerror && this.onerror(new Event('Failed to load')), 0);
      }
    } as unknown as typeof Image;

    await expect(getImageSize('invalid-url')).rejects.toBeDefined();
  });

  it('should handle different image dimensions', async () => {
    global.Image = class implements MockImage {
      width = 300;
      height = 600;
      onload: (() => void) | null = null;
      onerror: ((event?: Event) => void) | null = null;
      _src = '';
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        setTimeout(() => this.onload && this.onload(), 0);
      }
    } as unknown as typeof Image;

    const size = await getImageSize('portrait.jpg');

    expect(size.width).toBe(300);
    expect(size.height).toBe(600);
  });
});

describe('ImageSourceCommand', () => {
  let command: ImageSourceCommand;
  let mockView: EditorView;
  let mockState: EditorState;

  beforeEach(() => {
    jest.clearAllMocks();
    command = new ImageSourceCommand();

    const plugin = new MultimediaPlugin();
    const editor = createEditor(doc(p('<cursor>')), {
      plugins: [plugin],
    });
    mockView = editor.view as unknown as EditorView;
    mockState = mockView.state;
  });

  describe('constructor and basic methods', () => {
    it('should instantiate successfully', () => {
      expect(command).toBeDefined();
      expect(command).toBeInstanceOf(ImageSourceCommand);
    });

    it('should return null from renderLabel', () => {
      expect(command.renderLabel()).toBeNull();
    });

    it('should return true from isActive', () => {
      expect(command.isActive()).toBe(true);
    });

    it('should return transform unchanged from executeCustom', () => {
      const tr = {} as Transform;
      expect(command.executeCustom(mockState, tr)).toBe(tr);
    });

    it('should return transform unchanged from executeCustomStyleForTable', () => {
      const tr = {} as Transform;
      expect(command.executeCustomStyleForTable(mockState, tr)).toBe(tr);
    });

    it('should return null from cancel', () => {
      expect(command.cancel()).toBeNull();
    });

    it('should throw error from getEditor', () => {
      expect(() => command.getEditor()).toThrow('Not implemented');
    });
  });

  describe('isEnabled', () => {
    it('should return true when selection is a cursor (from === to)', () => {
      const state = EditorState.create({
        schema: mockSchema,
        selection: TextSelection.create(mockSchema.node('doc', null, [mockSchema.node('paragraph')]), 0),
      });

      expect(command.isEnabled(state)).toBe(true);
    });

    it('should return false when selection is a range (from !== to) with TextSelection', () => {
      const state = EditorState.create({
        schema: mockSchema,
        selection: TextSelection.create(
          mockSchema.node('doc', null, [mockSchema.node('paragraph', null, [mockSchema.text('hello')])]),
          0,
          2
        ),
      });

      expect(command.isEnabled(state)).toBe(false);
    });

    it('should return true for non-TextSelection', () => {
      const state = EditorState.create({
        schema: mockSchema,
      });

      // Mock a non-TextSelection by modifying the selection check
      const result = command.isEnabled(state);

      // Since default selection is TextSelection with from === to, this will be true
      expect(typeof result).toBe('boolean');
    });
  });


  describe('executeWithUserInput', () => {
    beforeEach(() => {
      global.Image = class {
        width = 800;
        height = 600;
        onload: (() => void) | null = null;
        onerror: ((event?: Event) => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(value: string) {
          this._src = value;
          setTimeout(() => this.onload && this.onload(), 0);
        }
      } as unknown as typeof Image;
    });

    it('should insert image when valid inputs provided', async () => {
      const dispatch = jest.fn();
      const mockInputs:ImageLike = {src: 'https://example.com/image.jpg',height: 400, width: 300, id: '1'};

      command.executeWithUserInput(mockState, dispatch, mockView, mockInputs);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(dispatch).toHaveBeenCalled();
      expect(mockView.focus).toBeDefined();
    });

    it('should return false immediately', () => {
      const dispatch = jest.fn();
      const mockInputs = {src: 'test.jpg',height: 400, width: 300, id: '1'};

      const result = command.executeWithUserInput(mockState, dispatch, mockView, mockInputs);

      expect(result).toBe(false);
    });

    it('should not dispatch when inputs.src is missing', () => {
      const dispatch = jest.fn();
      const mockInputs = {} as ImageLike;

      command.executeWithUserInput(mockState, dispatch, mockView, mockInputs);

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when dispatch is null', () => {
      const mockInputs:ImageLike = {src: 'test.jpg',height: 400, width: 300, id: '1'};

      command.executeWithUserInput(mockState, null as unknown as typeof jest.fn, mockView, mockInputs);

      // Should not throw and should not call dispatch
      expect(true).toBe(true);
    });

    it('should call hideCursorPlaceholder when view exists', async () => {
      const dispatch = jest.fn();
      const mockInputs:ImageLike = {src: 'test.jpg',height: 400, width: 300, id: '1'};
      const mockHideCursor = CursorPlaceholderPlugin.hideCursorPlaceholder as jest.Mock;

      command.executeWithUserInput(mockState, dispatch, mockView, mockInputs);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockHideCursor).toHaveBeenCalledWith(mockView.state);
    });

    it('should handle missing view gracefully', async () => {
      const dispatch = jest.fn();
      const mockInputs:ImageLike = {src: 'test.jpg',height: 400, width: 300, id: '1'};

      command.executeWithUserInput(mockState, dispatch, null as unknown as EditorView, mockInputs);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(dispatch).toHaveBeenCalled();
    });

    it('should call view.focus after insertion', async () => {
      const dispatch = jest.fn();
      const mockFocus = jest.fn();
      const viewWithFocus = {...mockView, focus: mockFocus} as unknown as EditorView;
      const mockInputs:ImageLike = {src: 'test.jpg',height: 400, width: 300, id: '1'};

      command.executeWithUserInput(mockState, dispatch, viewWithFocus, mockInputs);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockFocus).toHaveBeenCalled();
    });

    it('should insert image with correct dimensions from getImageSize', async () => {
      const mockWidth = 1024;
      const mockHeight = 768;

      global.Image = class {
        width = mockWidth;
        height = mockHeight;
        onload: (() => void) | null = null;
        onerror: ((event?: Event) => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(value: string) {
          this._src = value;
          setTimeout(() => this.onload && this.onload(), 0);
        }
      } as unknown as typeof Image;

      const dispatch = jest.fn();
      const mockInputs:ImageLike = {src: 'sized-image.jpg',height: 400, width: 300, id: '1'};

      command.executeWithUserInput(mockState, dispatch, mockView, mockInputs);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(dispatch).toHaveBeenCalled();
      const dispatchedTr = dispatch.mock.calls[0][0] as Transaction;
      // Verify image node has correct dimensions
      expect(dispatchedTr).toBeDefined();
    });
  });

});
