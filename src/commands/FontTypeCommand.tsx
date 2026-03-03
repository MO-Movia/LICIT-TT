/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Schema} from 'prosemirror-model';
import {TextSelection, EditorState, Transaction} from 'prosemirror-state';

import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import * as React from 'react';

import {MARK_FONT_TYPE} from './MarkNames';
import {applyMark, updateMarksAttrs} from './applyMark';
import { UICommand } from '../core';

function setFontType(
  tr: Transform,
  state: EditorState,
  schema: Schema,
  name: string,
  isCustomStyleApplied?: boolean
): Transform {
  const markType = schema.marks[MARK_FONT_TYPE];
  if (!markType) {
    return tr;
  }

  const attrs = name ? {name: name, overridden: !isCustomStyleApplied} : null;
  tr = applyMark(tr, schema, markType, attrs, isCustomStyleApplied);
  if (undefined === isCustomStyleApplied) {
    updateMarksAttrs(markType, tr, state, name);
  }
  return tr;
}

export class FontTypeCommand extends UICommand {
  _label = null;
  _name = '';
  _popUp = null;

  constructor(name: string) {
    super();
    this._name = name;
    this._label = name ? <span style={{fontFamily: name}}>{name}</span> : null;
  }

  renderLabel = (_state: EditorState) => {
    return this._label;
  };

  isEnabled = (state: EditorState): boolean => {
    const {schema, selection, tr} = state;

    const markType = schema.marks[MARK_FONT_TYPE];
    if (!markType) {
      return false;
    }

    const {from, to} = selection;
    if (to === from + 1) {
      const node = tr.doc.nodeAt(from);
      if (node.isAtom && !node.isText && node.isLeaf) {
        // An atomic node (e.g. Image) is selected.
        return false;
      }
    }

    return true;
  };

  execute = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    _view?: EditorView
  ): boolean => {
    const {schema} = state;
    // commnted selection because selection removes the storedMarks;
    // {selection}

    const tr = setFontType(state.tr, state, schema, this._name);
    if (tr.docChanged || (tr as Transaction).storedMarksSet) {
      // If selection is empty, the color is added to `storedMarks`, which
      // works like `toggleMark`
      // (see https://prosemirror.net/docs/ref/#commands.toggleMark).
      dispatch?.(tr);
      return true;
    }
    return false;
  };
  // [FS] IRAD-1087 2020-10-01
  // Method to execute custom styling implementation of font type
  executeCustom = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform => {
    const {schema} = state;
    tr = setFontType(
      (tr as Transaction).setSelection(TextSelection.create(tr.doc, from, to)),
      state,
      schema,
      this._name,
      true
    );
    return tr;
  };

  executeCustomStyleForTable = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform => {
    const {schema} = state;
    tr = setFontType(
      (tr as Transaction).setSelection(TextSelection.create(tr.doc, from, to)),
      state,
      schema,
      this._name,
      true
    );
    return tr;
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

  isActive(): boolean {
    return false;
  }
}
