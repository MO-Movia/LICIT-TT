/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Fragment, Node } from 'prosemirror-model';
import { Plugin, PluginKey, Transaction } from 'prosemirror-state';

import { consolidateListNodes, LIST_ITEM, PARAGRAPH } from '../../commands';

const LIST_PASTE_NORMALIZER_KEY = new PluginKey('ListPasteNormalizerPlugin');

type Range = {
  from: number;
  to: number;
};

type StepMapInternals = {
  inverted?: boolean;
  ranges: readonly number[];
};

function getChangedRanges(transactions: readonly Transaction[]): Range[] {
  const ranges: Range[] = [];

  for (const transaction of transactions) {
    for (const map of transaction.mapping.maps) {
      ranges.push(...getChangedRangesFromMap(map as unknown as StepMapInternals));
    }
  }

  return ranges;
}

function getChangedRangesFromMap(map: StepMapInternals): Range[] {
  const { inverted = false, ranges: mapRanges } = map;
  const oldIndex = inverted ? 2 : 1;
  const newIndex = inverted ? 1 : 2;
  const ranges: Range[] = [];
  let diff = 0;

  for (let index = 0; index < mapRanges.length; index += 3) {
    const start = mapRanges[index];
    const oldSize = mapRanges[index + oldIndex];
    const newSize = mapRanges[index + newIndex];
    const newStart = start + (inverted ? 0 : diff);
    ranges.push({ from: newStart, to: newStart + newSize });
    diff += newSize - oldSize;
  }

  return ranges;
}

function shouldSplitListItem(node: Node): boolean {
  if (node.type.name !== LIST_ITEM || node.childCount < 2) {
    return false;
  }

  let allChildrenAreParagraphs = true;
  for (const child of getNodeChildren(node)) {
    if (child.type.name !== PARAGRAPH) {
      allChildrenAreParagraphs = false;
    }
  }

  return allChildrenAreParagraphs;
}

function splitListItemsWithMultipleParagraphs(
  tr: Transaction,
  ranges: Range[]
): Transaction {
  const splitPositions = [];
  const positions = new Set<number>();

  for (const { from, to } of ranges) {
    const safeFrom = Math.max(0, from);
    const safeTo = Math.min(tr.doc.content.size, Math.max(from, to));

    tr.doc.nodesBetween(safeFrom, safeTo, (node, pos) => {
      if (shouldSplitListItem(node) && !positions.has(pos)) {
        positions.add(pos);
        splitPositions.push({ node, pos });
        return false;
      }
      return true;
    });
  }

  const orderedSplitPositions = splitPositions.slice();
  orderedSplitPositions.sort((a, b) => b.pos - a.pos);
  for (const { node, pos } of orderedSplitPositions) {
    const listItems = [];

    for (const child of getNodeChildren(node)) {
      if (child.type.name === PARAGRAPH) {
        listItems.push(node.type.create(node.attrs, Fragment.from(child)));
      }
    }

    if (listItems.length > 1) {
      tr = tr.replaceWith(pos, pos + node.nodeSize, Fragment.from(listItems));
    }
  }

  return tr;
}

function getNodeChildren(node: Node): Node[] {
  const children: Node[] = [];
  for (let index = 0; index < node.childCount; index++) {
    children.push(node.child(index));
  }
  return children;
}

export default class ListPasteNormalizerPlugin extends Plugin {
  constructor() {
    super({
      key: LIST_PASTE_NORMALIZER_KEY,
      appendTransaction(transactions, _oldState, newState) {
        const shouldNormalize = transactions.some(
          (transaction) => transaction.docChanged && transaction.getMeta('paste')
        );

        if (!shouldNormalize) {
          return null;
        }

        let tr = newState.tr;
        tr = splitListItemsWithMultipleParagraphs(
          tr,
          getChangedRanges(transactions)
        );
        tr = consolidateListNodes(tr) as Transaction;
        return tr.docChanged ? tr : null;
      },
    });
  }
}
