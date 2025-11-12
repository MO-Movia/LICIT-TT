import { clamp } from './ui/clamp';
import { compareNumber } from './compareNumber';
import { consolidateListNodes } from './consolidateListNodes';
import { isListNode } from './isListNode';
import { transformAndPreserveTextSelection } from './transformAndPreserveTextSelection';

import { EditorState, Transaction } from 'prosemirror-state';
import { BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH } from './NodeNames';
import { Fragment, Schema } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import { getSelectionRange, isColumnCellSelected, getSelectedCellPositions, findParagraphsInNode } from './isNodeSelectionForNodeType';

const MIN_INDENT_LEVEL = 0;
const MAX_INDENT_LEVEL = 7;

type UpdateIntendType = {
  tr: Transform;
  docChanged: boolean;
};

export function updateIndentLevel(
  state: EditorState,
  tr: Transform,
  schema: Schema,
  delta: number,
  view: EditorView
): UpdateIntendType {
  const { doc, selection } = tr as Transaction;
  if (!doc || !selection) {
    return { tr, docChanged: false };
  }

  const { nodes } = schema;
  const listNodePoses = [];
  const blockquote = nodes[BLOCKQUOTE];
  const heading = nodes[HEADING];
  const paragraph = nodes[PARAGRAPH];
  const allowedNodeTypes = new Set([blockquote, heading, paragraph]);
  if (isColumnCellSelected(selection)) {
    const positions = getSelectedCellPositions(selection);
    if (positions.length > 0) {
      positions.forEach(pos => {
        const node = tr.doc.nodeAt(pos);
        if (!node) return;
        findParagraphsInNode(node, pos, (paraNode, paraPos) => {
          if (allowedNodeTypes.has(paraNode.type)) {
            tr = setNodeIndentMarkup(state, tr, paraPos, delta, view).tr;
          } else if (isListNode(paraNode)) {
            // List is tricky, we'll handle it later.
            listNodePoses.push(paraPos);
          }
        });
      });
    }
  }
  else {
    const { from, to } = getSelectionRange(selection);
    doc.nodesBetween(from, to, (node, pos) => {
      const nodeType = node.type;
      if (allowedNodeTypes.has(nodeType)) {
        tr = setNodeIndentMarkup(state, tr, pos, delta, view).tr;
        return false;
      } else if (isListNode(node)) {
        // List is tricky, we'll handle it later.
        listNodePoses.push(pos);
        return false;
      }
      return true;
    });
  }


  if (!listNodePoses.length) {
    return { tr, docChanged: true };
  }

  tr = transformAndPreserveTextSelection(tr, schema, (memo) => {
    const { schema } = memo;
    let tr2 = memo.tr;
    [...listNodePoses]
      .sort(compareNumber)
      .reverse()
      .forEach((pos) => {
        tr2 = setListNodeIndent(state, tr2, schema, pos, delta);
      });
    tr2 = consolidateListNodes(tr2 as Transaction);
    return tr2;
  });

  return { tr, docChanged: true };
}

export function setListNodeIndent(
  state: EditorState,
  tr: Transform,
  schema: Schema,
  pos: number,
  delta: number
): Transform {
  const listItem = schema.nodes[LIST_ITEM];
  const listNode = tr?.doc?.nodeAt(pos);
  if (!listItem || !listNode) {
    return tr;
  }

  const indentNew = String(clamp(
    MIN_INDENT_LEVEL,
    Number(listNode.attrs.indent) + delta,
    MAX_INDENT_LEVEL)
  );
  if (indentNew === listNode.attrs.indent) {
    return tr;
  }

  const { from, to } = (tr as Transaction).selection;

  // [FS] IRAD-947 2020-05-19
  // Fix for Multi-level lists lose multi-levels when indenting/de-indenting
  // Earlier they checked the to postion value to >= pos + listNode.nodeSize
  // It wont satisfy the list hve childrens

  if (from <= pos && to >= pos) {
    return setNodeIndentMarkup(state, tr, pos, delta).tr;
  }

  const listNodeType = listNode.type;

  // listNode is partially selected.
  const itemsBefore = [];
  const itemsSelected = [];
  const itemsAfter = [];

  tr.doc.nodesBetween(pos, pos + listNode.nodeSize, (itemNode, itemPos) => {
    if (itemNode.type === listNodeType || itemNode.type !== listItem) {
      return true;
    }

    const listItemNode = listItem.create(
      itemNode.attrs,
      itemNode.content,
      itemNode.marks
    );
    if (itemPos + itemNode.nodeSize <= from) {
      itemsBefore.push(listItemNode);
    } else if (itemPos > to) {
      itemsAfter.push(listItemNode);
    } else {
      itemsSelected.push(listItemNode);
    }
    return false;
  });

  tr = tr.delete(pos, pos + listNode.nodeSize);
  if (itemsAfter.length) {
    const listNodeNew = listNodeType.create(
      listNode.attrs,
      Fragment.from(itemsAfter)
    );
    tr = tr.insert(pos, Fragment.from(listNodeNew));
  }

  if (itemsSelected.length) {
    const listNodeAttrs = {
      ...listNode.attrs,
      indent: indentNew,
    };
    const listNodeNew = listNodeType.create(
      listNodeAttrs,
      Fragment.from(itemsSelected)
    );
    tr = tr.insert(pos, Fragment.from(listNodeNew));
  }

  if (itemsBefore.length) {
    const listNodeNew = listNodeType.create(
      listNode.attrs,
      Fragment.from(itemsBefore)
    );
    tr = tr.insert(pos, Fragment.from(listNodeNew));
  }

  return tr;
}

export function setNodeIndentMarkup(
  _state: EditorState,
  tr: Transform,
  pos: number,
  delta: number,
  _view?: EditorView
): UpdateIntendType {
  const retVal = true;
  if (!tr.doc) {
    return { tr, docChanged: false };
  }
  const node = tr.doc.nodeAt(pos);
  if (!node) {
    return { tr, docChanged: retVal };
  }
  const indent = String(clamp(
    MIN_INDENT_LEVEL,
    Number(node.attrs.indent || 0) + delta,
    MAX_INDENT_LEVEL)
  );

  if (indent === node.attrs.indent) {
    return { tr, docChanged: false };
  }
  const nodeAttrs = {
    ...node.attrs,
    indent,
    overriddenIndent: indent != node.attrs.indent,
    overriddenIndentValue: (indent != node.attrs.indent) ? indent : null
  };
  tr = tr.setNodeMarkup(pos, node.type, nodeAttrs, node.marks);
  return { tr, docChanged: true };
}
