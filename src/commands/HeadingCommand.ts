/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import { toggleHeading } from './toggleHeading';
import { UICommand } from '../core';
import * as React from 'react';

export class HeadingCommand extends UICommand {
  _level: number;

  constructor(level: number) {
    super();
    this._level = level;
  }

  isActive = (_state: EditorState): boolean => {
    return true;
  };

  execute = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    _view?: EditorView
  ): boolean => {
    const { schema, selection } = state;
    const tr = toggleHeading(
      state.tr.setSelection(selection),
      schema,
      this._level
    );
    if (tr.docChanged) {
      dispatch?.(tr);
      return true;
    } else {
      return false;
    }
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

  renderLabel = () => {
    return null;
  };

  executeCustom = (_state: EditorState, tr: Transform): Transform => {
    return tr;
  };
  executeCustomStyleForTable = (
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform => {
    return tr;
  };
}
