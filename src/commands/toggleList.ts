import {consolidateListNodes} from './consolidateListNodes';
import {compareNumber} from './compareNumber';
import {Fragment, Node, NodeType, Schema} from 'prosemirror-model';
import {TextSelection, Transaction} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {findParentNodeOfType} from 'prosemirror-utils';

import {HEADING, LIST_ITEM, PARAGRAPH} from './NodeNames';
import {isListNode} from './isListNode';
import {transformAndPreserveTextSelection} from './transformAndPreserveTextSelection';

import type {SelectionMemo} from './transformAndPreserveTextSelection';

export function toggleList(
  tr: Transform,
  schema: Schema,
  listNodeType: NodeType,
  listStyleType: string
): Transform {
  const {selection, doc} = tr as Transaction;
  if (!selection || !doc) {
    return tr;
  }
  let {from} = selection;
  let {to} = selection;
  let newselection = selection;

  if (0 === from && 0 != to) {
    let startPos = -1;
    let endPos = -1;

    tr.doc.descendants((_node, pos) => {
      if (-1 === startPos) {
        startPos = pos;
      } else {
        endPos = pos + 1;
      }
    });
    endPos = -1 == endPos ? to : endPos;
    startPos = 0 < to - endPos ? to - endPos : 0;

    from = startPos;
    to = 0 < endPos ? endPos : 0;

    newselection = TextSelection.create(doc, from, to);
    tr = (tr as Transaction).setSelection(newselection);
  }

  const fromSelection = TextSelection.create(doc, from, from);
  const paragraph = schema.nodes[PARAGRAPH];
  const heading = schema.nodes[HEADING];
  const result = findParentNodeOfType(listNodeType)(fromSelection);
  const p = findParentNodeOfType(paragraph)(fromSelection);
  const h = findParentNodeOfType(heading)(fromSelection);

  if (result) {
    tr = unwrapNodesFromList(tr, schema, result.pos);
  } else if ((paragraph && p) || (heading && h)) {
    tr = wrapNodesWithList(
      tr,
      schema,
      listNodeType,
      listStyleType,
      newselection
    );
  }

  return tr;
}

export function unwrapNodesFromList(
  tr: Transform,
  schema: Schema,
  listNodePos: number,
  unwrapParagraphNode?: (Node) => Node
): Transform {
  return transformAndPreserveTextSelection(tr, schema, (memo) => {
    return consolidateListNodes(
      unwrapNodesFromListInternal(
        memo,
        listNodePos,
        unwrapParagraphNode
      ) as Transaction
    );
  });
}

export function wrapNodesWithList(
  tr: Transform,
  schema: Schema,
  listNodeType: NodeType,
  listStyleType: string,
  newselection = null
): Transform {
  return transformAndPreserveTextSelection(tr, schema, (memo) => {
    return consolidateListNodes(
      wrapNodesWithListInternal(
        memo,
        listNodeType,
        listStyleType,
        newselection
      ) as Transaction
    );
  });
}

