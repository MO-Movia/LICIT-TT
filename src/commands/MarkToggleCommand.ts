/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState, TextSelection} from 'prosemirror-state';
import {MarkType} from 'prosemirror-model';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import {findNodesWithSameMark} from './findNodesWithSameMark';
import { UICommand } from '../core';
import * as React from 'react';
import {updateToggleMarks} from './applyMark';

export class MarkToggleCommand extends UICommand {
  _markName: string;
  doUpdate: boolean = false;
  constructor(markName: string) {
    super();
    this._markName = markName;
  }

  isActive = (state: EditorState): boolean => {
    const {schema, doc, selection} = state;
    const {from, to} = selection;
    const markType = schema.marks[this._markName];
    if (markType && from <= to) {
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
    const {schema, selection} = state;
    const markType = schema.marks[this._markName];

    if (!markType) {
      return false;
    }

    const {from, to} = selection;

    if (to === from + 1) {
      const node = state.doc.nodeAt(from);
      if (node?.isAtom && !node.isText && node.isLeaf) {
      // An atomic node (e.g. Image) is selected.
        return false;
      }
    }

    if (!dispatch) {
      return true;
    }

    // Create a new transaction
    let tr = state.tr;

    // Apply your custom updateToggleMarks logic first
    updateToggleMarks(markType, tr, state);

    // Now manually apply the toggle mark logic on the same transaction
    const newattrs = {overridden: true};

    if (selection.empty) {
      // For cursor selections (TextSelection with $cursor)
      const marks = state.storedMarks || selection.$from.marks();
      if (markType.isInSet(marks)) {
        tr = tr.removeStoredMark(markType);
      } else {
        tr = tr.addStoredMark(markType.create(newattrs));
      }
    } else {
      // For range selections
      const hasMark = state.doc.rangeHasMark(from, to, markType);

      if (hasMark) {
        tr = tr.removeMark(from, to, markType);
      } else {
        tr = tr.addMark(from, to, markType.create(newattrs));
      }
    }

    dispatch(tr);
    return true;
  };

  // [FS] IRAD-1087 2020-09-30
  // Method to execute strike, em, strong, underline,superscrpt for custom styling implementation.
  executeCustom = (
    state: EditorState,
    tr: Transform,
    posfrom: number,
    posto: number
  ): Transform => {
    const {schema} = state;
    const markType = schema.marks[this._markName];
    if (!markType) {
      return false as unknown as Transform;
    }

    if (tr && posto === posfrom + 1) {
      const node = tr.doc.nodeAt(posfrom);
      if (node?.isAtom && !node.isText && node.isLeaf) {
        // An atomic node (e.g. Image) is selected.
        return false as unknown as Transform;
      }
    }

    return toggleCustomStyle(markType, null, state, tr, posfrom, posto);
  };

  executeCustomStyleForTable = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform => {
    const {schema} = state;
    const markType = schema.marks[this._markName];
    if (!markType) {
      return false as unknown as Transform;
    }

    if (tr && to === from + 1) {
      const node = tr.doc.nodeAt(from);
      if (node?.isAtom && !node.isText && node.isLeaf) {
        // An atomic node (e.g. Image) is selected.
        return false as unknown as Transform;
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
  markType: MarkType,
  attrs: Record<string, unknown> | null,
  state: EditorState,
  tr: Transform,
  posfrom: number,
  posto: number
): Transform {
  const ref = state.selection as TextSelection & {
    $cursor?: EditorState['selection']['$from'] | null;
  };
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
        const skip = overridden?.attrs[markType.name ?? ''] === true;
        if (!skip) {
          attrs = {overridden: false};
          tr = tr.addMark(from, to, markType.create(attrs));
        }
        from = to;
      }
    });
  }
  return tr;
}

//overrided method from prosemirror Transform
function markApplies(
  doc: EditorState['doc'],
  ranges: EditorState['selection']['ranges'],
  type: MarkType
): boolean {
  let returned = false;
  const loop = function (i) {
    const ref = ranges[i];
    const $from = ref.$from;
    const $to = ref.$to;
    let can = $from.depth === 0 ? doc.type.allowsMarkType(type) : false;
    let bOk = false;

    doc.nodesBetween($from.pos, $to.pos, (node) => {
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
