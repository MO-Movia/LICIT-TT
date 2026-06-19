/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Mark, Node, Schema } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';
import { HEADING, PARAGRAPH } from './NodeNames';
import * as MarkNames from './MarkNames';
import { TextSelection, Transaction } from 'prosemirror-state';
import { getStyleByName, Style } from './runtime.service';
import { getSelectionRange } from './isNodeSelectionForNodeType';
const STRONG = 'strong';
const EM = 'em';
const COLOR = 'color';
const FONTSIZE = 'fontSize';
const FONTNAME = 'fontName';
const STRIKE = 'strike';
const UNDERLINE = 'underline';

const {
  MARK_EM,
  MARK_FONT_SIZE,
  MARK_FONT_TYPE,
  MARK_STRIKE,
  MARK_STRONG,
  MARK_TEXT_COLOR,
  MARK_TEXT_HIGHLIGHT,
  MARK_UNDERLINE,
  MARK_SUB,
  MARK_SUPER,
} = MarkNames;

const FORMAT_MARK_NAMES = [
  MARK_EM,
  MARK_FONT_SIZE,
  MARK_FONT_TYPE,
  MARK_STRIKE,
  MARK_STRONG,
  MARK_TEXT_COLOR,
  MARK_TEXT_HIGHLIGHT,
  MARK_UNDERLINE,
  MARK_SUB,
  MARK_SUPER,
];

type StyleObject = Record<string, unknown>;

export function clearMarks(tr: Transform, schema: Schema): Transform {
  const { doc, selection } = tr as Transaction;
  if (!selection || !doc) {
    return tr;
  }
  const { empty } = selection;
  const { from, to } = getSelectionRange(selection);
  if (empty) {
    return tr;
  }

  const markTypesToRemove = new Set(
    FORMAT_MARK_NAMES.map((n) => schema.marks[n]).filter(Boolean)
  );

  if (!markTypesToRemove.size) {
    return tr;
  }

  const tasks: {
    node: Node;
    pos: number;
    mark: Mark;
  }[] = [];
  const marksToAdd = [];
  const overrideMarkstoRemove = [];
  let style: Style = null;
  const paragraphsWithStyle: Node[] = [];
  const otherParagraphs: Node[] = [];
  const slice = selection instanceof TextSelection ? selection.content().content : null;
  if (slice?.childCount > 1) {

    for (const node of slice.content) {
      extractParagraphs(node, paragraphsWithStyle, otherParagraphs);
    };

    if (otherParagraphs.length > 0) {
      return tr;
    }
  }
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'paragraph' && node.attrs.styleName) {
      style = getStyleByName(node.attrs.styleName);

    }
    if (node?.marks.length) {
      node.marks.some((mark) => {
        if (mark?.type?.name === MarkNames.MARK_OVERRIDE) {
          overrideMarkstoRemove.push({ node, from: pos, to: pos + node.nodeSize, mark });

        } else if (comapreMarks(style, mark, marksToAdd, pos, node, schema)) {
          if (markTypesToRemove.has(mark.type)) {
            tasks.push({ node, pos, mark });
          }
        }
      });
      const styleMarks = getMissingMarks_Styles(style?.styles, node.marks);
      AddMissingMarks_Styles(styleMarks, marksToAdd, pos, node, schema);

    }
    return true;
  });


  for (const job of tasks) {
    const { mark } = job;
    // [FS] IRAD-1043 2020-10-27
    // Issue fix on when clear the format of a selected word, the entire paragraphs style removed
    tr = tr.removeMark(from, to, mark.type);
  };

  for (const overridenMarkType of overrideMarkstoRemove) {
    const { mark } = overridenMarkType;
    tr = tr.removeMark(from, to, mark);

  };
  for (const marks of marksToAdd) {
    const { markType, attrs } = marks;
    tr = tr.addMark(from, to, attrs ? markType.create(attrs) : markType.create());

  };

  // Reset indent and align attributes for nodes inside the selection when clearing formats.
  const nodesToReset: { node: Node; pos: number }[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (node?.attrs) {
      const indentVal = node.attrs.indent;
      const overriddenIndent = !!node.attrs.overriddenIndent;
      const overriddenIndentVal = node.attrs.overriddenIndentValue;

      const alignVal = node.attrs.align;
      const overriddenAlign = node.attrs.overriddenAlign;
      const overriddenAlignVal = node.attrs.overriddenAlignValue;

      const needsIndentReset = (indentVal !== undefined && String(indentVal) !== '0') || overriddenIndent || (overriddenIndentVal !== undefined && overriddenIndentVal !== null);
      const needsAlignReset = (alignVal !== undefined && String(alignVal) !== 'left') || (overriddenAlign !== undefined && overriddenAlign !== null) || (overriddenAlignVal !== undefined && overriddenAlignVal !== null);

      if (needsIndentReset || needsAlignReset) {
        nodesToReset.push({ node, pos });
      }
    }
    return true;

  });

  for (const { node, pos } of nodesToReset) {
    style = getStyleByName(node.attrs.styleName);

    const newAttrs = {
      ...node.attrs,
      // indent defaults
      indent: style?.styles['indent'],
      overriddenIndent: false,
      overriddenIndentValue: null,
      // align defaults
      align: style?.styles['align'],
      overriddenAlign: null,
      overriddenAlignValue: null,
    };
    tr = tr.setNodeMarkup(pos, node.type, newAttrs, node.marks);
  }

  return tr;
}

/**
 * Recursively extracts paragraphs with styleName='Normal' from a given node.
 */
