/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { REFERENCE } from './ReferenceNodeSpec';
import { EditorView } from 'prosemirror-view';

export function insertReference(
  view: EditorView,
  id: string,
  docId: string,
  docLabel: string,
  scrollId:string
) {
  const node = view.state?.schema.nodes[REFERENCE].create({
    docId,
    docLabel,
    id,
    scrollId
  });
  const tr = view.state.tr.replaceSelectionWith(node);
  view.dispatch(tr);
}