export function wrapNodesWithListInternal(
  memo: SelectionMemo,
  listNodeType: NodeType,
  listStyleType: string,
  newselection = null
): Transform {
  const {schema} = memo;
  let {tr} = memo;
  const {doc, selection} = tr as Transaction;
  let {from, to} = selection;
  if (!tr || !selection) {
    return tr;
  }
  if (newselection) {
    from = newselection.from;
    to = newselection.to;
  }

  const paragraph = schema.nodes[PARAGRAPH];
  const heading = schema.nodes[HEADING];

  let items = null;
  let lists = [];
  doc.nodesBetween(from, to, (node, pos) => {
    const nodeType = node.type;
    const nodeName = nodeType.name;
    if (isListNode(node)) {
      if (node.type !== listNodeType) {
        const listNodeAttrs = {
          ...node.attrs,
          listNodeType: null,
        };
        tr = tr.setNodeMarkup(pos, listNodeType, listNodeAttrs, node.marks);
      }
      if (items) {
        lists.push(items);
      }
      items = null;
      return false;
    }

    if (/table/.test(nodeName)) {
      if (items) {
        lists.push(items);
      }
      items = null;
      return true;
    }

    if (nodeType === heading || nodeType === paragraph) {
      items = items || [];
      items.push({node, pos});
    } else {
      if (items?.length) {
        lists.push(items);
      }
      items = null;
    }
    return true;
  });
  if (items?.length) {
    lists.push(items);
  }

  lists = lists.filter((items) => items.length > 0);
  if (!lists.length) {
    return tr;
  }

  lists.sort((a, b) => {
    const pa = a[0]?.pos;
    const pb = b[0]?.pos;
    return pa >= pb ? 1 : -1;
  });

  lists.reverse();

  lists.forEach((items) => {
    tr = wrapItemsWithListInternal(
      tr,
      schema,
      listNodeType,
      items,
      listStyleType
    );
  });

  return tr;
}

export function wrapItemsWithListInternal(
  tr: Transform,
  schema: Schema,
  listNodeType: NodeType,
  items: Array<{node: Node; pos: number}>,
  listStyleType: string
): Transform {
  const initialTr = tr;
  const paragraph = schema.nodes[PARAGRAPH];
  const listItem = schema.nodes[LIST_ITEM];

  if (!paragraph || !listItem) {
    return tr;
  }

  const paragraphNodes = [];
  items.forEach((item) => {
    const {node, pos} = item;

    const uniqueID = {};
    const nodeAttrs = {...node.attrs, id: uniqueID};

    tr = tr.setNodeMarkup(pos, paragraph, nodeAttrs, node.marks);
    paragraphNodes.push(tr.doc.nodeAt(pos));
  });

  const firstNode = paragraphNodes[0];
  const lastNode = paragraphNodes[paragraphNodes.length - 1];
  if (!firstNode || !lastNode) {
    return initialTr;
  }

  const firstNodeID = firstNode.attrs?.id;
  const lastNodeID = lastNode.attrs?.id;
  if (!firstNodeID || !lastNodeID) {
    return initialTr;
  }

  let fromPos = null;
  let toPos = null;
  tr.doc.descendants((node, pos) => {
    const nodeID = node.attrs.id;
    if (nodeID === firstNodeID) {
      fromPos = pos;
    }
    if (nodeID === lastNodeID) {
      toPos = pos + node.nodeSize;
    }
    return fromPos === null || toPos === null;
  });

  if (fromPos === null || toPos === null) {
    return initialTr;
  }

  const listItemNodes = [];
  items.forEach((item) => {
    const {node} = item;
    const paragraphNode = paragraph.create(
      node.attrs,
      node.content,
      node.marks
    );
    const listItemNode = listItem.create(
      node.attrs,
      Fragment.from(paragraphNode)
    );
    listItemNodes.push(listItemNode);
  });

  const listNodeAttrs = {indent: 0, start: 1, type: listStyleType};

  const $fromPos = tr.doc.resolve(fromPos);
  const $toPos = tr.doc.resolve(toPos);

  const hasSameListNodeBefore =
    $fromPos.nodeBefore &&
    $fromPos.nodeBefore.type === listNodeType &&
    $fromPos.nodeBefore.attrs.indent === 0;

  const hasSameListNodeAfter =
    $toPos.nodeAfter &&
    $toPos.nodeAfter.type === listNodeType &&
    $toPos.nodeAfter.attrs.indent === 0;

  if (hasSameListNodeBefore) {
    tr = tr.delete(fromPos, toPos);
    tr = tr.insert(fromPos - 1, Fragment.from(listItemNodes));
    if (hasSameListNodeAfter) {
      tr = tr.delete(toPos + 1, toPos + 3);
    }
  } else if (hasSameListNodeAfter) {
    tr = tr.delete(fromPos, toPos);
    tr = tr.insert(fromPos + 1, Fragment.from(listItemNodes));
  } else {
    const listNode = listNodeType.create(
      listNodeAttrs,
      Fragment.from(listItemNodes)
    );
    tr = tr.delete(fromPos, toPos);
    tr = tr.insert(fromPos, Fragment.from(listNode));
  }

  return tr;
}

