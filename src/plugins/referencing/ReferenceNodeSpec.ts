/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { NodeSpec } from 'prosemirror-model';
export const REFERENCE = 'reference';

export const ReferenceNodeSpec: NodeSpec = {
  attrs: {
    objectId: { default: null },
    docId: { default: null },
    docLabel: { default: null },
    id: { default: null },
    scrollId: { default: null },
    class: { default: 'ref-background' },
  },

  content: 'block+',
  group: 'block',
  parseDOM: [
    {
      tag: REFERENCE,
    },
  ],
  toDOM(node) {
    return [REFERENCE, { ...node?.attrs, contentEditable: false }, 0];
  },
};
