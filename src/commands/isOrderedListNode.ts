/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node} from 'prosemirror-model';

import {ORDERED_LIST} from './NodeNames';

export function isOrderedListNode(node: Node): boolean {
  return node.type.name === ORDERED_LIST;
}
