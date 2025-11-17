import { Node } from '@tiptap/pm/model';

import { isBulletListNode } from './isBulletListNode';
import { isOrderedListNode } from './isOrderedListNode';

export function isListNode(node: Node): boolean {
  if (node instanceof Node) {
    return isBulletListNode(node) || isOrderedListNode(node);
  }
  return false;
}
