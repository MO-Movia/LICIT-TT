import { toggleMark } from '@tiptap/pm/commands';
import { EditorState } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import { EditorView } from '@tiptap/pm/view';
import { findNodesWithSameMark } from './findNodesWithSameMark';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import * as React from 'react';
import { updateToggleMarks } from './applyMark';

export class MarkToggleCommand extends UICommand {
  _markName: string;
  doUpdate: boolean = false;
  constructor(markName: string) {
    super();
    this._markName = markName;
  }

  isActive = (state: EditorState): boolean => {
    const { schema, doc, selection } = state;
    const { from, to } = selection;
    const markType = schema.marks[this._markName];
    if (markType && from < to) {
      return !!findNodesWithSameMark(doc, from, to - 1, markType);
    }
    return false;
  };

  waitForUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<undefined> => {
    return Promise.resolve(undefined);
  };

  executeWithUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    _inputs?: string
  ): boolean => {
    return false;
  };

  cancel(): void {
    return null;
  }

  execute = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    _view?: EditorView
  ): boolean => {
    const { schema, selection, tr } = state;
    const markType = schema.marks[this._markName];

    if (!markType) {
      return false;
    }

    const { from, to } = selection;
    if (tr && to === from + 1) {
      const node = tr.doc.nodeAt(from);
      if (node.isAtom && !node.isText && node.isLeaf) {
        // An atomic node (e.g. Image) is selected.
        return false;
      }
    }

    //Replace `toggleMark` with transform that does not change scroll
    // position.
    const newattrs = { overridden: true };
    if (this.doUpdate) {
      updateToggleMarks(markType, tr, state);
      this.doUpdate = false;
      _view?.dispatch(tr);
    }
    if (dispatch) {
      this.doUpdate = true;
      return toggleMark(markType, newattrs)(state, dispatch);
    }
    return true;
  };

  // [FS] IRAD-1087 2020-09-30
  // Method to execute strike, em, strong, underline,superscrpt for custom styling implementation.
  executeCustom = (
    state: EditorState,
    tr: Transform,
    posfrom: number,
    posto: number
  ) => {
    const { schema } = state;
    const markType = schema.marks[this._markName];
    if (!markType) {
      return false;
    }

    if (tr && posto === posfrom + 1) {
      const node = tr.doc.nodeAt(posfrom);
      if (node.isAtom && !node.isText && node.isLeaf) {
        // An atomic node (e.g. Image) is selected.
        return false;
      }
    }

    return toggleCustomStyle(markType, null, state, tr, posfrom, posto);
  };

  executeCustomStyleForTable = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ) => {
    const { schema } = state;
    const markType = schema.marks[this._markName];
    if (!markType) {
      return false;
    }

    if (tr && to === from + 1) {
      const node = tr.doc.nodeAt(from);
      if (node.isAtom && !node.isText && node.isLeaf) {
        // An atomic node (e.g. Image) is selected.
        return false;
      }
    }

    return toggleCustomStyle(markType, null, state, tr, from, to);
  };

  renderLabel() {
    return null;
  }
}

// [FS] IRAD-1042 2020-09-30
// Fix: overrided the toggleMarks for custom style implementation
// Return Transform object
export function toggleCustomStyle(
  markType,
  attrs,
  state,
  tr,
  posfrom: number,
  posto: number
) {
  const ref = state.selection;
  const empty = ref.empty;
  const $cursor = ref.$cursor;
  const ranges = ref.ranges;
  if ((empty && !$cursor) || !markApplies(state.doc, ranges, markType)) {
    return tr;
  }
  if ($cursor && $cursor.parentOffset === 0 && posfrom === posto) {
    if (markType.isInSet(state.storedMarks || $cursor.marks())) {
      tr = state.tr.removeStoredMark(markType);
    } else {
      tr = state.tr.addStoredMark(markType.create(attrs));
    }
  } else {
    // [FS] IRAD-1043 2020-10-27
    // No need to remove the applied custom style, if user select the same style multiple times.
    let from = posfrom;
    let to = 0;
    tr.doc.nodesBetween(posfrom, posto, (node, pos) => {
      from = pos;
      to = from + node.nodeSize;
      if (node && 0 < node.marks?.length) {
        const overridden = node.marks.find(
          (mark) => mark.type.name === 'override'
        );
        const skip = overridden?.attrs[markType.name] === true;
        if (!skip) {
          attrs = { overridden: false };
          tr = tr.addMark(from, to, markType.create(attrs));
        }
        from = to;
      }
    });
  }
  return tr;
}

//overrided method from prosemirror Transform
function markApplies(doc, ranges, type) {
  let returned = false;
  const loop = function (i) {
    const ref = ranges[i];
    const $from = ref.$from;
    const $to = ref.$to;
    let can = $from.depth === 0 ? doc.type.allowsMarkType(type) : false;
    let bOk = false;

    doc.nodesBetween($from.pos, $to.pos, function (node) {
      if (can) {
        return false;
      }
      can = node.inlineContent && node.type.allowsMarkType(type);
      return true;
    });
    if (can) {
      bOk = true;
    }
    return bOk;
  };

  for (let i = 0; i < ranges.length; i++) {
    returned = loop(i);
    if (returned) {
      return returned;
    }
  }
  return returned;
}
