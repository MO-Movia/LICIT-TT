/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

// Local storage of CAPCO
import { CAPCOKEY } from './constants';
import { EditorView } from 'prosemirror-view';

export type CList = { key: string; value: string; isCustomCAPCO: boolean };

export function updateDocument(
  capco: string,
  updatedCapco: string | null,
  view: EditorView
): void {
  const { state, dispatch } = view;
  let tr = state.tr;
  state.doc.descendants((node, pos) => {
    if (node.attrs && node.attrs[CAPCOKEY] === capco) {
      const newAttrs = {};
      Object.assign(newAttrs, node.attrs);
      newAttrs[CAPCOKEY] = updatedCapco;
      tr = tr.setNodeMarkup(pos, null, newAttrs);
    }
    return true;
  });
  dispatch(tr);
}

