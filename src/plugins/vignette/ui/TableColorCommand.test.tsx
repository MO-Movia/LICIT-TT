import { TableColorCommand } from './TableColorCommand';
import { setCellAttr } from 'prosemirror-tables';
import { createPopUp } from '@modusoperandi/licit-ui-commands';
import { ColorEditor } from '@modusoperandi/color-picker';
import { Transform } from 'prosemirror-transform';

jest.mock('prosemirror-tables', () => ({
  setCellAttr: jest.fn(() => jest.fn((state, dispatch) => {
    dispatch(state.tr);
    return true;
  })),
}));

jest.mock('@modusoperandi/licit-ui-commands', () => ({
  createPopUp: jest.fn(),
  atAnchorRight: 'mockAnchorRight',
  findNodesWithSameMark: jest.fn(() => ({
    mark: { attrs: { color: '#112233' } },
  })),
  MARK_TEXT_COLOR: 'textColor',
  RuntimeService: { Runtime: 'mockRuntime' },
}));

jest.mock('@modusoperandi/color-picker', () => ({
  ColorEditor: jest.fn(),
}));

describe('TableColorCommand', () => {
  let cmd: TableColorCommand;
  let mockState: unknown;
  let mockDispatch: jest.Mock;
  let mockView: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = new TableColorCommand();

    mockDispatch = jest.fn();
    mockState = {
      doc: {},
      schema: { marks: { textColor: {} } },
      selection: { from: 1, to: 2 },
      tr: { doc: { nodeAt: jest.fn().mockReturnValue({ marks: [{ attrs: { color: '#abcdef' } }] }) } },
    };
    mockView = { dom: document.createElement('div') };
  });

  test('getAttrName should return empty string', () => {
    expect(cmd.getAttrName()).toBe('');
  });

  test('isEnabled should always return true', () => {
    expect(cmd.isEnabled(mockState)).toBe(true);
  });

  test('shouldRespondToUIEvent returns true only for mouseenter', () => {
    expect(cmd.shouldRespondToUIEvent({ type: 'mouseenter' } as unknown )).toBe(true);
    expect(cmd.shouldRespondToUIEvent({ type: 'click' }as unknown )).toBe(false);
  });

  test('waitForUserInput returns undefined if popup exists', async () => {
    (cmd as unknown)._popUp = { id: 'exists' };
    const result = await cmd.waitForUserInput(mockState);
    expect(result).toBeUndefined();
  });

  test('waitForUserInput resolves immediately if target not HTMLElement', async () => {
    const result = await cmd.waitForUserInput(mockState, mockDispatch, mockView, { currentTarget: null } as unknown);
    expect(result).toBeUndefined();
  });

  test('waitForUserInput should create popup and resolve on close', async () => {
    const mockAnchor = document.createElement('div');
    let onCloseFn: unknown | undefined;
    (createPopUp as jest.Mock).mockImplementation((_Comp, _props, opts) => {
      onCloseFn = opts.onClose;
      return { id: 'popup' };
    });

    const promise = cmd.waitForUserInput(mockState, mockDispatch, mockView, { currentTarget: mockAnchor } as unknown);
    expect(createPopUp).toHaveBeenCalledWith(
      ColorEditor,
      expect.objectContaining({ hex: '#112233', runtime: 'mockRuntime', Textcolor: '#abcdef' }),
      expect.objectContaining({
        anchor: mockAnchor,
        position: 'mockAnchorRight',
        autoDismiss: true,
        popUpId: 'mo-menuList-child',
        onClose: expect.any(Function),
      })
    );

    expect((cmd as unknown)._popUp).not.toBeNull();

    // simulate user closes popup with a value
    onCloseFn!({ color: '#ff0000' });
    const result = await promise;
    expect(result).toEqual({ color: '#ff0000' });
    expect((cmd as unknown)._popUp).toBeNull();
  });

  test('executeWithUserInput calls setCellAttr when color provided', () => {
    const mockColor = { color: '#00ff00', selectedOption: 'solid' };
    const result = cmd.executeWithUserInput(mockState, mockDispatch, mockView, mockColor);
    expect(setCellAttr).toHaveBeenCalledWith('', '#00ff00');
    expect(mockDispatch).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('executeWithUserInput returns false when no color', () => {
    const result = cmd.executeWithUserInput(mockState, mockDispatch, mockView, undefined);
    expect(result).toBe(false);
  });

  test('cancel closes popup if exists', () => {
    const closeFn = jest.fn();
    (cmd as unknown)._popUp = { close: closeFn };
    cmd.cancel();
    expect(closeFn).toHaveBeenCalledWith(undefined);
  });

  test('renderLabel returns null', () => {
    expect(cmd.renderLabel()).toBeNull();
  });

  test('isActive returns true', () => {
    expect(cmd.isActive()).toBe(true);
  });

  test('executeCustom returns transform unchanged', () => {
    const tr = new Transform();
    expect(cmd.executeCustom(mockState, tr)).toBe(tr);
  });
});
