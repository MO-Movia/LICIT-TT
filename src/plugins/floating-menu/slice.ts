/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { Node } from 'prosemirror-model';
import { FloatRuntime, SliceModel } from './model';

export function createSliceManager(runtime: FloatRuntime) {
  let docSlices: SliceModel[] = [];

  // store slices in cache
  function setSlices(slices: SliceModel[], state: EditorState) {
    const objectId = state.doc.attrs.objectId;
    const filteredSlices = slices.filter((slice) => slice.source === objectId);
    docSlices = [...docSlices, ...filteredSlices];
  }

  function getDocSlices() {
    return docSlices;
  }

  // retrieve document slices from server
  function getDocumentSlices(_view: EditorView): Promise<SliceModel[]> {
    return runtime?.retrieveSlices();
  }

  // add new slice to cache
  function addSliceToList(slice: SliceModel) {
    docSlices.push(slice);
    return docSlices;
  }

      // apply slice attributes to the doc
    function setSliceAttrs(view: EditorView) {
      const result = getDocSlices();
      let tr = view.state.tr;

      for (const obj of result) {
        view.state.doc.descendants((nodeactual: Node, pos) => {
          if (nodeactual?.attrs?.objectId === obj?.from) {
            const newattrs = { ...nodeactual.attrs };
            const isDeco = { ...newattrs.isDeco };
            isDeco.isSlice = true;
            newattrs.isDeco = isDeco;
            tr = tr.setNodeMarkup(pos, undefined, newattrs);
          }
        });
      }
      view.dispatch(tr);
    }

    function addInfoIcon(): void {
     return runtime?.insertInfoIconFloat();
   }

    function addCitation(): void {
     return runtime?.insertCitationFloat();
   }

  function createSliceViaDialog(props: SliceModel): Promise<SliceModel> {
    return runtime?.createSlice(props);
  }
  function insertReference(): Promise<SliceModel> {
    return runtime?.insertReference();
  }

  return {
    setSlices,
    getDocSlices,
    getDocumentSlices,
    addSliceToList,
    setSliceAttrs,
    addInfoIcon,
    addCitation,
    createSliceViaDialog,
    insertReference
  };
}
