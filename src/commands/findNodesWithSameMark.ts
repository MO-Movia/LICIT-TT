import {Mark, MarkType, Node} from 'prosemirror-model';

interface Result {
  mark: Mark;
  from: {
    node: Node | null;
    pos: number;
  };
  to: {
    node: Node | null;
    pos: number;
  };
}

function findFirstMark(
  doc: Node,
  from: number,
  to: number,
  markType: MarkType
) {
  let firstMark = null;
  let fromNode = null;
  let toNode = null;

  for (let ii = from; ii <= to; ii++) {
    const node = doc.nodeAt(ii);
    if (!node?.marks) {
      return null;
    }
    const mark = node.marks.find((mark) => mark.type === markType);
    if (!mark || (firstMark && mark !== firstMark)) {
      return null;
    }
    if (!firstMark) {
      firstMark = mark;
      fromNode = node;
    }
    toNode = node;
  }

  return {firstMark, fromNode, toNode};
}

function extendMarkRange(
  doc: Node,
  from: number,
  to: number,
  markType: MarkType,
  firstMark: Mark
) {
  let fromPos = from;
  let toPos = to;
  let node = null;

  for (let ii = from - 1; ii >= 0; ii--) {
    node = doc.nodeAt(ii);
    if (
      !node?.marks.find((mark) => mark.type === markType && mark === firstMark)
    ) {
      break;
    }
    fromPos = ii;
  }

  for (let ii = to + 1, jj = doc.nodeSize - 2; ii <= jj; ii++) {
    node = doc.nodeAt(ii);
    if (
      !node?.marks.find((mark) => mark.type === markType && mark === firstMark)
    ) {
      break;
    }
    toPos = ii;
  }

  return {fromPos, toPos};
}

export function findNodesWithSameMark(
  doc: Node,
  from: number,
  to: number,
  markType: MarkType
): Result | null {
  const firstMarkResult = findFirstMark(doc, from, to, markType);
  if (!firstMarkResult) {
    return null;
  }

  const {firstMark, fromNode, toNode} = firstMarkResult;
  const {fromPos, toPos} = extendMarkRange(doc, from, to, markType, firstMark);

  return {
    mark: firstMark,
    from: {
      node: fromNode,
      pos: fromPos,
    },
    to: {
      node: toNode,
      pos: toPos,
    },
  };
}
