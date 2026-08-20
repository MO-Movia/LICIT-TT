/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Mark, Node } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';
import { TableMap } from 'prosemirror-tables';
import {
  applyStyleForTableColumnCell,
  getMarkByStyleName,
} from '../../../plugins/custom-styles/CustomStyleCommand';
import { getCustomStyleByName } from '../../../plugins/custom-styles/customStyle';
import { RESERVED_STYLE_NONE } from '../../../plugins/custom-styles/CustomStyleNodeSpec';

export const TABLE_STYLE_NAME_ATTRIBUTE = 'tableStyleName';
export {
  RESERVED_STYLE_NONE as DEFAULT_TABLE_STYLE_NAME,
} from '../../../plugins/custom-styles/CustomStyleNodeSpec';
export const PENDING_TABLE_MARKS_ATTRIBUTE = 'pendingMarks';

type TableAtPosition = {
  node: Node;
  pos: number;
};
export type TableStyleOperation =
  | 'addColumnAfter'
  | 'addColumnBefore'
  | 'addRowAfter'
  | 'addRowBefore';

type ParagraphOverrideSnapshot = {
  attrs: Record<string, unknown>;
  marks: Mark[];
};

type CellOverrideSnapshot = ParagraphOverrideSnapshot[];

type OverrideCopy = {
  source: CellOverrideSnapshot;
  targetCellPos: number;
};

type RectLike = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const FORMAT_MARK_NAMES = new Set([
  'em',
  'mark-font-size',
  'mark-font-type',
  'mark-text-color',
  'mark-text-highlight',
  'strike',
  'strong',
  'sub',
  'super',
  'underline',
  'override',
]);

const DIRECT_PARAGRAPH_OVERRIDE_ATTRS = [
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginTop',
  'paddingBottom',
  'paddingTop',
  'paragraphSpacingAfter',
  'paragraphSpacingBefore',
];

const OVERRIDDEN_PARAGRAPH_ATTRS = [
  {
    flag: 'overriddenAlign',
    value: 'overriddenAlignValue',
    attrs: ['align'],
  },
  {
    flag: 'overriddenIndent',
    value: 'overriddenIndentValue',
    attrs: ['indent'],
  },
  {
    flag: 'overriddenLineSpacing',
    value: 'overriddenLineSpacingValue',
    attrs: ['lineSpacing'],
  },
];

function isStylableNode(node: Node): boolean {
  return (
    node.type.name === 'paragraph' ||
    node.type.name === 'enhanced_table_figure_notes'
  );
}

function isVignetteTable(node: Node): boolean {
  return node.attrs?.vignette === true || node.attrs?.vignette === 'true';
}
function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function isOverrideFlag(value: unknown): boolean {
  return value === true || value === 'true' || hasValue(value);
}

function getSelectedRect(state: EditorState, tablePos: number): RectLike | null {
  const { selection } = state;
  const { $from, $to } = selection;
  const table = state.doc.nodeAt(tablePos);

  if (table?.type.name !== 'table') {
    return null;
  }

  const map = TableMap.get(table);
  const tableStart = tablePos + 1;
  const tableEnd = tablePos + table.nodeSize;
  const positions = [$from, $to];
  const cellPositions: number[] = [];

  for (const $pos of positions) {
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth);
      if (
        node.type.spec.tableRole === 'cell' ||
        node.type.spec.tableRole === 'header_cell'
      ) {
        cellPositions.push($pos.before(depth));
        break;
      }
    }
  }

  if (!cellPositions.length) {
    return null;
  }

  const [anchorPos, headPos = anchorPos] = cellPositions;
  if (
    anchorPos <= tablePos ||
    anchorPos >= tableEnd ||
    headPos <= tablePos ||
    headPos >= tableEnd
  ) {
    return null;
  }

  return map.rectBetween(anchorPos - tableStart, headPos - tableStart);
}

function isSupportedOverrideMark(mark: Mark): boolean {
  return (
    FORMAT_MARK_NAMES.has(mark.type.name) &&
    (mark.type.name === 'override' || mark.attrs?.overridden === true)
  );
}

function sameMark(left: Mark, right: Mark): boolean {
  return left.eq(right);
}

function sameMarks(left: readonly Mark[] | null, right: readonly Mark[]): boolean {
  if (left?.length !== right.length) {
    return false;
  }

  return right.every((mark) => left.some((storedMark) => storedMark.eq(mark)));
}

