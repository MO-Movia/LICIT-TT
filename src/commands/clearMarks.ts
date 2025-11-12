import { Mark, MarkType, Node, Schema } from 'prosemirror-model';
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

    slice.content.forEach(node => {
      extractParagraphs(node, paragraphsWithStyle, otherParagraphs);
    });

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
          addOverrideMarksToNode(mark, marksToAdd, pos, node, schema);

        } else if (comapreMarks(style, mark, marksToAdd, pos, node, schema)) {
          if (markTypesToRemove.has(mark.type)) {
            tasks.push({ node, pos, mark });
          }
        }
      });

    }
    return true;
  });


  tasks.forEach((job) => {
    const { mark } = job;
    // [FS] IRAD-1043 2020-10-27
    // Issue fix on when clear the format of a selected word, the entire paragraphs style removed
    tr = tr.removeMark(from, to, mark.type);
  });

  overrideMarkstoRemove.forEach((overridenMarkType) => {
    const { mark } = overridenMarkType;
    tr = tr.removeMark(from, to, mark);

  });
  marksToAdd.forEach((marks) => {
    const { markType, attrs } = marks;
    tr = tr.addMark(from, to, attrs ? markType.create(attrs) : markType.create());

  });
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
    node.content.forEach(child => extractParagraphs(child, normalParagraphs, otherParagraphs));
  }
}
export function comapreMarks(style: Style, mark: Mark, marksToAdd, pos: number, node: Node, schema: Schema): boolean {

  let markType: MarkType = null;
  let attrs = {};

  switch (mark.type.name) {
    case MarkNames.MARK_STRONG:
      if (style?.styles[STRONG] || !mark.attrs.overridden) {
        return false;
      }
      return true;
    case MarkNames.MARK_EM:
      if (style?.styles[EM] || !mark.attrs.overridden) {
        return false;
      }
      return true;
    case MarkNames.MARK_TEXT_COLOR:
      if ((style?.styles[COLOR] && mark.attrs[COLOR] === style?.styles[COLOR]) || !mark.attrs.overridden) {
        return false;
      }
      markType = schema.marks[MarkNames.MARK_TEXT_COLOR];
      attrs = { color: style?.styles[COLOR] ?? '#000000' };
      marksToAdd.push({ node, from: pos, to: pos + node.nodeSize, markType, attrs });
      return true;
    case MarkNames.MARK_FONT_SIZE:
      if ((style?.styles[FONTSIZE] && mark.attrs['pt'] === style?.styles[FONTSIZE]) || !mark.attrs.overridden) {
        return false;
      }
      markType = schema.marks[MarkNames.MARK_FONT_SIZE];
      attrs = { pt: style?.styles[FONTSIZE] };
      marksToAdd.push({ node, from: pos, to: pos + node.nodeSize, markType, attrs });
      return true;
    case MarkNames.MARK_FONT_TYPE:
      if ((style?.styles[FONTNAME] && mark.attrs['name'] === style?.styles[FONTNAME]) || !mark.attrs.overridden) {
        return false;
      }
      markType = schema.marks[MarkNames.MARK_FONT_TYPE];
      attrs = { name: style?.styles[FONTNAME] };
      marksToAdd.push({ node, from: pos, to: pos + node.nodeSize, markType, attrs });
      return true;
    case MarkNames.MARK_STRIKE:
      if (style?.styles[STRIKE] || !mark.attrs.overridden) {
        return false;
      }
      return true;
    case MarkNames.MARK_SUPER:
    case MarkNames.MARK_SUB:
      if (!mark.attrs.overridden) {
        return false;
      }
      return true;
    case MarkNames.MARK_TEXT_HIGHLIGHT:
      if ((style?.styles['textHighlight'] && mark.attrs['highlightColor'] === style?.styles['textHighlight']) || !mark.attrs.overridden) {
        return false;
      }
      markType = schema.marks[MarkNames.MARK_TEXT_HIGHLIGHT];
      attrs = { highlightColor: style?.styles['textHighlight'] ?? '#ffffff' };
      marksToAdd.push({ node, from: pos, to: pos + node.nodeSize, markType, attrs });
      return true;
    case MarkNames.MARK_UNDERLINE:
      if (style?.styles[UNDERLINE] || !mark.attrs.overridden) {
        return false;
      }
      return true;
    default:
      return false;
  }
}

function addOverrideMarksToNode(mark: Mark, marksToAdd, pos: number, node: Node, schema: Schema) {
  for (const key in mark.attrs) {
    if (mark.attrs[key]) {
      const markType = schema.marks[key];
      marksToAdd.push({ node, from: pos, to: pos + node.nodeSize, markType });
    }
  }

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

  tasks.forEach((job) => {
    const { node, pos } = job;
    tr = tr.setNodeMarkup(pos, paragraph, node.attrs, node.marks);
  });
  return tr;
}
