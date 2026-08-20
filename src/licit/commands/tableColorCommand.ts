/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import nullthrows from '../nullthrows';
import type { ResolvedPos } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import {
  CellSelection,
  isInTable,
  selectionCell,
  setCellAttr,
  TableMap,
} from 'prosemirror-tables';

import {
  atAnchorRight,
  createPopUp,
  PopUpHandle,
  RuntimeService,
  // ColorEditor
} from '../../commands';
import { ColorEditor } from '@modusoperandi/color-picker';
import { UICommand } from '../../core';

const BORDER_SIDES = ['Top', 'Bottom', 'Left', 'Right'] as const;
type BorderSide = (typeof BORDER_SIDES)[number];

const OPPOSITE_BORDER_SIDE: Record<BorderSide, BorderSide> = {
  Top: 'Bottom',
  Bottom: 'Top',
  Left: 'Right',
  Right: 'Left',
};

type CellRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type CellRange = {
  columnEnd: number;
  columnStart: number;
  rowEnd: number;
  rowStart: number;
};

type ColorEditorResult = {
  color: string | null;
  selectedPosition?: string[];
};

function normalizeBorderSides(sides?: string[]): BorderSide[] {
  if (!sides) {
    return [];
  }

  return BORDER_SIDES.filter((side) => sides.includes(side));
}

function findTableDepth($cell: ResolvedPos): number {
  for (let depth = $cell.depth; depth >= 0; depth--) {
    if ($cell.node(depth).type.spec.tableRole === 'table') {
      return depth;
    }
  }

  return -1;
}

function getAdjacentRange(rect: CellRect, side: BorderSide): CellRange {
  switch (side) {
    case 'Top':
      return {
        columnEnd: rect.right,
        columnStart: rect.left,
        rowEnd: rect.top,
        rowStart: rect.top - 1,
      };
    case 'Bottom':
      return {
        columnEnd: rect.right,
        columnStart: rect.left,
        rowEnd: rect.bottom + 1,
        rowStart: rect.bottom,
      };
    case 'Left':
      return {
        columnEnd: rect.left,
        columnStart: rect.left - 1,
        rowEnd: rect.bottom,
        rowStart: rect.top,
      };
    case 'Right':
      return {
        columnEnd: rect.right + 1,
        columnStart: rect.right,
        rowEnd: rect.bottom,
        rowStart: rect.top,
      };
  }
}

function addMappedCell(
  adjacent: Set<number>,
  map: TableMap,
  tableStart: number,
  row: number,
  column: number
): void {
  if (
    row < 0 ||
    row >= map.height ||
    column < 0 ||
    column >= map.width
  ) {
    return;
  }

  adjacent.add(tableStart + map.map[row * map.width + column]);
}

class TableColorCommand extends UICommand {
  executeCustom(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }
  executeCustomStyleForTable(_state: EditorState, tr: Transform): Transform {
    return tr;
  }
  _popUp?: PopUpHandle = null;
  attribute = null;

  constructor(attribute: string) {
    super();
    this.attribute = attribute;
  }

  shouldRespondToUIEvent = (e: React.SyntheticEvent | MouseEvent): boolean => {
    return e.type === UICommand.EventType.MOUSEENTER;
  };

