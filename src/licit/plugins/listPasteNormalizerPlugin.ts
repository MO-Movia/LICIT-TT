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

function getChangedRanges(transactions: readonly Transaction[]): Range[] {
  const ranges: Range[] = [];

  transactions.forEach((transaction) => {
    transaction.mapping.maps.forEach((map) => {
      map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
        ranges.push({ from: newStart, to: newEnd });
      });
    });
  });

  return ranges;
}

function shouldSplitListItem(node: Node): boolean {
  if (node.type.name !== LIST_ITEM || node.childCount < 2) {
    return false;
  }

  let allChildrenAreParagraphs = true;
  node.forEach((child) => {
    if (child.type.name !== PARAGRAPH) {
      allChildrenAreParagraphs = false;
    }
  });

  return allChildrenAreParagraphs;
}

function splitListItemsWithMultipleParagraphs(
  tr: Transaction,
  ranges: Range[]
): Transaction {
  const splitPositions = [];
  const positions = new Set<number>();

  ranges.forEach(({ from, to }) => {
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
  });

  splitPositions
    .sort((a, b) => b.pos - a.pos)
    .forEach(({ node, pos }) => {
      const listItems = [];

      node.forEach((child) => {
        if (child.type.name === PARAGRAPH) {
          listItems.push(node.type.create(node.attrs, Fragment.from(child)));
        }
      });

      if (listItems.length > 1) {
        tr = tr.replaceWith(pos, pos + node.nodeSize, Fragment.from(listItems));
      }
    });

  return tr;
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
