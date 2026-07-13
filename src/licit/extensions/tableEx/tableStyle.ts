/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import { Node } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';

import { applyStyleForTableColumnCell } from '../../../plugins/custom-styles/CustomStyleCommand';
import { getCustomStyleByName } from '../../../plugins/custom-styles/customStyle';
import { RESERVED_STYLE_NONE } from '../../../plugins/custom-styles/CustomStyleNodeSpec';

export const TABLE_STYLE_NAME_ATTRIBUTE = 'tableStyleName';
export const DEFAULT_TABLE_STYLE_NAME = RESERVED_STYLE_NONE;

type TableAtPosition = {
  node: Node;
  pos: number;
};

function isStylableNode(node: Node): boolean {
  return (
    node.type.name === 'paragraph' ||
    node.type.name === 'enhanced_table_figure_notes'
  );
}

export function normalizeTableStyleName(styleName: string): string {
  return styleName === 'Default' ? RESERVED_STYLE_NONE : styleName;
}

export function findTableAtSelection(
  state: EditorState
): TableAtPosition | null {
  const { $from, $to } = state.selection;

  for (const $pos of [$from, $to]) {
    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name === 'table') {
        return {
          node: $pos.node(depth),
          pos: $pos.before(depth),
        };
      }
    }
  }

  return null;
}

export function isSelectionInsideTable(state: EditorState): boolean {
  return !!findTableAtSelection(state);
}

export function applyTableStyle(
  state: EditorState,
  tr: Transform,
  tablePos: number,
  styleName: string
): Transform {
  const normalizedStyleName = normalizeTableStyleName(styleName);
  const table = tr.doc.nodeAt(tablePos);

  if (!table || table.type.name !== 'table') {
    return tr;
  }

  tr = tr.setNodeMarkup(tablePos, undefined, {
    ...table.attrs,
    [TABLE_STYLE_NAME_ATTRIBUTE]: normalizedStyleName,
  });

  const tableEnd = tablePos + table.nodeSize;
  const style = getCustomStyleByName(normalizedStyleName);

  tr.doc.nodesBetween(tablePos + 1, tableEnd - 1, (node, pos) => {
    if (isStylableNode(node)) {
      tr = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        styleName: normalizedStyleName,
      });
      const styledNode = tr.doc.nodeAt(pos) || node;
      tr = applyStyleForTableColumnCell(
        style,
        normalizedStyleName,
        state,
        tr,
        styledNode,
        pos,
        undefined,
        false
      );
    }
  });

  return tr;
}

/**
 * Restores the table's selected style after a structural table command creates
 * new cells. Existing cells are deliberately included so a table remains one
 * coherent style after row and column operations.
 */
export function applyStoredTableStyles(
  state: EditorState,
  tr: Transform
): Transform {
  const tables: Array<{ pos: number; styleName: string }> = [];

  tr.doc.descendants((node, pos) => {
    const styleName = node.attrs?.[TABLE_STYLE_NAME_ATTRIBUTE];
    if (
      node.type.name === 'table' &&
      typeof styleName === 'string' &&
      styleName
    ) {
      tables.push({ pos, styleName });
    }
  });

  for (const table of tables) {
    tr = applyTableStyle(state, tr, table.pos, table.styleName);
  }

  return tr;
}
