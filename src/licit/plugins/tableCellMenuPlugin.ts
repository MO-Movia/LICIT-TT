/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState, Plugin, PluginKey} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';

import findActionableCell from '../findActionableCell';
import { atAnchorTopRight, createPopUp } from '../../commands';
import TableCellMenu from '../ui/tableCellMenu';
import bindScrollHandler from '../bindScrollHandler';
import isElementFullyVisible from '../isElementFullyVisible';
import {EditorViewEx} from '../constants';
import {CellSelection} from 'prosemirror-tables';

function findCellElement(node: Node): HTMLElement | null {
  const element =
    node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest('td, th') || null;
}

class TableCellTooltipView {
  _cellElement: HTMLElement | null;
  _popUp = null;
  _scrollHandle = null;
  _menu = null;

  constructor(editorView: EditorViewEx) {
    this.update(editorView, null);
  }

  update(view: EditorViewEx, _lastState: EditorState): void {
    const {state, readOnly} = view;
    const result = findActionableCell(state);

    if (!result || readOnly) {
      this.destroy();
      return;
    }

    // These is screen coordinate.
    const domFound = view.domAtPos(result.pos + 1);
    if (!domFound) {
      this.destroy();
      return;
    }

    let cellEl = findCellElement(domFound.node);
    const popUp = this._popUp;
    let actionNode = null;
    if (result && state.selection instanceof CellSelection) {
      actionNode = state.selection.$anchorCell.node(-1);
    }
    const viewPops = {
      editorState: state,
      editorView: view,
      pluginView: this,
      actionNode,
    };

    if (cellEl && !isElementFullyVisible(cellEl)) {
      cellEl = null;
    }

    if (!cellEl) {
      // Closes the popup.
      popUp?.close();
    } else if (popUp && cellEl === this._cellElement) {
      // Updates the popup.
      popUp.update(viewPops);
    } else {
      // Creates a new popup.
      popUp?.close();
      this._cellElement = cellEl;
      // [FS] IRAD-1009 2020-07-16
      // Does not allow Table Menu Popuup button in disable mode
      if (!view.disabled) {
        this._popUp = createPopUp(TableCellMenu, viewPops, {
          anchor: cellEl,
          autoDismiss: false,
          onClose: this._onClose,
          position: atAnchorTopRight,
        });
        this._onOpen();
      }
    }
  }

  destroy = (): void => {
    this._popUp?.close();
    this._popUp = null;
  };

  _onOpen = (): void => {
    const cellEl = this._cellElement;
    if (!cellEl) {
      return;
    }
    this._scrollHandle = bindScrollHandler(cellEl, this._onScroll);
  };

  _onClose = (): void => {
    this._popUp = null;
    this._scrollHandle?.dispose();
    this._scrollHandle = null;
  };

  _onScroll = (): void => {
    const popUp = this._popUp;
    const cellEl = this._cellElement;
    if (!popUp || !cellEl) {
      return;
    }
    // }
  };
}

// https://prosemirror.net/examples/tooltip/
const SPEC = {
  // [FS] IRAD-1005 2020-07-07
  // Upgrade outdated packages.
  key: new PluginKey('TableCellMenuPlugin'),
  view(editorView: EditorView) {
    return new TableCellTooltipView(editorView);
  },
};

class TableCellMenuPlugin extends Plugin {
  constructor() {
    super(SPEC);
  }
}

export default TableCellMenuPlugin;