function serializeMarks(marks: Mark[]): Array<Record<string, unknown>> {
  return marks.map((mark) => mark.toJSON() as Record<string, unknown>);
}

function deserializeMarks(
  state: EditorState,
  pendingMarks: unknown
): Mark[] {
  if (!Array.isArray(pendingMarks)) {
    return [];
  }

  const marks: Mark[] = [];
  for (const markJson of pendingMarks) {
    try {
      marks.push(state.schema.markFromJSON(markJson));
    } catch {
      // Ignore stale mark JSON from older schemas.
    }
  }

  return marks;
}

function getStyleMarksForNode(state: EditorState, node: Node): Mark[] {
  const styleName = node.attrs?.styleName;
  return typeof styleName === 'string' && styleName
    ? getMarkByStyleName(styleName, state.schema)
    : [];
}

function getEffectivePendingMarks(state: EditorState, node: Node): Mark[] {
  const styleMarks = getStyleMarksForNode(state, node);
  const pendingMarks = deserializeMarks(
    state,
    node.attrs?.[PENDING_TABLE_MARKS_ATTRIBUTE]
  );

  if (!styleMarks.length) {
    return pendingMarks;
  }

  const marksByType = new Map(
    styleMarks.map((mark) => [mark.type.name, mark])
  );
  for (const mark of pendingMarks) {
    if (mark.type.name === 'override' || mark.attrs?.overridden === true) {
      marksByType.set(mark.type.name, mark);
    }
  }

  return [...marksByType.values()];
}

function getWholeParagraphOverrideMarks(paragraph: Node): Mark[] {
  const textNodes: Node[] = [];

  paragraph.descendants((node) => {
    if (node.isText && node.text?.length) {
      textNodes.push(node);
    }
    return true;
  });

  if (!textNodes.length) {
    return [];
  }

  const candidates = textNodes[0].marks.filter(isSupportedOverrideMark);
  return candidates.filter((candidate) =>
    textNodes.every((node) =>
      node.marks.some((mark) => sameMark(mark, candidate))
    )
  );
}

function getParagraphOverrideAttrs(node: Node): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};

  for (const group of OVERRIDDEN_PARAGRAPH_ATTRS) {
    const flag = node.attrs[group.flag];
    const value = node.attrs[group.value];
    if (!isOverrideFlag(flag) && !hasValue(value)) {
      continue;
    }

    attrs[group.flag] = flag;
    attrs[group.value] = value;
    for (const attrName of group.attrs) {
      attrs[attrName] = node.attrs[attrName];
    }
  }

  for (const attrName of DIRECT_PARAGRAPH_OVERRIDE_ATTRS) {
    if (hasValue(node.attrs[attrName])) {
      attrs[attrName] = node.attrs[attrName];
    }
  }

  return attrs;
}

function findParagraphsInCell(
  cell: Node,
  cellPos: number
): Array<{ node: Node; pos: number }> {
  const paragraphs: Array<{ node: Node; pos: number }> = [];

  cell.descendants((node, pos) => {
    if (isStylableNode(node)) {
      paragraphs.push({ node, pos: cellPos + 1 + pos });
    }
    return true;
  });

  return paragraphs;
}

function getCellOverrideSnapshot(cell: Node): CellOverrideSnapshot {
  const snapshots: CellOverrideSnapshot = [];

  cell.descendants((node) => {
    if (isStylableNode(node)) {
      snapshots.push({
        attrs: getParagraphOverrideAttrs(node),
        marks: getWholeParagraphOverrideMarks(node),
      });
    }
    return true;
  });

  return snapshots;
}

function getCellPos(
  tablePos: number,
  table: Node,
  map: TableMap,
  row: number,
  col: number
): number | null {
  if (row < 0 || col < 0 || row >= map.height || col >= map.width) {
    return null;
  }

  return tablePos + 1 + map.positionAt(row, col, table);
}

function addOverrideCopy(
  tr: Transform,
  copies: OverrideCopy[],
  seenTargets: Set<number>,
  sourceCellPos: number | null,
  targetCellPos: number | null
): void {
  if (
    sourceCellPos === null ||
    targetCellPos === null ||
    sourceCellPos === targetCellPos ||
    seenTargets.has(targetCellPos)
  ) {
    return;
  }

  const sourceCell = tr.doc.nodeAt(sourceCellPos);
  const targetCell = tr.doc.nodeAt(targetCellPos);
  if (!sourceCell || !targetCell) {
    return;
  }

  copies.push({
    source: getCellOverrideSnapshot(sourceCell),
    targetCellPos,
  });
  seenTargets.add(targetCellPos);
}

