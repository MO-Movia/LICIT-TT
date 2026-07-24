/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { createPopUp } from '../../commands';
import {
  getCachedStyles,
  getStylesAsync,
  setStyles,
} from '../../plugins/custom-styles/customStyle';
import { applyTableStyle } from '../extensions/tableEx/tableStyle';
import {
  openTableStylePicker,
  TableStylePicker,
} from './tableStylePicker';

jest.mock('../../commands', () => ({
  atAnchorRight: jest.fn(),
  createPopUp: jest.fn(),
}));

jest.mock('../../plugins/custom-styles/customStyle', () => ({
  getCachedStyles: jest.fn(() => []),
  getStylesAsync: jest.fn(),
  setStyles: jest.fn(),
}));

jest.mock('../../plugins/custom-styles/ui/CustomStyleItem', () => ({
  CustomStyleItem: jest.fn(() => null),
}));

jest.mock('../extensions/tableEx/tableStyle', () => ({
  TABLE_STYLE_NAME_ATTRIBUTE: 'tableStyleName',
  applyTableStyle: jest.fn((_state: unknown, tr: unknown): unknown => tr),
}));

const normalStyle = { styleName: 'Normal', styles: {} };
const tableBodyStyle = { styleName: 'Table body', styles: {} };

function createView(table: unknown = null) {
  return {
    dispatch: jest.fn(),
    state: {
      doc: {
        nodeAt: jest.fn(() => table),
      },
      tr: { meta: 'tr' },
    },
  };
}

describe('openTableStylePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the current position is not a table', () => {
    const view = createView();

    const picker = openTableStylePicker({
      anchor: document.createElement('button'),
      getTablePos: () => null,
      view: view as never,
    });

    expect(picker).toBeNull();
    expect(createPopUp).not.toHaveBeenCalled();
  });

  it('opens a picker and applies the selected style to the current table', () => {
    const table = {
      attrs: { tableStyleName: 'Table body' },
      type: { spec: { tableRole: 'table' } },
    };
    const view = createView(table);
    const handle = { close: jest.fn() };
    const onClose = jest.fn();
    const onSelect = jest.fn();

    (createPopUp as jest.Mock).mockReturnValue(handle);

    const picker = openTableStylePicker({
      anchor: document.createElement('button'),
      getTablePos: () => 4,
      onClose,
      onSelect,
      view: view as never,
    });

    expect(picker).toBe(handle);
    const [, props, options] = (createPopUp as jest.Mock).mock.calls[0];
    expect(props.selectedStyleName).toBe('Table body');
    expect(options.onClose).toBe(onClose);

    props.onSelectStyle(normalStyle);

    expect(applyTableStyle).toHaveBeenCalledWith(
      view.state,
      view.state.tr,
      4,
      'Normal'
    );
    expect(view.dispatch).toHaveBeenCalledWith(view.state.tr);
    expect(onSelect).toHaveBeenCalled();

    props.onClose();
    expect(handle.close).toHaveBeenCalledWith(undefined);
  });

  it('does not dispatch when the table is gone before selection', () => {
    const table = {
      attrs: {},
      type: { spec: { tableRole: 'table' } },
    };
    const view = createView(table);
    const getTablePos = jest.fn().mockReturnValueOnce(4).mockReturnValue(null);

    (createPopUp as jest.Mock).mockReturnValue({ close: jest.fn() });

    openTableStylePicker({
      anchor: document.createElement('button'),
      getTablePos,
      view: view as never,
    });

    const [, props] = (createPopUp as jest.Mock).mock.calls[0];
    props.onSelectStyle(tableBodyStyle);

    expect(view.dispatch).not.toHaveBeenCalled();
  });
});

describe('TableStylePicker', () => {
  const props = {
    dispatch: jest.fn(),
    editorState: {} as never,
    editorView: {} as never,
    onClose: jest.fn(),
    onSelectStyle: jest.fn(),
    selectedStyleName: 'Table body',
    theme: 'dark',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getStylesAsync as jest.Mock).mockReset();
    (getCachedStyles as jest.Mock).mockReturnValue([
      normalStyle,
      tableBodyStyle,
      { styleName: '', styles: {} },
    ]);
  });

  it('renders filtered style commands and handles UI events', () => {
    const picker = new TableStylePicker(props);
    picker.state = {
      searchTerm: 'table',
      styles: [normalStyle, tableBodyStyle],
    };
    picker.setState = jest.fn((state) => {
      picker.state = { ...picker.state, ...state };
    });

    const element = picker.render();
    expect(element.props.className).toBe('molsp-dropbtn dark');

    const input = element.props.children[0].props.children;
    input.props.onChange({ target: { value: 'body' } });
    expect(picker.setState).toHaveBeenCalledWith({ searchTerm: 'body' });

    const event = { stopPropagation: jest.fn() };
    input.props.onClick(event);
    input.props.onContextMenu(event);
    input.props.onKeyDown(event);
    expect(event.stopPropagation).toHaveBeenCalledTimes(3);

    const styleItem = element.props.children[1].props.children[0];
    expect(styleItem.props.selectionClassName).toBe('selectbackground');

    const ignoredCommand = {
      execute: jest.fn(),
      shouldRespondToUIEvent: jest.fn(() => false),
    };
    styleItem.props.onClick(ignoredCommand, {});
    expect(ignoredCommand.execute).not.toHaveBeenCalled();

    const acceptedCommand = {
      execute: jest.fn(),
      shouldRespondToUIEvent: jest.fn(() => true),
    };
    styleItem.props.onMouseEnter(acceptedCommand, {});
    expect(acceptedCommand.execute).toHaveBeenCalled();

    styleItem.props.value.execute();
    expect(props.onSelectStyle).toHaveBeenCalledWith(tableBodyStyle);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('loads async styles and stores runtime styles when available', async () => {
    const picker = new TableStylePicker(props);
    picker.setState = jest.fn((state) => {
      picker.state = { ...picker.state, ...state };
    });
    (getStylesAsync as jest.Mock).mockResolvedValue([tableBodyStyle]);

    picker.componentDidMount();
    await Promise.resolve();

    const runtimeStyles = (setStyles as jest.Mock).mock.calls[0][0] as Array<{
      styleName: string;
    }>;
    expect(runtimeStyles.map((style) => style.styleName)).toEqual([
      'Normal',
      'Table body',
    ]);
    expect(picker.setState).toHaveBeenCalledWith({
      styles: runtimeStyles,
    });
  });

  it('falls back to cached styles and reports async loading errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const picker = new TableStylePicker(props);
    picker.setState = jest.fn();

    (getStylesAsync as jest.Mock).mockResolvedValueOnce([]);
    picker.componentDidMount();
    await Promise.resolve();

    expect(setStyles).not.toHaveBeenCalled();
    expect(picker.setState).toHaveBeenCalled();

    (getStylesAsync as jest.Mock).mockRejectedValueOnce(new Error('failed'));
    picker.componentDidMount();
    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
