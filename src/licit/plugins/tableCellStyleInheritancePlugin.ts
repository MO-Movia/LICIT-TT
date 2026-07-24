/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {MarkType, Node as ProseMirrorNode, Schema} from 'prosemirror-model';
import {Plugin, PluginKey, Transaction} from 'prosemirror-state';
import {
  MARK_EM,
  MARK_FONT_SIZE,
  MARK_FONT_TYPE,
  MARK_LETTER_SPACING,
  MARK_STRONG,
  MARK_TEXT_COLOR,
  MARK_UNDERLINE,
} from '../../commands/MarkNames';

type CellStyleAttrs = Record<string, unknown>;

const TABLE_CELL_STYLE_INHERITANCE_META = 'tableCellStyleInheritance';
const TABLE_CELL_STYLE_INHERITANCE_KEY = new PluginKey(
  'tableCellStyleInheritance'
);

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length
    ? value.trim()
    : null;
}

function normalizeLineSpacing(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized || normalized.toLowerCase() === 'normal') {
    return null;
  }

  return normalized;
}

function normalizeFontPointSize(value: unknown): number | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized.replace(/px|pt/i, ''));
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function isTableCell(node: ProseMirrorNode): boolean {
  return (
    node.type.spec.tableRole === 'cell' ||
    node.type.spec.tableRole === 'header_cell' ||
    node.type.name === 'table_cell' ||
    node.type.name === 'table_header'
  );
}

function hasTruthyCellAttr(cellAttrs: CellStyleAttrs, attrName: string): boolean {
  return cellAttrs[attrName] === true || cellAttrs[attrName] === 'true';
}

function ensureParagraphAttrs(
  tr: Transaction,
  node: ProseMirrorNode,
  pos: number,
  cellAttrs: CellStyleAttrs
): Transaction {
  if (node.type.name !== 'paragraph') {
    return tr;
  }

  const attrs = {...node.attrs};
  let changed = false;
  const textAlign = hasTruthyCellAttr(cellAttrs, 'textAlignOverridden')
    ? normalizeString(cellAttrs.textAlign)
    : null;
  const lineSpacing = hasTruthyCellAttr(cellAttrs, 'lineHeightOverridden')
    ? normalizeLineSpacing(cellAttrs.lineHeight)
    : null;

  if (
    textAlign &&
    Object.hasOwn(attrs, 'align') &&
    (
      attrs.align !== textAlign ||
      attrs.overriddenAlign !== true ||
      attrs.overriddenAlignValue !== textAlign
    )
  ) {
    attrs.align = textAlign;
    attrs.overriddenAlign = true;
    attrs.overriddenAlignValue = textAlign;
    changed = true;
  }

  if (
    lineSpacing &&
    Object.hasOwn(attrs, 'lineSpacing') &&
    (
      attrs.lineSpacing !== lineSpacing ||
      attrs.overriddenLineSpacing !== true ||
      attrs.overriddenLineSpacingValue !== lineSpacing
    )
  ) {
    attrs.lineSpacing = lineSpacing;
    attrs.overriddenLineSpacing = true;
    attrs.overriddenLineSpacingValue = lineSpacing;
    changed = true;
  }

  return changed ? tr.setNodeMarkup(pos, undefined, attrs) : tr;
}

function markAttrsMatch(
  node: ProseMirrorNode,
  markType: MarkType,
  attrs: Record<string, unknown>
): boolean {
  const existing = markType.isInSet(node.marks);
  return Boolean(
    existing &&
    Object.entries(attrs).every(([key, value]) => existing.attrs[key] === value)
  );
}

function ensureMark(
  tr: Transaction,
  node: ProseMirrorNode,
  from: number,
  markType: MarkType | undefined,
  attrs: Record<string, unknown> | null
): Transaction {
  if (!markType || !attrs) {
    return tr;
  }

  const to = from + node.nodeSize;
  if (markAttrsMatch(node, markType, attrs)) {
    return tr;
  }

  return tr.removeMark(from, to, markType).addMark(
    from,
    to,
    markType.create(attrs)
  );
}