  isEnabled = (state: EditorState): boolean => {
    const { $from } = state.selection;

    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === 'table') {
        return true;
      }
    }
    return false;
  };

  waitForUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    event?: React.SyntheticEvent
  ): Promise<PromiseConstructor> => {
    // replaced any with PromiseConstructor seems to not cause any errors
    this.cancel();
    const target = nullthrows(event).currentTarget;

    if (!(target instanceof HTMLElement)) {
      return Promise.resolve(undefined);
    }


    const anchor = event ? event.currentTarget : null;
    return new Promise((resolve) => {
      this._popUp = createPopUp(
        ColorEditor,
        {
          hex: null,
          runtime: RuntimeService.Runtime,
          Textcolor: null,
          showCheckbox: this.attribute !== 'backgroundColor',
        },
        {
          anchor,
          popUpId: 'mo-menuList-child',
          position: atAnchorRight,
          autoDismiss: true,
          onClose: (val) => {
            this._popUp = null;
            resolve(val);
          },
        }
      );
    });
  };

  executeWithUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    hex?: ColorEditorResult
  ): boolean => {
    if (!hex || typeof hex.color !== 'string' || !hex.color.trim()) {
      return false;
    }

    const activeState = _view?.state ?? _state;
    const activeDispatch: ((tr: Transaction) => void) | undefined = _view
      ? (tr) => _view.dispatch(tr)
      : _dispatch;

    if (this.attribute !== 'borderColor') {
      return setCellAttr(this.attribute, hex.color)(
        activeState,
        activeDispatch
      );
    }

    return this.setCellBorders(
      activeState,
      activeDispatch,
      hex.selectedPosition,
      hex.color
    );
  };

  cancel(): void {
    const popUp = this._popUp;
    this._popUp = null;
    popUp?.close(undefined);
  }

  setCellBorders(
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined,
    selectedPosition: string[] | undefined,
    color: string
  ): boolean {
    const selectedSides = normalizeBorderSides(selectedPosition);
    if (selectedSides.length === 0 || !isInTable(state)) {
      return false;
    }

    const selectedSideSet = new Set<BorderSide>(selectedSides);
    const selectedCells: number[] = [];
    if (state.selection instanceof CellSelection) {
      state.selection.forEachCell((_node, pos) => selectedCells.push(pos));
    } else {
      selectedCells.push(selectionCell(state).pos);
    }

    type PendingCellUpdate = {
      attrs: Record<string, unknown>;
      changed: boolean;
    };
    const pendingUpdates = new Map<number, PendingCellUpdate>();

    const getPendingUpdate = (pos: number): PendingCellUpdate | null => {
      const existing = pendingUpdates.get(pos);
      if (existing) {
        return existing;
      }

      const node = state.doc.nodeAt(pos);
      const tableRole = node?.type.spec.tableRole;
      if (!node || (tableRole !== 'cell' && tableRole !== 'header_cell')) {
        return null;
      }

      const update = {
        attrs: { ...node.attrs },
        changed: false,
      };
      pendingUpdates.set(pos, update);
      return update;
    };

    const updateCellSides = (pos: number, sides: BorderSide[]): void => {
      const update = getPendingUpdate(pos);
      if (!update) {
        return;
      }

      const { attrs } = update;
      const aggregateColor =
        typeof attrs.borderColor === 'string' && attrs.borderColor.trim()
          ? attrs.borderColor
          : null;

      for (const side of BORDER_SIDES) {
        const colorAttr = `border${side}Color`;
        const nextColor = sides.includes(side)
          ? color
          : (attrs[colorAttr] ?? aggregateColor);

        if (nextColor !== attrs[colorAttr]) {
          attrs[colorAttr] = nextColor;
          update.changed = true;
        }
      }

      // Aggregate borderColor has different render precedence on tableCell and
      // tableHeader. Materialize it into the four side colors, then clear it so
      // a selected side always wins and Table Settings reads the same values.
      if (attrs.borderColor !== null) {
        attrs.borderColor = null;
        update.changed = true;
      }
    };

    const getAdjacentCellPositions = (
      cellPos: number,
      side: BorderSide
    ): number[] => {
      const $cell = state.doc.resolve(cellPos);
      const tableDepth = findTableDepth($cell);
      if (tableDepth < 0) {
        return [];
      }

      const table = $cell.node(tableDepth);
      const tableStart = $cell.start(tableDepth);
      const map = TableMap.get(table);
      const rect = map.findCell(cellPos - tableStart);
      const adjacent = new Set<number>();
      const range = getAdjacentRange(rect, side);

      for (let row = range.rowStart; row < range.rowEnd; row++) {
        for (let column = range.columnStart; column < range.columnEnd; column++) {
          addMappedCell(adjacent, map, tableStart, row, column);
        }
      }
      adjacent.delete(cellPos);
      return [...adjacent];
    };

    for (const cellPos of selectedCells) {
      updateCellSides(cellPos, selectedSides);
      for (const side of selectedSideSet) {
        for (const adjacentPos of getAdjacentCellPositions(cellPos, side)) {
          updateCellSides(adjacentPos, [OPPOSITE_BORDER_SIDE[side]]);
        }
      }
    }

    const changedUpdates = [...pendingUpdates.entries()].filter(
      ([, update]) => update.changed
    );
    if (changedUpdates.length === 0) {
      return false;
    }

    if (dispatch) {
      const tr = state.tr;
      for (const [pos, update] of changedUpdates) {
        tr.setNodeMarkup(pos, undefined, update.attrs);
      }
      dispatch(tr);
    }

    return true;
  }
}

export default TableColorCommand;
