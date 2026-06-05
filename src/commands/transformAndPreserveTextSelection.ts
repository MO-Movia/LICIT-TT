/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Fragment, Node, Schema } from 'prosemirror-model';
import { TextSelection, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';

import { MARK_TEXT_SELECTION } from './MarkNames';
import { PARAGRAPH, TEXT } from './NodeNames';
import { applyMark } from './applyMark';
import { uuid } from './ui/uuid';

export type SelectionMemo = {
  schema: Schema;
  tr: Transform;
};

// Text used to create temporary selection.
// This assumes that no user could enter such string manually.
const PLACEHOLDER_TEXT = `[\u200b\u2800PLACEHOLDER_TEXT_${uuid()}\u2800\u200b]`;

type SelectionPreparation = {
  fromOffset: number;
  placeholderTextNode: Node | null;
  toOffset: number;
  tr: Transform;
};

function getCollapsedSelectionOffsets(
  currentNode: Node | null,
  prevNode: Node | null,
  nextNode: Node | null
): { fromOffset: number; toOffset: number } | null {
  if (!currentNode && prevNode && prevNode.type.name === TEXT) {
    return { fromOffset: -1, toOffset: 0 };
  }
  if (prevNode && currentNode && currentNode.type === prevNode.type) {
    return { fromOffset: -1, toOffset: 0 };
  }
  if (nextNode && currentNode && currentNode.type === nextNode.type) {
    return { fromOffset: 0, toOffset: 1 };
  }
  if (nextNode) {
    return { fromOffset: 0, toOffset: 1 };
  }
  if (prevNode) {
    return { fromOffset: -1, toOffset: 0 };
  }
  return null;
}

function prepareCollapsedSelection(
  tr: Transform,
  schema: Schema,
  from: number,
  to: number
): SelectionPreparation | null {
  if (from === 0) {
    return null;
  }

  let fromOffset = 0;
  let toOffset = 0;
  let placeholderTextNode: Node | null = null;
  const currentNode = tr.doc.nodeAt(from);
  const prevNode = tr.doc.nodeAt(from - 1);
  const nextNode = tr.doc.nodeAt(from + 1);

  if (!currentNode && prevNode && prevNode.type.name === PARAGRAPH && !prevNode.firstChild) {
    placeholderTextNode = schema.text(PLACEHOLDER_TEXT);
    tr = tr.insert(from, Fragment.from(placeholderTextNode));
    toOffset = 1;
  } else {
    const offsets = getCollapsedSelectionOffsets(currentNode, prevNode, nextNode);
    if (!offsets) {
      return null;
    }
    fromOffset = offsets.fromOffset;
    toOffset = offsets.toOffset;
  }

  tr = (tr as Transaction).setSelection(
    TextSelection.create(tr.doc, from + fromOffset, to + toOffset)
  );

  return {
    fromOffset,
    placeholderTextNode,
    toOffset,
    tr,
  };
}

function findMarkRange(tr: Transform, id: object): { from: number; to: number } {
  let markFrom = 0;
  let markTo = 0;

  tr.doc.descendants((node, pos) => {
    if (node?.marks.find((mark) => mark.attrs.id === id)) {
      markFrom = markFrom === 0 ? pos : markFrom;
      markTo = pos + node.nodeSize;
    }
    return true;
  });

  return {
    from: markFrom,
    to: markTo,
  };
}

function removePlaceholderText(
  tr: Transform,
  placeholderTextNode: Node | null
): Transform {
  if (!placeholderTextNode) {
    return tr;
  }

  tr.doc.descendants((node, pos) => {
    if (node.type.name === TEXT && node.text === PLACEHOLDER_TEXT) {
      tr = tr.delete(pos, pos + PLACEHOLDER_TEXT.length);
      return false;
    }
    return true;
  });

  return tr;
}

// Perform the transform without losing the perceived text selection.
// The way it works is that this will annotate teh current selection with
// temporary marks and restores the selection with those marks after performing
// the transform.
export function transformAndPreserveTextSelection(
  tr: Transform,
  schema: Schema,
  fn: (memo: SelectionMemo) => Transform
): Transform {
  if ((tr as Transaction).getMeta('dryrun')) {
    // There's no need to preserve the selection in dryrun mode.
    return fn({ tr, schema });
  }

  const { selection, doc } = tr as Transaction;
  const markType = schema.marks?.[MARK_TEXT_SELECTION];
  if (!markType || !selection || !doc) {
    return tr;
  }

  const { from, to } = selection;

  let fromOffset = 0;
  let toOffset = 0;
  let placeholderTextNode: Node | null = null;

  if (from === to) {
    const preparedSelection = prepareCollapsedSelection(tr, schema, from, to);
    if (!preparedSelection) {
      return tr;
    }
    ({ fromOffset, placeholderTextNode, toOffset, tr } = preparedSelection);
  }

  const id = {};
  tr = applyMark(tr, schema, markType, { id });
  tr = fn({ tr, schema });

  const markRange = findMarkRange(tr, id);
  const selectionRange = {
    from: Math.max(0, markRange.from - fromOffset),
    to: Math.max(0, markRange.to - toOffset),
  };

  selectionRange.to = Math.max(0, selectionRange.from, selectionRange.to);

  tr = tr.removeMark(markRange.from, markRange.to, markType);
  tr = removePlaceholderText(tr, placeholderTextNode);
  tr = (tr as Transaction).setSelection(
    TextSelection.create(tr.doc, selectionRange.from, selectionRange.to)
  );
  return tr;
}