function ensureTextMarks(
  tr: Transaction,
  node: ProseMirrorNode,
  pos: number,
  schema: Schema,
  cellAttrs: CellStyleAttrs
): Transaction {
  if (!node.isText) {
    return tr;
  }

  const fontName = hasTruthyCellAttr(cellAttrs, 'fontNameOverridden')
    ? normalizeString(cellAttrs.fontName)
    : null;
  const fontSize = hasTruthyCellAttr(cellAttrs, 'fontSizeOverridden')
    ? normalizeFontPointSize(cellAttrs.fontSize)
    : null;
  const textColor = hasTruthyCellAttr(cellAttrs, 'textColorOverridden')
    ? normalizeString(cellAttrs.textColor)
    : null;
  const letterSpacing = hasTruthyCellAttr(cellAttrs, 'letterSpacingOverridden')
    ? normalizeString(cellAttrs.letterSpacing)
    : null;
  const bold = hasTruthyCellAttr(cellAttrs, 'fontWeightOverridden')
    ? normalizeString(cellAttrs.fontWeight) === 'bold'
    : false;
  const italic = hasTruthyCellAttr(cellAttrs, 'fontStyleOverridden')
    ? normalizeString(cellAttrs.fontStyle) === 'italic'
    : false;
  const underline = hasTruthyCellAttr(cellAttrs, 'textDecorationOverridden')
    ? normalizeString(cellAttrs.textDecoration) === 'underline'
    : false;

  tr = ensureMark(
    tr,
    node,
    pos,
    schema.marks[MARK_FONT_TYPE],
    fontName ? {name: fontName, overridden: true} : null
  );
  tr = ensureMark(
    tr,
    node,
    pos,
    schema.marks[MARK_FONT_SIZE],
    fontSize ? {pt: fontSize, overridden: true} : null
  );
  tr = ensureMark(
    tr,
    node,
    pos,
    schema.marks[MARK_TEXT_COLOR],
    textColor ? {color: textColor, overridden: true} : null
  );
  tr = ensureMark(
    tr,
    node,
    pos,
    schema.marks[MARK_LETTER_SPACING],
    letterSpacing ? {letterSpacing, overridden: true} : null
  );
  tr = ensureMark(
    tr,
    node,
    pos,
    schema.marks[MARK_STRONG],
    bold ? {overridden: true} : null
  );
  tr = ensureMark(
    tr,
    node,
    pos,
    schema.marks[MARK_EM],
    italic ? {overridden: true} : null
  );
  return ensureMark(
    tr,
    node,
    pos,
    schema.marks[MARK_UNDERLINE],
    underline ? {overridden: true} : null
  );
}

function applyCellInheritance(
  tr: Transaction,
  node: ProseMirrorNode,
  pos: number,
  schema: Schema,
  cellAttrs: CellStyleAttrs | null
): Transaction {
  const activeCellAttrs = isTableCell(node) ? node.attrs : cellAttrs;

  if (activeCellAttrs) {
    tr = ensureParagraphAttrs(tr, node, pos, activeCellAttrs);
    tr = ensureTextMarks(tr, node, pos, schema, activeCellAttrs);
  }

  node.forEach((child, offset) => {
    tr = applyCellInheritance(
      tr,
      child,
      pos + offset + 1,
      schema,
      activeCellAttrs
    );
  });

  return tr;
}

export default class TableCellStyleInheritancePlugin extends Plugin {
  constructor() {
    super({
      key: TABLE_CELL_STYLE_INHERITANCE_KEY,
      appendTransaction: (transactions, _oldState, newState) => {
        if (
          !transactions.some((tr) => tr.docChanged) ||
          transactions.some((tr) => tr.getMeta(TABLE_CELL_STYLE_INHERITANCE_META))
        ) {
          return null;
        }

        const tr = applyCellInheritance(
          newState.tr,
          newState.doc,
          -1,
          newState.schema,
          null
        );

        if (!tr.docChanged) {
          return null;
        }

        tr.setMeta(TABLE_CELL_STYLE_INHERITANCE_META, true);
        return tr;
      },
    });
  }
}

export {
  TABLE_CELL_STYLE_INHERITANCE_KEY,
  TABLE_CELL_STYLE_INHERITANCE_META,
};
