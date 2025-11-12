import { Fragment } from 'prosemirror-model';
import { EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { ImageSourceCommand, insertEnhancedImageFigure } from './ImageSourceCommand';
import { showCursorPlaceholder, hideCursorPlaceholder } from './CursorPlaceholderPlugin';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { createPopUp } from '@modusoperandi/licit-ui-commands';

jest.mock('prosemirror-model');
jest.mock('prosemirror-state');
jest.mock('prosemirror-view');
jest.mock('./CursorPlaceholderPlugin');
jest.mock('@modusoperandi/licit-ui-commands');

describe('insertEnhancedImageFigure', () => {
  let mockTr: Transaction;
  let mockSchema: any;
  const imageUrl = 'https://example.com/image.jpg';
  const altText = 'Test image';

  beforeEach(() => {
    mockTr = {
      selection: {
        from: 10,
        to: 10,
      },
      insert: jest.fn().mockReturnThis(),
      setSelection: jest.fn().mockReturnThis(),
    } as unknown as Transaction;

    mockSchema = {
      nodes: {
        enhanced_table_figure: {
          create: jest.fn().mockReturnValue({
            nodeSize: 5,
          }),
        },
        enhanced_table_figure_body: {
          create: jest.fn(),
        },
        simple_image: {
          create: jest.fn(),
        },
        enhanced_table_figure_capco: {
          create: jest.fn(),
        },
        paragraph: {
          createAndFill: jest.fn().mockReturnValue({}),
        },
        text: jest.fn(),
      },
    };
  });

  it('should return unchanged transaction if selection is not collapsed', () => {
    mockTr.selection.to = 15;
    const result = insertEnhancedImageFigure(mockTr, mockSchema, imageUrl, altText);
    expect(result).toBe(mockTr);
    expect(mockTr.insert).not.toHaveBeenCalled();
  });

  it('should return unchanged transaction if figure node type not found', () => {
    delete mockSchema.nodes.enhanced_table_figure;
    const result = insertEnhancedImageFigure(mockTr, mockSchema, imageUrl, altText);
    expect(result).toBe(mockTr);
  });

  it('should return unchanged transaction if image node type not found', () => {
    delete mockSchema.nodes.simple_image;
    const result = insertEnhancedImageFigure(mockTr, mockSchema, imageUrl, altText);
    expect(result).toBe(mockTr);
  });


});

describe('ImageSourceCommand', () => {
  let command: ImageSourceCommand;
  let mockState: EditorState;
  let mockView: EditorView;
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    command = new ImageSourceCommand();
    mockState = {
      selection: new TextSelection(10, 10),
      schema: {},
      tr: {},
    } as unknown as EditorState;

    mockView = {
      state: mockState,
      dispatch: jest.fn(),
      focus: jest.fn(),
      runtime: {},
    } as unknown as EditorView;

    mockDispatch = jest.fn();

    // Reset mocks
    (showCursorPlaceholder as jest.Mock).mockReturnValue({});
    (hideCursorPlaceholder as jest.Mock).mockReturnValue({});
    (createPopUp as jest.Mock).mockReturnValue({
      close: jest.fn(),
    });
  });

  describe('isEnabled', () => {
    it('should return true for collapsed selection', () => {
      expect(command.isEnabled(mockState, mockView)).toBe(true);
    });

    it('should return true for non-text selection', () => {
      mockState.selection = {} as any;
      expect(command.isEnabled(mockState, mockView)).toBe(true);
    });

    it('should return false for non-collapsed text selection', () => {
      mockState.selection = new TextSelection(10, 15);
      expect(command.isEnabled(mockState, mockView)).toBe(true);
    });
  });

  describe('waitForUserInput', () => {
    it('should return immediately if popup exists', async () => {
      command['_popUp'] = {} as any;
      const result = await command.waitForUserInput(mockState, mockDispatch, mockView);
      expect(result).toBeUndefined();
    });

    it('should show cursor placeholder and create popup', async () => {
      const promise = command.waitForUserInput(mockState, mockDispatch, mockView);

      expect(showCursorPlaceholder).toHaveBeenCalledWith(mockState);
      expect(createPopUp).toHaveBeenCalled();

      // Simulate popup close
      const onClose = (createPopUp as jest.Mock).mock.calls[0][2].onClose;
      onClose('test-value');

      const result = await promise;
      expect(result).toBe('test-value');
    });
  });

  describe('other methods', () => {
    it('renderLabel should return null', () => {
      expect(command.renderLabel()).toBeNull();
    });

    it('isActive should return true', () => {
      expect(command.isActive()).toBe(true);
    });

    it('executeCustom should return the transaction', () => {
      const mockTr = {} as Transaction;
      expect(command.executeCustom(mockState, mockTr)).toBe(mockTr);
    });

    it('executeCustomStyleForTable should return the transaction', () => {
      const mockTr = {} as Transaction;
      expect(command.executeCustomStyleForTable(mockState, mockTr, 0, 0)).toBe(mockTr);
    });
  });
});