function collectRowOverrideCopies(
  tr: Transform,
  table: Node,
  tablePos: number,
  map: TableMap,
  rect: RectLike,
  operation: TableStyleOperation
): OverrideCopy[] {
  const targetRow = operation === 'addRowAfter' ? rect.bottom : rect.top;
  const sourceRow = targetRow - 1;
  const copies: OverrideCopy[] = [];
  const seenTargets = new Set<number>();

  if (sourceRow < 0 || targetRow >= map.height) {
    return copies;
  }

  for (let col = 0; col < map.width; col++) {
    addOverrideCopy(
      tr,
      copies,
      seenTargets,
      getCellPos(tablePos, table, map, sourceRow, col),
      getCellPos(tablePos, table, map, targetRow, col)
    );
  }

  return copies;
}

function collectColumnOverrideCopies(
  tr: Transform,
  table: Node,
  tablePos: number,
  map: TableMap,
  rect: RectLike,
  operation: TableStyleOperation
): OverrideCopy[] {
  const targetCol = operation === 'addColumnAfter' ? rect.right : rect.left;
  const sourceCol = targetCol - 1;
  const copies: OverrideCopy[] = [];
  const seenTargets = new Set<number>();

  if (sourceCol < 0 || targetCol >= map.width) {
    return copies;
  }

  for (let row = 0; row < map.height; row++) {
    addOverrideCopy(
      tr,
      copies,
      seenTargets,
      getCellPos(tablePos, table, map, row, sourceCol),
      getCellPos(tablePos, table, map, row, targetCol)
    );
  }

  return copies;
}

function collectOverrideCopies(
  state: EditorState,
  tr: Transform,
  tablePos: number,
  operation?: TableStyleOperation
): OverrideCopy[] {
  if (!operation) {
    return [];
  }

  const rect = getSelectedRect(state, tablePos);
  const table = tr.doc.nodeAt(tablePos);
  if (!rect || table?.type.name !== 'table') {
    return [];
  }

  const map = TableMap.get(table);
  if (operation === 'addRowAfter' || operation === 'addRowBefore') {
    return collectRowOverrideCopies(tr, table, tablePos, map, rect, operation);
  }

  return collectColumnOverrideCopies(tr, table, tablePos, map, rect, operation);
}

function applyParagraphOverrideSnapshot(
  tr: Transform,
  target: { node: Node; pos: number },
  snapshot: ParagraphOverrideSnapshot
): Transform {
  const targetAttrs = {
    ...target.node.attrs,
    ...snapshot.attrs,
  };

  if (snapshot.marks.length && !target.node.content.size) {
    targetAttrs[PENDING_TABLE_MARKS_ATTRIBUTE] = serializeMarks(snapshot.marks);
  }

  if (
    Object.keys(snapshot.attrs).length ||
    targetAttrs[PENDING_TABLE_MARKS_ATTRIBUTE]
  ) {
    tr = tr.setNodeMarkup(target.pos, undefined, {
      ...targetAttrs,
    });
  }

  const paragraph = tr.doc.nodeAt(target.pos);
  if (paragraph?.content.size && snapshot.marks.length) {
    const from = target.pos + 1;
    const to = from + paragraph.content.size;
    for (const mark of snapshot.marks) {
      tr = tr.addMark(from, to, mark);
    }
  }

  return tr;
}

function findPendingMarksParagraph(
  state: EditorState
): { node: Node; pos: number; marks: Mark[] } | null {
  const { selection } = state;
  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (!isStylableNode(node)) {
      continue;
    }

    if (node.content.size) {
      return null;
    }

    const marks = getEffectivePendingMarks(state, node);

    return marks.length
      ? {
        marks,
        node,
        pos: $from.before(depth),
      }
      : null;
  }

  return null;
}

function addStoredPendingMarks(state: EditorState, tr: Transaction): Transaction {
  const pending = findPendingMarksParagraph(state);
  if (!pending || sameMarks(state.storedMarks, pending.marks)) {
    return tr;
  }

  return tr.setStoredMarks(pending.marks);
}