function unwrapNodesFromSelection(
  tr: Transform,
  listNodePos: number,
  nodes: {[x: string]: NodeType},
  from: number,
  to: number,
  unwrapParagraphNode?: (Node) => Node
): Transform {
  const contentBlocksBefore = [];
  const contentBlocksSelected = [];
  const contentBlocksAfter = [];
  const paragraph = nodes[PARAGRAPH];
  const listItem = nodes[LIST_ITEM];
  const listNode = tr.doc.nodeAt(listNodePos);

  tr.doc.nodesBetween(
    listNodePos,
    listNodePos + listNode.nodeSize,
    (node, pos, parentNode, index) => {
      if (node.type !== paragraph) {
        return true;
      }
      const block = {
        node,
        pos,
        parentNode,
        index,
      };

      if (pos + node.nodeSize <= from) {
        contentBlocksBefore.push(block);
      } else if (pos > to) {
        contentBlocksAfter.push(block);
      } else {
        contentBlocksSelected.push(block);
      }
      return false;
    }
  );

  if (!contentBlocksSelected.length) {
    return tr;
  }

  tr = tr.delete(listNodePos, listNodePos + listNode.nodeSize);

  const listNodeType = listNode.type;
  const attrs = {indent: listNode.attrs.indent, start: 1};

  if (contentBlocksAfter.length) {
    const nodes = contentBlocksAfter.map((block) => {
      return listItem.create({}, Fragment.from(block.node));
    });
    const frag = Fragment.from(
      listNodeType.create(attrs, Fragment.from(nodes))
    );
    tr = tr.insert(listNodePos, frag);
  }

  if (contentBlocksSelected.length) {
    const nodes = contentBlocksSelected.map((block) => {
      if (unwrapParagraphNode) {
        return unwrapParagraphNode(block.node);
      } else {
        return block.node;
      }
    });
    const frag = Fragment.from(nodes);
    tr = tr.insert(listNodePos, frag);
  }

  if (contentBlocksBefore.length) {
    const nodes = contentBlocksBefore.map((block) => {
      return listItem.create({}, Fragment.from(block.node));
    });
    const frag = Fragment.from(
      listNodeType.create(attrs, Fragment.from(nodes))
    );
    tr = tr.insert(listNodePos, frag);
  }

  return tr;
}

export function unwrapNodesFromListInternal(
  memo: SelectionMemo,
  listNodePos: number,
  unwrapParagraphNode?: (Node) => Node
): Transform {
  const {schema} = memo;
  let {tr} = memo;

  if (!tr.doc || !(tr as Transaction).selection) {
    return tr;
  }

  const {nodes} = schema;
  const paragraph = nodes[PARAGRAPH];
  const listItem = nodes[LIST_ITEM];

  if (!listItem || !paragraph) {
    return tr;
  }

  const listNode = tr.doc.nodeAt(listNodePos);
  if (!isListNode(listNode)) {
    return tr;
  }

  const initialSelection = (tr as Transaction).selection;
  const {from, to} = initialSelection;

  const listNodePoses = [];

  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (isListNode(node)) {
      listNodePoses.push(pos);
    }
  });

  if (from === to && from < 1) {
    return tr;
  }

  [...listNodePoses]
    .sort(compareNumber)
    .reverse()
    .forEach((pos) => {
      tr = unwrapNodesFromSelection(
        tr,
        pos,
        nodes,
        from,
        to,
        unwrapParagraphNode
      );
    });

  return tr;
}
