import { VignetteView, VignetteMenuPlugin } from './VignetteMenuPlugin';
import { PluginKey } from 'prosemirror-state';
import { TABLE } from './Constants';

jest.mock('prosemirror-tables', () => ({
  CellSelection: class {
    constructor() {
      this.$anchorCell = { node: jest.fn(() => ({ attrs: { vignette: true } })) };
    }
  },
  deleteTable: jest.fn(),
  TableView: class {
    constructor() {
      this.table = { style: {} };
      this.update = jest.fn(() => true);
    }
  },
}));

jest.mock('./TableBackgroundColorCommand', () => ({
  TableBackgroundColorCommand: jest.fn(() => ({ name: 'bgCmd', isEnabled: jest.fn(() => true) })),
}));
jest.mock('./TableBorderColorCommand', () => ({
  TableBorderColorCommand: jest.fn(() => ({ name: 'borderCmd', isEnabled: jest.fn(() => true) })),
}));
jest.mock('./CreateCommand', () => ({
  createCommand: jest.fn(() => jest.fn()),
}));

describe('VignetteView', () => {
  let editorView: any;
  let mockPluginViews: any[];
  let mockNodeViews: any;
  let plugin: any;
  let mockState: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPluginViews = [
      { _menu: true },
      { _menu: false },
      { somethingElse: true },
    ];

    mockNodeViews = {
      table: jest.fn(() => ({
        update: jest.fn(() => true),
        table: { style: {} },
      })),
    };

    plugin = {
      spec: {
        key: { key: 'tableColumnResizing$abc' },
        props: { nodeViews: { [TABLE]: jest.fn() } },
      },
    };

    mockState = {
      selection: {
        $anchor: { node: jest.fn(() => ({ attrs: { vignette: false } })) },
      },
      plugins: [plugin],
    };

    editorView = {
      pluginViews: mockPluginViews,
      nodeViews: mockNodeViews,
      state: mockState,
    };
  });

  test('constructor should call both setup methods', () => {
    const spyMenu = jest.spyOn(VignetteView.prototype, 'setCustomMenu');
    const spyUpdate = jest.spyOn(VignetteView.prototype, 'setCustomTableNodeViewUpdate');
    new VignetteView(editorView);
    expect(spyMenu).toHaveBeenCalledWith(editorView);
    expect(spyUpdate).toHaveBeenCalledWith(editorView);
  });

  test('setCustomMenu should bind getMenu to menu-like pluginViews', () => {
    const view = new VignetteView(editorView);
    view.setCustomMenu(editorView);
    expect(mockPluginViews[0]._menu).toBeInstanceOf(Function);
    expect(mockPluginViews[1]._menu).toBeDefined();
  });

  test('setCustomTableNodeViewUpdate should patch nodeViews and plugin', () => {
    new VignetteView(editorView);
    expect(editorView.nodeViews[TABLE]).toBeInstanceOf(Function);
    expect(plugin.spec.props.nodeViews[TABLE]).toBeInstanceOf(Function);
  });

  test('setCustomTableNodeViewUpdate should handle missing plugin key safely', () => {
    editorView.state.plugins = [{ spec: {} }];
    const view = new VignetteView(editorView);
    view.setCustomTableNodeViewUpdate(editorView);
    expect(typeof editorView.nodeViews[TABLE]).toBe('function');
  });

  test('tableNodeViewEx returns base view and calls updateBorder if vignette', () => {
    const view = new VignetteView(editorView);
    const node = { attrs: { vignette: true } };
    const base = { update: jest.fn(), table: { style: {} } };
    const spyUpdateBorder = jest.spyOn(view, 'updateBorder');
    const result = view.tableNodeViewEx(() => base as any, node as any, {} as any);
    expect(spyUpdateBorder).toHaveBeenCalled();
    expect(result).toBe(base);
  });

  test('tableNodeViewEx returns base view without modification if not vignette', () => {
    const view = new VignetteView(editorView);
    const node = { attrs: { vignette: false } };
    const base = { update: jest.fn() };
    const result = view.tableNodeViewEx(() => base as any, node as any, {} as any);
    expect(result).toBe(base);
  });

  test('updateEx calls inner update and triggers updateBorder if true', () => {
    const view = new VignetteView(editorView);
    const mockUpdate = jest.fn(() => true);
    const mockSelf = { updateBorder: jest.fn() };
    const tableView = { table: { style: {} } };
    const result = view.updateEx.call(tableView, mockUpdate, mockSelf as any, { node: 'x' } as any);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSelf.updateBorder).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('updateEx does not trigger updateBorder if update returns false', () => {
    const view = new VignetteView(editorView);
    const mockUpdate = jest.fn(() => false);
    const mockSelf = { updateBorder: jest.fn() };
    const result = view.updateEx.call({}, mockUpdate, mockSelf as any, {} as any);
    expect(mockSelf.updateBorder).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test('updateBorder sets border to none if table exists', () => {
    const tableView = { table: { style: {} } };
    const view = new VignetteView(editorView);
    view.updateBorder(tableView as any);
    expect(tableView.table.style.border).toBe('none');
  });

  test('updateBorder safely ignores if table missing', () => {
    const view = new VignetteView(editorView);
    expect(() => view.updateBorder({} as any)).not.toThrow();
  });

  test('isVignette detects vignette in multiple locations', () => {
    const CellSelection = require('prosemirror-tables').CellSelection;
    const selection = new CellSelection();
    const node = { attrs: { vignette: true } };
    const state = {
      selection,
      selectionType: 'cell',
      selectionMock: { $anchor: { node: jest.fn(() => ({ attrs: { vignette: false } })) } },
    };
    expect(VignetteView.isVignette(state as any, node as any)).toBe(true);
  });

  test('isVignette returns true if $anchor node vignette', () => {
    const state = {
      selection: { $anchor: { node: jest.fn(() => ({ attrs: { vignette: true } })) } },
    };
    expect(VignetteView.isVignette(state as any, { attrs: {} } as any)).toBe(true);
  });

  test('getMenu patches command isEnabled and returns vignette group if vignette', () => {
    const view = new VignetteView(editorView);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValue(true);
    const cmd = { isEnabled: jest.fn(() => true) };
    const cmdGroups = [{ cmdA: cmd }];
    const result = view.getMenu(mockState, { attrs: { vignette: true } } as any, cmdGroups as any);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toBeDefined();
  });

  test('getMenu returns unmodified cmdGrps when not vignette', () => {
    const view = new VignetteView(editorView);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValue(false);
    const cmd = { isEnabled: jest.fn(() => true) };
    const cmdGroups = [{ cmdA: cmd }];
    const result = view.getMenu(mockState, { attrs: {} } as any, cmdGroups as any);
    expect(result).toBe(cmdGroups);
  });

  test('isEnabledEx disables command if vignette else calls original', () => {
    const view = new VignetteView(editorView);
    const isEnabled = jest.fn(() => true);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValueOnce(true);
    const result1 = view.isEnabledEx(isEnabled, mockState as any);
    expect(result1).toBe(false);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValueOnce(false);
    const result2 = view.isEnabledEx(isEnabled, mockState as any);
    expect(result2).toBe(true);
    expect(isEnabled).toHaveBeenCalled();
  });

  test('destroy does nothing safely', () => {
    const view = new VignetteView(editorView);
    expect(view.destroy()).toBeUndefined();
  });

});
