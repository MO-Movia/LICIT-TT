/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState, Plugin, PluginKey} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {Node} from 'prosemirror-model';

import { UICommand } from '../../core';
import {TableBackgroundColorCommand} from './TableBackgroundColorCommand';
import {TableBorderColorCommand} from './TableBorderColorCommand';
import {createCommand} from './CreateCommand';
import {CellSelection, deleteTable, TableView} from 'prosemirror-tables';
import {TABLE} from './Constants';

const TABLE_BACKGROUND_COLOR = new TableBackgroundColorCommand();
const TABLE_BORDER_COLOR = new TableBorderColorCommand();
const TABLE_DELETE_TABLE = createCommand(deleteTable);

const VIGNETTE_COMMANDS_GROUP = [
  {
    'Fill Color...': TABLE_BACKGROUND_COLOR,
    'Border Color....': TABLE_BORDER_COLOR,
  },
  {
    'Delete Vignette': TABLE_DELETE_TABLE,
  },
];

export class VignetteView {
  constructor(editorView: EditorView) {
    this.setCustomMenu(editorView);
    this.setCustomTableNodeViewUpdate(editorView);
  }

  setCustomMenu(editorView: EditorView) {
    for (const pluginView of editorView['pluginViews']) {
      if (
        // 'TableCellTooltipView' has property _cellElement
        Object.hasOwn(pluginView, '_menu')
      ) {
        pluginView['_menu'] = this.getMenu.bind(this);
      }
    };
  }

  setCustomTableNodeViewUpdate(editorView: EditorView) {
    const tableNodeView = editorView['nodeViews']['table'];
    const tableNodeViewEx = this.tableNodeViewEx.bind(this, tableNodeView);
    editorView['nodeViews'][TABLE] = tableNodeViewEx;
    const index = editorView.state.plugins.findIndex((plugin) => {
      let found = false;
      if (plugin.spec.key) {
        found = plugin.spec.key['key'].includes('tableColumnResizing$');
      }
      return found;
    });
    if (-1 != index) {
      editorView.state.plugins[index].spec.props.nodeViews[TABLE] =
        tableNodeViewEx;
    }
  }

  tableNodeViewEx(
    tableNodeView: (node: Node, view: EditorView) => TableView,
    node: Node,
    view: EditorView
  ): TableView | undefined {
    const base = tableNodeView?.(node, view);
    if (base?.update && node.attrs.vignette) {
      base.update = this.updateEx.bind(base, base.update, this);
      this.updateBorder(base);
    }
    return base;
  }

  updateEx(
    update: (node: Node) => boolean,
    self: VignetteView,
    node: Node
  ): boolean {
    const result = Boolean(update.call(this, node));
    if (result) {
      self.updateBorder(this as unknown as TableView);
    }
    return result;
  }

  updateBorder(tableView: TableView) {
    if (tableView.table) {
      tableView.table.style.border = 'none';
    }
  }

  static isVignette(state: EditorState, actionNode: Node | null) {
    let vignette = false;
    if (state.selection instanceof CellSelection) {
      if (state.selection?.$anchorCell?.node(-1)?.attrs.vignette) {
        vignette = true;
      }
    }
    if (actionNode?.attrs.vignette) {
      vignette = true;
    }
    let parentNode = state.selection.$anchor?.node(1);
    if (parentNode.type.name === 'landscape_section') {
      parentNode = state.selection.$anchor?.node(2);
    }
    if (parentNode?.attrs.vignette) {
      vignette = true;
    }
    return vignette;
  }

  getMenu(
    state: EditorState,
    actionNode: Node,
    cmdGrps: Array<{[key: string]: UICommand}>
  ): Array<{[key: string]: UICommand}> {
    const vignette = VignetteView.isVignette(state, actionNode);

    for (const cmdGrp of cmdGrps) {
      for (const entry of Object.entries(cmdGrp)) {
        entry[1].isEnabled = this.isEnabledEx.bind(
          entry[1],
          entry[1].isEnabled
        );
      };
    };
    return vignette ? VIGNETTE_COMMANDS_GROUP : cmdGrps;
  }

  isEnabledEx(
    isEnabled: (state: EditorState, view?: EditorView) => boolean,
    state: EditorState,
    view?: EditorView
  ): boolean {
    return VignetteView.isVignette(state, null)
      ? false
      : Boolean(isEnabled.call(this as unknown as UICommand, state, view));
  }

  destroy = (): void => {
    // do nothing.
  };
}

const SPEC = {
  key: new PluginKey('VignetteMenuPlugin'),
  view(editorView: EditorView) {
    return new VignetteView(editorView);
  },
};

export class VignetteMenuPlugin extends Plugin {
  constructor() {
    super(SPEC);
  }
}