export function extractParagraphs(node: Node, normalParagraphs: Node[], otherParagraphs: Node[]) {
  if (node.type.name === 'paragraph') {
    if (node.attrs.styleName === 'Normal' || node.attrs.styleName === null) {
      normalParagraphs.push(node);
    } else {
      otherParagraphs.push(node);
    }
  } else if (node.content) {
    for (let i = 0; i < node.content.childCount; i++) {
      const child = node.content.child(i);
      extractParagraphs(child, normalParagraphs, otherParagraphs);
    }
  }
}

function shouldClearBooleanMark(
  style: Style,
  styleKey: string,
  mark: Mark
): boolean {
  return !style?.styles[styleKey] && Boolean(mark.attrs.overridden);
}

function addReplacementMark(
  schema: Schema,
  marksToAdd,
  node: Node,
  pos: number,
  markName: string,
  attrs: Record<string, unknown>
): boolean {
  const markType = schema.marks[markName];
  marksToAdd.push({ node, from: pos, to: pos + node.nodeSize, markType, attrs });
  return true;
}

function restoreStyledMark(
  style: Style,
  mark: Mark,
  marksToAdd,
  pos: number,
  node: Node,
  schema: Schema,
  config: {
    attrKey: string;
    defaultValue: string | undefined;
    markName: string;
    styleKey: string;
  }
): boolean {
  const styleValue = style?.styles[config.styleKey];
  if ((styleValue && mark.attrs[config.attrKey] === styleValue) || !mark.attrs.overridden) {
    return false;
  }

  return addReplacementMark(
    schema,
    marksToAdd,
    node,
    pos,
    config.markName,
    { [config.attrKey]: styleValue ?? config.defaultValue }
  );
}

export function comapreMarks(style: Style, mark: Mark, marksToAdd, pos: number, node: Node, schema: Schema): boolean {
  switch (mark.type.name) {
    case MarkNames.MARK_STRONG:
      return shouldClearBooleanMark(style, STRONG, mark);
    case MarkNames.MARK_EM:
      return shouldClearBooleanMark(style, EM, mark);
    case MarkNames.MARK_TEXT_COLOR:
      return restoreStyledMark(style, mark, marksToAdd, pos, node, schema, {
        attrKey: COLOR,
        defaultValue: '#000000',
        markName: MarkNames.MARK_TEXT_COLOR,
        styleKey: COLOR,
      });
    case MarkNames.MARK_FONT_SIZE:
      return restoreStyledMark(style, mark, marksToAdd, pos, node, schema, {
        attrKey: 'pt',
        defaultValue: undefined,
        markName: MarkNames.MARK_FONT_SIZE,
        styleKey: FONTSIZE,
      });
    case MarkNames.MARK_FONT_TYPE:
      return restoreStyledMark(style, mark, marksToAdd, pos, node, schema, {
        attrKey: 'name',
        defaultValue: undefined,
        markName: MarkNames.MARK_FONT_TYPE,
        styleKey: FONTNAME,
      });
    case MarkNames.MARK_STRIKE:
      return shouldClearBooleanMark(style, STRIKE, mark);
    case MarkNames.MARK_SUPER:
    case MarkNames.MARK_SUB:
      return Boolean(mark.attrs.overridden);
    case MarkNames.MARK_TEXT_HIGHLIGHT:
      return restoreStyledMark(style, mark, marksToAdd, pos, node, schema, {
        attrKey: 'highlightColor',
        defaultValue: '#ffffff',
        markName: MarkNames.MARK_TEXT_HIGHLIGHT,
        styleKey: 'textHighlight',
      });
    case MarkNames.MARK_UNDERLINE:
      return shouldClearBooleanMark(style, UNDERLINE, mark);
    default:
      return false;
  }
}

function getMissingMarks_Styles(
  styleObj: StyleObject,
  marks: readonly Mark[]
): string[] {
  if (styleObj) {
    const availableTypes = new Set(marks.map(m => m.type.name));

    return Object.entries(styleObj)
      .filter(
        ([key, value]) =>
          typeof value === 'boolean' &&
          !availableTypes.has(key)
      )
      .map(([key]) => key);
  }
  return [];
}

function AddMissingMarks_Styles(styleMarks: string[], marksToAdd, pos: number, node: Node, schema: Schema) {

  for (const styleKey of styleMarks ?? []) {
    const markType = schema.marks[styleKey];
    if (!markType) return;

    switch (markType.name) {
      case MarkNames.MARK_STRONG:
      case MarkNames.MARK_EM:
      case MarkNames.MARK_UNDERLINE:
      case MarkNames.MARK_STRIKE:
        marksToAdd.push({
          node,
          from: pos,
          to: pos + node.nodeSize,
          markType: markType,
          attrs: {}
        });
        break;
      default:
        break;
    }
  };

}

// [FS] IRAD-948 2020-05-22
// Clear Header formatting
export function clearHeading(tr: Transform, schema: Schema): Transform {
  const { doc, selection } = tr as Transaction;

  if (!selection || !doc) {
    return tr;
  }
  const { from, to, empty } = selection;
  if (empty) {
    return tr;
  }
  const { nodes } = schema;

  const heading = nodes[HEADING];
  const paragraph = nodes[PARAGRAPH];

  const tasks: {
    node: Node;
    pos: number;
  }[] = [];

  doc.nodesBetween(from, to, (node, pos) => {
    if (heading === node.type) {
      tasks.push({ node, pos });
    }
    return true;
  });

  if (!tasks.length) {
    return tr;
  }

  for (const job of tasks) {
    const { node, pos } = job;
    tr = tr.setNodeMarkup(pos, paragraph, node.attrs, node.marks);
  };
  return tr;
}
