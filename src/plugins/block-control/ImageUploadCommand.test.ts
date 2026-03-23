/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Schema} from 'prosemirror-model';
import {EditorState, TextSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {
  ImageSourceCommand,
  insertEnhancedImageFigure,
} from './ImageSourceCommand';
import type {ImageProps} from './Types';
import {
  showCursorPlaceholder,
  hideCursorPlaceholder,
} from './CursorPlaceholderPlugin';
import { createPopUp, PopUpHandle } from '../../commands';

// Mock dependencies
jest.mock('./CursorPlaceholderPlugin', () => ({
  showCursorPlaceholder: jest.fn((state) => state.tr),
  hideCursorPlaceholder: jest.fn((state) => state.tr),
}));

jest.mock('../../commands', () => ({
  createPopUp: jest.fn(),
}));

describe('ImageSourceCommand', () => {
  let command: ImageSourceCommand;
  let schema: Schema;
  let state: EditorState;
  let mockDispatch: jest.Mock;
  let mockView: EditorView & {
    runtime: {
      canUploadImage: jest.Mock<boolean, []>;
      uploadImage: jest.Mock<Promise<unknown>, []>;
    };
  };

  beforeEach(() => {
    command = new ImageSourceCommand();
    mockDispatch = jest.fn();

    // Create a comprehensive schema with all required node types
    schema = new Schema({
      nodes: {
        doc: {content: 'block+'},
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0],
          parseDOM: [{tag: 'p'}],
        },
        text: {group: 'inline'},
        image: {
          inline: false,
          attrs: {
            src: {default: ''},
            alt: {default: ''},
            simpleImg: {default: 'false'},
            cropData: {default: null},
          },
          group: 'block',
          draggable: true,
          toDOM: (node) => ['img', node.attrs],
          parseDOM: [{tag: 'img'}],
        },
        enhanced_table_figure: {
          content: 'enhanced_table_figure_body enhanced_table_figure_capco',
          group: 'block',
          attrs: {
            figureType: {default: 'figure'},
            orientation: {default: 'landscape'},
          },
          toDOM: () => ['div', {class: 'enhanced-figure'}, 0],
          parseDOM: [{tag: 'div.enhanced-figure'}],
        },
        enhanced_table_figure_body: {
          content: 'image',
          toDOM: () => ['div', {class: 'figure-body'}, 0],
          parseDOM: [{tag: 'div.figure-body'}],
        },
        enhanced_table_figure_capco: {
          content: 'text*',
          toDOM: () => ['div', {class: 'figure-capco'}, 0],
          parseDOM: [{tag: 'div.figure-capco'}],
        },
      },
    });

    state = EditorState.create({
      doc: schema.node('doc', null, [schema.node('paragraph')]),
      schema,
    });

    mockView = {
      state,
      runtime: {
        canUploadImage: jest.fn(() => true),
        uploadImage: jest.fn(),
      },
      focus: jest.fn(),
    } as unknown as typeof mockView;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEditor', () => {
    it('should return undefined', () => {
      expect(command.getEditor()).toBeUndefined();
    });
  });

  describe('isEnabled', () => {
    it('should return true when selection is a collapsed TextSelection', () => {
      const result = command.isEnabled(state, mockView);
      expect(result).toBe(true);
    });

    it('should return true when selection is not a TextSelection', () => {
      // Create a state with non-TextSelection (mock scenario)
      const customState = {
        ...state,
        selection: {
          from: 0,
          to: 5,
        } as unknown as EditorState['selection'],
      };
      const result = command.isEnabled(customState as EditorState, mockView);
      expect(result).toBe(true);
    });

    it('should return false when TextSelection has range (from !== to)', () => {
      const customState = EditorState.create({
        doc: schema.node('doc', null, [
          schema.node('paragraph', null, [schema.text('Hello World')]),
        ]),
        schema,
        selection: TextSelection.create(
          schema.node('doc', null, [
            schema.node('paragraph', null, [schema.text('Hello World')]),
          ]),
          1,
          6
        ),
      });
      const result = command.isEnabled(customState, mockView);
      expect(result).toBe(false);
    });
  });

  describe('waitForUserInput', () => {
    it('should return resolved promise if popup already exists', async () => {
      command._popUp = {
        close: jest.fn(),
        update: jest.fn(),
      } as PopUpHandle;
      const result = await command.waitForUserInput(
        state,
        mockDispatch,
        mockView
      );
      expect(result).toBeUndefined();
      expect(createPopUp).not.toHaveBeenCalled();
    });

    it('should call showCursorPlaceholder when dispatch is provided', () => {
      (createPopUp as jest.Mock).mockReturnValue({});

      void command.waitForUserInput(state, mockDispatch, mockView);

      expect(showCursorPlaceholder).toHaveBeenCalledWith(state);
      expect(mockDispatch).toHaveBeenCalled();

      // Clean up
      command._popUp = undefined;
    });

    it('should not call dispatch when dispatch is null', () => {
      (createPopUp as jest.Mock).mockReturnValue({});

      void command.waitForUserInput(state, null, mockView);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should create popup with correct props and options', () => {
      const mockPopUp: PopUpHandle = {
        close: jest.fn(),
        update: jest.fn(),
      };
      (createPopUp as jest.Mock).mockReturnValue(mockPopUp);

      void command.waitForUserInput(state, mockDispatch, mockView);

      expect(createPopUp).toHaveBeenCalledWith(
        undefined,
        {runtime: mockView.runtime},
        {
          modal: true,
          onClose: expect.any(Function),
        }
      );
    });

    it('should handle popup onClose callback and resolve promise', async () => {
      let onCloseCallback: ((val: unknown) => void) | undefined;
      (createPopUp as jest.Mock).mockImplementation(
        (_editor, _props, options) => {
          onCloseCallback = options.onClose;
          return {
            close: jest.fn(),
            update: jest.fn(),
          } as PopUpHandle;
        }
      );

      const promise = command.waitForUserInput(state, mockDispatch, mockView);

      // Simulate popup close
      const closeValue = {src: 'test.jpg'};
      onCloseCallback?.(closeValue);

      const result = await promise;
      expect(result).toEqual(closeValue);
      expect(command._popUp).toBeUndefined();
    });

    it('should handle null view', () => {
      (createPopUp as jest.Mock).mockReturnValue({
        close: jest.fn(),
        update: jest.fn(),
      } as PopUpHandle);

      void command.waitForUserInput(state, mockDispatch, null);

      expect(createPopUp).toHaveBeenCalledWith(
        undefined,
        {runtime: null},
        expect.any(Object)
      );
    });
  });

  describe('executeWithUserInput', () => {
    it('should execute transaction with valid inputs', () => {
      const inputs: ImageProps = {
        src: 'https://example.com/image.jpg',
        id: 'img-1',
        width: 100,
        height: 100,
      };

      const result = command.executeWithUserInput(
        state,
        mockDispatch,
        mockView,
        inputs
      );

      expect(hideCursorPlaceholder).toHaveBeenCalledWith(mockView.state);
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockView.focus).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle null dispatch', () => {
      const inputs: ImageProps = {
        src: 'https://example.com/image.jpg',
        id: 'img-2',
        width: 100,
        height: 100,
      };

      const result = command.executeWithUserInput(
        state,
        null,
        mockView,
        inputs
      );

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle null inputs', () => {
      const result = command.executeWithUserInput(
        state,
        mockDispatch,
        mockView,
        null
      );

      expect(mockDispatch).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle null view (case 2)', () => {
      const inputs: ImageProps = {
        src: 'https://example.com/image.jpg',
        id: 'img-3',
        width: 100,
        height: 100,
      };

      const result = command.executeWithUserInput(
        state,
        mockDispatch,
        null,
        inputs
      );

      expect(mockDispatch).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should not call view.focus when view is null', () => {
      const inputs: ImageProps = {
        src: 'https://example.com/image.jpg',
        id: 'img-4',
        width: 100,
        height: 100,
      };

      command.executeWithUserInput(state, mockDispatch, null, inputs);

      expect(mockView.focus).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should return null', () => {
      expect(command.cancel()).toBeNull();
    });
  });

  describe('renderLabel', () => {
    it('should return null (case 2)', () => {
      expect(command.renderLabel()).toBeNull();
    });
  });

  describe('isActive', () => {
    it('should return true', () => {
      expect(command.isActive()).toBe(true);
    });
  });

  describe('executeCustom', () => {
    it('should return the same transform', () => {
      const tr = state.tr;
      const result = command.executeCustom(state, tr);
      expect(result).toBe(tr);
    });
  });

  describe('executeCustomStyleForTable', () => {
    it('should return the same transform (case 2)', () => {
      const tr = state.tr;
      const result = command.executeCustomStyleForTable(state, tr, 0, 1);
      expect(result).toBe(tr);
    });
  });

  describe('insertEnhancedImageFigure', () => {
    it('should insert enhanced image figure with default alt text', () => {
      const tr = state.tr;
      const imageUrl = 'https://example.com/image.jpg';

      const result = insertEnhancedImageFigure(tr, schema, imageUrl);

      expect(result).toBeDefined();
      expect(result.docChanged).toBe(true);
    });

    it('should insert enhanced image figure with custom alt text', () => {
      const tr = state.tr;
      const imageUrl = 'https://example.com/image.jpg';
      const altText = 'Test image';

      const result = insertEnhancedImageFigure(tr, schema, imageUrl, altText);

      expect(result).toBeDefined();
      expect(result.docChanged).toBe(true);
    });

    it('should return original transaction when selection has range', () => {
      const customState = EditorState.create({
        doc: schema.node('doc', null, [
          schema.node('paragraph', null, [schema.text('Hello World')]),
        ]),
        schema,
        selection: TextSelection.create(
          schema.node('doc', null, [
            schema.node('paragraph', null, [schema.text('Hello World')]),
          ]),
          1,
          6
        ),
      });
      const tr = customState.tr;

      const result = insertEnhancedImageFigure(tr, schema, 'test.jpg');

      expect(result).toBe(tr);
      expect(result.docChanged).toBe(false);
    });

    it('should return original transaction when enhanced_table_figure node type is missing', () => {
      const minimalSchema = new Schema({
        nodes: {
          doc: {content: 'paragraph+'},
          paragraph: {
            content: 'text*',
            group: 'block',
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
          },
          text: {group: 'inline'},
        },
      });

      const minimalState = EditorState.create({
        doc: minimalSchema.node('doc', null, [minimalSchema.node('paragraph')]),
        schema: minimalSchema,
      });

      const tr = minimalState.tr;
      const result = insertEnhancedImageFigure(tr, minimalSchema, 'test.jpg');

      expect(result).toBe(tr);
      expect(result.docChanged).toBe(false);
    });

    it('should return original transaction when image node type is missing', () => {
      const schemaWithoutImage = new Schema({
        nodes: {
          doc: {content: 'block+'},
          paragraph: {
            content: 'text*',
            group: 'block',
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
          },
          text: {group: 'inline'},
          enhanced_table_figure: {
            content: 'enhanced_table_figure_body enhanced_table_figure_capco',
            group: 'block',
            attrs: {
              figureType: {default: 'figure'},
              orientation: {default: 'landscape'},
            },
            toDOM: () => ['div', 0],
            parseDOM: [{tag: 'div'}],
          },
          enhanced_table_figure_body: {
            content: 'text*',
            toDOM: () => ['div', 0],
            parseDOM: [{tag: 'div'}],
          },
          enhanced_table_figure_capco: {
            content: 'text*',
            toDOM: () => ['div', 0],
            parseDOM: [{tag: 'div'}],
          },
        },
      });

      const stateWithoutImage = EditorState.create({
        doc: schemaWithoutImage.node('doc', null, [
          schemaWithoutImage.node('paragraph'),
        ]),
        schema: schemaWithoutImage,
      });

      const tr = stateWithoutImage.tr;
      const result = insertEnhancedImageFigure(
        tr,
        schemaWithoutImage,
        'test.jpg'
      );

      expect(result).toBe(tr);
      expect(result.docChanged).toBe(false);
    });

    it('should handle case when paragraph node cannot be created', () => {
      // Create a schema where paragraph creation might fail
      const customSchema = new Schema({
        nodes: {
          doc: {content: 'block+'},
          paragraph: {
            content: 'text*',
            group: 'block',
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
          },
          text: {group: 'inline'},
          image: {
            inline: false,
            attrs: {
              src: {default: ''},
              alt: {default: ''},
              simpleImg: {default: 'false'},
              cropData: {default: null},
            },
            group: 'block',
            toDOM: (node) => ['img', node.attrs],
            parseDOM: [{tag: 'img'}],
          },
          enhanced_table_figure: {
            content: 'enhanced_table_figure_body enhanced_table_figure_capco',
            group: 'block',
            attrs: {
              figureType: {default: 'figure'},
              orientation: {default: 'landscape'},
            },
            toDOM: () => ['div', 0],
            parseDOM: [{tag: 'div'}],
          },
          enhanced_table_figure_body: {
            content: 'image',
            toDOM: () => ['div', 0],
            parseDOM: [{tag: 'div'}],
          },
          enhanced_table_figure_capco: {
            content: 'text*',
            toDOM: () => ['div', 0],
            parseDOM: [{tag: 'div'}],
          },
        },
      });

      // Mock createAndFill to return null
      jest
        .spyOn(customSchema.nodes.paragraph, 'createAndFill')
        .mockReturnValue(null);

      const customState = EditorState.create({
        doc: customSchema.node('doc', null, [customSchema.node('paragraph')]),
        schema: customSchema,
      });

      const tr = customState.tr;
      const result = insertEnhancedImageFigure(tr, customSchema, 'test.jpg');

      // Should still insert the figure, just not the paragraph after
      expect(result.docChanged).toBe(true);
    });
  });
});