function applyPendingMarksToContent(
  state: EditorState,
  tr: Transaction
): Transaction {
  const updates: Array<{ marks: Mark[]; node: Node; pos: number }> = [];

  tr.doc.descendants((node, pos) => {
    const pendingMarks = node.attrs?.[PENDING_TABLE_MARKS_ATTRIBUTE];
    const marks = getEffectivePendingMarks(state, node);
    if (
      isStylableNode(node) &&
      node.content.size &&
      pendingMarks
    ) {
      updates.push({ marks, node, pos });
    }
    return true;
  });

  for (const update of updates) {
    const from = update.pos + 1;
    const to = from + update.node.content.size;
    for (const mark of update.marks) {
      tr = tr.addMark(from, to, mark);
    }
    tr = tr.setNodeMarkup(update.pos, undefined, {
      ...update.node.attrs,
      [PENDING_TABLE_MARKS_ATTRIBUTE]: null,
    });
  }

  return tr;
}

export function createPendingTableMarksPlugin(): Plugin {
  return new Plugin({
    key: new PluginKey('pendingTableMarksPlugin'),
    appendTransaction(transactions, _oldState, newState) {
      let tr = newState.tr;

      if (transactions.some((transaction) => transaction.docChanged)) {
        tr = applyPendingMarksToContent(newState, tr);
      }

      tr = addStoredPendingMarks(newState, tr);

      return tr.docChanged || tr.storedMarksSet ? tr : null;
    },
  });
}

function applyOverrideCopies(tr: Transform, copies: OverrideCopy[]): Transform {
  for (const copy of copies) {
    const targetCell = tr.doc.nodeAt(copy.targetCellPos);
    if (!targetCell) {
      continue;
    }

    const targetParagraphs = findParagraphsInCell(
      targetCell,
      copy.targetCellPos
    );

    for (
      let index = 0;
      index < targetParagraphs.length && index < copy.source.length;
      index++
    ) {
      tr = applyParagraphOverrideSnapshot(
        tr,
        targetParagraphs[index],
        copy.source[index]
      );
    }
  }

  return tr;
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

  if (table?.type.name !== 'table') {
    return tr;
  }

  tr = tr.setNodeMarkup(tablePos, undefined, {
    ...table.attrs,
    [TABLE_STYLE_NAME_ATTRIBUTE]: normalizedStyleName,
  });

  const tableEnd = tablePos + table.nodeSize;
  const style = getCustomStyleByName(normalizedStyleName);
  const styleMarks = getMarkByStyleName(normalizedStyleName, state.schema);
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
        {
          node: styledNode,
          opt: undefined,
          restoreSelection: false,
          startPos: pos,
        }

      );
      const tableStyleNode = tr.doc.nodeAt(pos);
      if (tableStyleNode && !tableStyleNode.content.size) {
        tr = tr.setNodeMarkup(pos, undefined, {
          ...tableStyleNode.attrs,
          [PENDING_TABLE_MARKS_ATTRIBUTE]: styleMarks.length
            ? serializeMarks(styleMarks)
            : null,
        });
      }
    }
  });

  return tr;
}

/**
 * Reapplies the selected table style after content-changing operations such as
 * paste. Vignettes are excluded because they intentionally support per-cell
 * toolbar styles.
 */
export function applyStoredTableStyleAtSelection(
  state: EditorState,
  tr: Transform
): Transform {
  const table = findTableAtSelection(state);
  const styleName = table?.node.attrs?.[TABLE_STYLE_NAME_ATTRIBUTE];

  if (
    !table ||
    isVignetteTable(table.node) ||
    typeof styleName !== 'string' ||
    !styleName
  ) {
    return tr;
  }

  return applyTableStyle(state, tr, table.pos, styleName);
}

/**
 * Restores the table's selected style after a structural table command creates
 * new cells. Existing cells are deliberately included so a table remains one
 * coherent style after row and column operations.
 */
export function applyStoredTableStyles(
  state: EditorState,
  tr: Transform,
  operation?: TableStyleOperation
): Transform {
  const tables: Array<{
    pos: number;
    styleName: string;
    overrideCopies: OverrideCopy[];
  }> = [];

  tr.doc.descendants((node, pos) => {
    const styleName = node.attrs?.[TABLE_STYLE_NAME_ATTRIBUTE];
    if (
      node.type.name === 'table' &&
      !isVignetteTable(node) &&
      typeof styleName === 'string' &&
      styleName
    ) {
      tables.push({
        pos,
        styleName,
        overrideCopies: collectOverrideCopies(state, tr, pos, operation),
      });
    }
  });

  for (const table of tables) {
    tr = applyTableStyle(state, tr, table.pos, table.styleName);
    tr = applyOverrideCopies(tr, table.overrideCopies);
  }

  return tr;
}
