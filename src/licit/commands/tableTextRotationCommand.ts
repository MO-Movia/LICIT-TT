/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type {Node as ProseMirrorNode} from 'prosemirror-model';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import {
  CellSelection,
  isInTable,
  selectionCell,
  setCellAttr,
} from 'prosemirror-tables';

import {UICommand} from '../../core';
import {CLOCKWISE_TEXT_ROTATION} from '../extensions/tableTextRotation';

export const TABLE_TEXT_ROTATION_ATTRIBUTE = 'textRotation';

function getSelectedCells(state: EditorState): ProseMirrorNode[] {
  if (!isInTable(state)) {
    return [];
  }

  const cells: ProseMirrorNode[] = [];
  if (state.selection instanceof CellSelection) {
    state.selection.forEachCell((node) => cells.push(node));
    return cells;
  }

  const node = state.doc.nodeAt(selectionCell(state).pos);
  if (node) {
    cells.push(node);
  }
  return cells;
}

class TableTextRotationCommand extends UICommand {
  isEnabled = (state: EditorState): boolean => isInTable(state);

  isActive = (state: EditorState): boolean => {
    const cells = getSelectedCells(state);
    return (
      cells.length > 0 &&
      cells.every(
        (cell) =>
          cell.attrs[TABLE_TEXT_ROTATION_ATTRIBUTE] ===
          CLOCKWISE_TEXT_ROTATION
      )
    );
  };

  execute = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    _view?: EditorView
  ): boolean => {
    if (!this.isEnabled(state)) {
      return false;
    }

    const value = this.isActive(state) ? null : CLOCKWISE_TEXT_ROTATION;
    return setCellAttr(TABLE_TEXT_ROTATION_ATTRIBUTE, value)(state, dispatch);
  };

  waitForUserInput(
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<null> {
    return Promise.resolve(null);
  }

  executeWithUserInput(
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    _inputs?: unknown
  ): boolean {
    return false;
  }

  cancel(): void {
    return null;
  }

  executeCustom(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }

  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform
  ): Transform {
    return tr;
  }
}

export default TableTextRotationCommand;
