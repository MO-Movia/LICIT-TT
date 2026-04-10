/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {CellSelection} from 'prosemirror-tables';
import type {EditorState} from 'prosemirror-state';
import type {Node as PMNode} from 'prosemirror-model';
import type {EditorView} from 'prosemirror-view';
import type {TableView} from 'prosemirror-tables';
import type {UICommand} from '../../core';
import {VignetteView} from './VignetteMenuPlugin';
import {TABLE} from './Constants';

jest.mock('prosemirror-tables', () => ({
  CellSelection: class {
    $anchorCell: { node: jest.Mock };

    constructor() {
      this.$anchorCell = { node: jest.fn(() => ({ attrs: { vignette: true } })) };
    }
  },
  deleteTable: jest.fn(),
  TableView: class {
    table: { style: { border?: string } };
    update: jest.Mock<boolean, []>;

    constructor() {
      this.table = { style: {} };
      this.update = jest.fn(() => true);
    }
  },
}));

jest.mock('./TableBackgroundColorCommand', () => ({
  TableBackgroundColorCommand: jest.fn(() => ({
    name: 'bgCmd',
    isEnabled: jest.fn(() => true),
  })),
}));
jest.mock('./TableBorderColorCommand', () => ({
  TableBorderColorCommand: jest.fn(() => ({
    name: 'borderCmd',
    isEnabled: jest.fn(() => true),
  })),
}));
jest.mock('./CreateCommand', () => ({
  createCommand: jest.fn(() => jest.fn()),
}));

