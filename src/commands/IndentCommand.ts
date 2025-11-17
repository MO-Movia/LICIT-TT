import { EditorState, TextSelection, Transaction } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import { EditorView } from '@tiptap/pm/view';
import * as React from 'react';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { updateIndentLevel } from './updateIndentLevel';

export class IndentCommand extends UICommand {
  _delta: number;

  constructor(delta: number) {
    super();
    this._delta = delta;
  }

  isActive = (_state: EditorState): boolean => {
    return true;
  };

  execute = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    _view?: EditorView
  ): boolean => {
    const { selection, schema } = state;
    let { tr } = state;
    tr = tr.setSelection(selection);
    const trx = updateIndentLevel(state, tr, schema, this._delta, _view);
    if (trx.docChanged) {
      // set the value of overriddenIndent to true if the user override the indent style.
      const nodePos = (trx.tr as Transaction).selection.$from.before(1);
      const paraNode = trx.tr.doc.nodeAt(nodePos);
      if (paraNode) {
        if (
          Number(selection.$head.parent.attrs.indent) !==
          Number(paraNode.attrs.indent)
        ) {
          const newAttrs = {
            ...paraNode.attrs,
            overriddenIndent: true,
            overriddenIndentValue: paraNode.attrs.indent,
          };
          tr = tr.setNodeMarkup(nodePos, null, newAttrs);
        }
      }

      dispatch?.(trx.tr);
    }
    return true;
  };
  // [FS] IRAD-1087 2020-11-11
  // New method to execute new styling implementation for indent
  executeCustom = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform => {
    const { schema } = state;
    tr = (tr as Transaction).setSelection(
      TextSelection.create(tr.doc, from, to)
    );
    const trx = updateIndentLevel(state, tr, schema, this._delta, null);
    return trx.tr;
  };

  executeCustomStyleForTable = (
    state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform => {
    const { schema } = state;
    const trx = updateIndentLevel(state, tr, schema, this._delta, null);
    return trx.tr;
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

  renderLabel() {
    return null;
  }
}
