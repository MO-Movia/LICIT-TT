/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';
export const INFO_ICON = 'infoicon';
export const MARKFROM = 'markFrom';
export const PARAGRAPH = 'paragraph';
export const SELECTEDINFOICON = 'selectedInfoIcons';
export type KeyValuePair = { [key: string]: unknown };

//to get the selected node
export function getNode(
  from: number,
  to: number,
  tr: Transform
): Node | null {
  let selectedNode: Node | null = null;
  tr.doc.nodesBetween(from, to, (node, _startPos) => {
    if (node.type.name === 'paragraph') {
      if (null == selectedNode) {
        selectedNode = node;
      }
    }
  });
  return selectedNode;
}