describe('VignetteView', () => {
  type MockPluginView = {
    _menu?: unknown;
    [key: string]: unknown;
  };
  type MockPlugin = {
    spec: {
      key?: {key?: string};
      props?: {nodeViews: Record<string, unknown>};
    };
  };
  type MockState = {
    selection: {
      $anchor?: {node: jest.Mock};
      $anchorCell?: {node: jest.Mock};
    };
    plugins: MockPlugin[];
    selectionType?: string;
  };
  type MockEditorView = {
    pluginViews: MockPluginView[];
    nodeViews: Record<string, unknown>;
    state: MockState;
  };

  let editorView: MockEditorView;
  let mockPluginViews: MockPluginView[];
  let mockNodeViews: Record<string, unknown>;
  let plugin: MockPlugin;
  let mockState: MockState;

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
        $anchor: {node: jest.fn(() => ({attrs: {vignette: false}}))},
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
    new VignetteView(editorView as unknown as EditorView);
    expect(spyMenu).toHaveBeenCalledWith(editorView);
    expect(spyUpdate).toHaveBeenCalledWith(editorView);
  });

  test('setCustomMenu should bind getMenu to menu-like pluginViews', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    view.setCustomMenu(editorView as unknown as EditorView);
    expect(mockPluginViews[0]._menu).toBeInstanceOf(Function);
    expect(mockPluginViews[1]._menu).toBeDefined();
  });

  test('setCustomTableNodeViewUpdate should patch nodeViews and plugin', () => {
    new VignetteView(editorView as unknown as EditorView);
    expect(editorView.nodeViews[TABLE]).toBeInstanceOf(Function);
    expect(plugin.spec.props.nodeViews[TABLE]).toBeInstanceOf(Function);
  });

  test('setCustomTableNodeViewUpdate should handle missing plugin key safely', () => {
    editorView.state.plugins = [{spec: {}}];
    const view = new VignetteView(editorView as unknown as EditorView);
    view.setCustomTableNodeViewUpdate(editorView as unknown as EditorView);
    expect(typeof editorView.nodeViews[TABLE]).toBe('function');
  });

  test('tableNodeViewEx returns base view and calls updateBorder if vignette', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    const node = {attrs: {vignette: true}};
    const base = {update: jest.fn(), table: {style: {}}};
    const spyUpdateBorder = jest.spyOn(view, 'updateBorder');
    const result = view.tableNodeViewEx(
      () => base as unknown as TableView,
      node as unknown as PMNode,
      {} as unknown as EditorView
    );
    expect(spyUpdateBorder).toHaveBeenCalled();
    expect(result).toBe(base);
  });

  test('tableNodeViewEx returns base view without modification if not vignette', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    const node = {attrs: {vignette: false}};
    const base = {update: jest.fn()};
    const result = view.tableNodeViewEx(
      () => base as unknown as TableView,
      node as unknown as PMNode,
      {} as unknown as EditorView
    );
    expect(result).toBe(base);
  });

  test('updateEx calls inner update and triggers updateBorder if true', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    const mockUpdate = jest.fn(() => true);
    const mockSelf = {updateBorder: jest.fn()};
    const tableView = {table: {style: {}}};
    const result = view.updateEx.call(
      tableView,
      mockUpdate,
      mockSelf as unknown as VignetteView,
      {} as unknown as PMNode
    );
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSelf.updateBorder).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('updateEx does not trigger updateBorder if update returns false', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    const mockUpdate = jest.fn(() => false);
    const mockSelf = {updateBorder: jest.fn()};
    const result = view.updateEx.call(
      {},
      mockUpdate,
      mockSelf as unknown as VignetteView,
      {} as unknown as PMNode
    );
    expect(mockSelf.updateBorder).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test('updateBorder sets border to none if table exists', () => {
    const tableView: {table: {style: {border?: string}}} = {
      table: {style: {}},
    };
    const view = new VignetteView(editorView as unknown as EditorView);
    view.updateBorder(tableView as unknown as TableView);
    expect(tableView.table.style.border).toBe('none');
  });

  test('updateBorder safely ignores if table missing', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    expect(() => view.updateBorder({} as unknown as TableView)).not.toThrow();
  });

  test('isVignette detects vignette in multiple locations', () => {
    const selection = new CellSelection({} as unknown as never);
    const node = {attrs: {vignette: true}};
    const state = {
      selection,
      selectionType: 'cell',
    };
    Object.defineProperty(selection, '$anchor', {
      value: {
        node: jest.fn(() => ({
          type: { name: 'paragraph' },
          attrs: { vignette: false },
        })),
      },
    });
    expect(
      VignetteView.isVignette(
        state as unknown as EditorState,
        node as unknown as PMNode
      )
    ).toBe(true);
  });

  test('isVignette returns true if $anchor node vignette', () => {
    const anchorNode = {
      type: {name: 'paragraph'},
      attrs: {vignette: true},
    };
    const state = {
      selection: {$anchor: {node: jest.fn(() => anchorNode)}},
    };
    expect(
      VignetteView.isVignette(
        state as unknown as EditorState,
        {attrs: {}} as unknown as PMNode
      )
    ).toBe(true);
  });

  test('getMenu patches command isEnabled and returns vignette group if vignette', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValue(true);
    const cmd = {isEnabled: jest.fn(() => true)};
    const cmdGroups = [{cmdA: cmd}] as unknown as Array<Record<string, UICommand>>;
    const result = view.getMenu(
      mockState as unknown as EditorState,
      {attrs: {vignette: true}} as unknown as PMNode,
      cmdGroups
    );
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toBeDefined();
  });

  test('getMenu returns unmodified cmdGrps when not vignette', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValue(false);
    const cmd = {isEnabled: jest.fn(() => true)};
    const cmdGroups = [{cmdA: cmd}] as unknown as Array<Record<string, UICommand>>;
    const result = view.getMenu(
      mockState as unknown as EditorState,
      {attrs: {}} as unknown as PMNode,
      cmdGroups
    );
    expect(result).toBe(cmdGroups);
  });

  test('isEnabledEx disables command if vignette else calls original', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    const isEnabled = jest.fn(() => true);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValueOnce(true);
    const result1 = view.isEnabledEx(
      isEnabled,
      mockState as unknown as EditorState
    );
    expect(result1).toBe(false);
    jest.spyOn(VignetteView, 'isVignette').mockReturnValueOnce(false);
    const result2 = view.isEnabledEx(
      isEnabled,
      mockState as unknown as EditorState
    );
    expect(result2).toBe(true);
    expect(isEnabled).toHaveBeenCalled();
  });

  test('destroy does nothing safely', () => {
    const view = new VignetteView(editorView as unknown as EditorView);
    expect(view.destroy()).toBeUndefined();
  });

});
