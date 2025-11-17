import { Node } from '@tiptap/pm/model';

import { ORDERED_LIST } from './NodeNames';

export function isOrderedListNode(node: Node): boolean {
  return node.type.name === ORDERED_LIST;
}
