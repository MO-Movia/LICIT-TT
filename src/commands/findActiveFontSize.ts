/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState, TextSelection } from 'prosemirror-state';
import { findParentNodeOfType } from 'prosemirror-utils';

import { MARK_FONT_SIZE } from './MarkNames';
import { HEADING } from './NodeNames';
import findActiveMark from '../licit/findActiveMark';

type CellSelectionLike = TextSelection & {
  forEachCell?: (callback: (node: import('prosemirror-model').Node) => void) => void;
  $anchorCell?: {pos: number};
};

// This should map to `--czi-content-font-size` at `czi-editor.css`.
const FONT_PT_SIZE_DEFAULT = 11;

// This should map to `czi-heading.css`.
const MAP_HEADING_LEVEL_TO_FONT_PT_SIZE = {
  '1': 20,
  '2': 18,
  '3': 16,
  '4': 14,
  '5': 11,
  '6': 11,
};

function normalizeFontSize(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : null;
}

function getCellFontSize(
  cell: import('prosemirror-model').Node,
  markType: import('prosemirror-model').MarkType
): string | null {
  const fallback = normalizeFontSize(cell.attrs.fontSize);
  const values: string[] = [];
  cell.descendants((node) => {
    if (!node.isText || !node.text?.trim()) {
      return true;
    }
    const mark = node.marks.find((candidate) => candidate.type === markType);
    values.push(normalizeFontSize(mark?.attrs.pt) ?? fallback ?? '');
    return false;
  });
  if (!values.length) {
    return fallback;
  }
  return values.every((value) => value === values[0])
    ? values[0] || null
    : 'Mixed';
}

function findSelectedCellFontSize(
  state: EditorState,
  markType: import('prosemirror-model').MarkType
): string | null {
  const cells: import('prosemirror-model').Node[] = [];
  const selection = state.selection as CellSelectionLike;
  selection.forEachCell?.((node) => cells.push(node));

  if (!cells.length && selection.$anchorCell) {
    const node = state.doc.nodeAt(selection.$anchorCell.pos);
    if (node) {
      cells.push(node);
    }
  }

  if (!cells.length) {
    for (let depth = state.selection.$from.depth; depth > 0; depth--) {
      const node = state.selection.$from.node(depth);
      if (
        node.type.spec.tableRole === 'cell' ||
        node.type.spec.tableRole === 'header_cell' ||
        ['tableCell', 'tableHeader', 'table_cell', 'table_header'].includes(
          node.type.name
        )
      ) {
        cells.push(node);
        break;
      }
    }
  }

  const values = cells
    .map((cell) => getCellFontSize(cell, markType))
    .filter((value): value is string => value !== null);
  if (!values.length) {
    return null;
  }
  return values.every((value) => value === values[0]) ? values[0] : 'Mixed';
}

export default function findActiveFontSize(state: EditorState): string {
  const { schema, doc, selection, tr } = state;
  const markType = schema.marks[MARK_FONT_SIZE];
  const heading = schema.nodes[HEADING];
  const defaultSize = String(FONT_PT_SIZE_DEFAULT);
  if (!markType) {
    return defaultSize;
  }

  const { from, to, empty } = selection;
  if (empty) {
    const storedMarks =
      tr.storedMarks ||
      state.storedMarks ||
      (selection as TextSelection).$cursor?.marks?.() ||
      [];
    const sm = storedMarks.find((m) => m.type === markType);
    if (sm) {
      return String(sm.attrs.pt || defaultSize);
    }
    return findSelectedCellFontSize(state, markType) ?? defaultSize;
  }

  const mark = findActiveMark(doc, from, to, markType);
  if (mark) {
    return String(mark.attrs.pt);
  }
  const cellFontSize = findSelectedCellFontSize(state, markType);
  if (cellFontSize) {
    return cellFontSize;
  }
  if (!heading) {
    return defaultSize;
  }
  const result = findParentNodeOfType(heading)(state.selection);
  if (!result) {
    return defaultSize;
  }
  const level = String(result.node.attrs.level);
  return MAP_HEADING_LEVEL_TO_FONT_PT_SIZE[level] as string || defaultSize;
}
