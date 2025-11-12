import {Fragment, Schema} from 'prosemirror-model';
import {EditorState, Transaction, TextSelection} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import React from 'react';
import {
  hideCursorPlaceholder,
  showCursorPlaceholder,
} from './CursorPlaceholderPlugin';
import {VIDEO} from './Constants';
import {UICommand} from '@modusoperandi/licit-doc-attrs-step';
import {createPopUp} from '@modusoperandi/licit-ui-commands';
import {VideoEditorState} from './ui/VideoEditor';

export function insertIFrame(
  tr: Transform,
  schema: Schema,
  config?: VideoEditorState
): Transform {
  const {selection} = tr as Transaction;
  if (!selection) {
    return tr;
  }
  const {from, to} = selection;
  if (from !== to) {
    return tr;
  }

  const video = schema.nodes[VIDEO];
  if (!video) {
    return tr;
  }

  const attrs = {
    id: config.id || '',
    src: config.src || '',
    alt: '',
    title: '',
    width: config.width,
    height: config.height,
    frameBorder: 0,
  };

  const node = video.create(attrs, null, null);
  const frag = Fragment.from(node);
  tr = tr.insert(from, frag);
  return tr;
}

export class VideoSourceCommand extends UICommand {
  _popUp = null;

  getEditor(): typeof React.Component {
    throw new Error('Not implemented');
  }

  isEnabled = (state: EditorState, view?: EditorView): boolean => {
    return this.__isEnabled(state, view);
  };

  waitForUserInput = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    view?: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<unknown> => {
    if (this._popUp) {
      return Promise.resolve(undefined);
    }

    if (dispatch) {
      dispatch(showCursorPlaceholder(state));
    }

    return new Promise((resolve) => {
      const props = {runtime: view['runtime']};
      this._popUp = createPopUp(this.getEditor(), props, {
        modal: true,
        onClose: (val) => {
          if (this._popUp) {
            this._popUp = null;
            resolve(val);
          }
        },
      });
    });
  };

  executeWithUserInput = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    view?: EditorView,
    config?: VideoEditorState
  ): boolean => {
    if (dispatch) {
      const {selection, schema} = state;
      let {tr} = state;
      tr = (view ? hideCursorPlaceholder(view.state) : tr) as Transaction;
      tr = tr.setSelection(selection);
      if (config) {
        tr = insertIFrame(tr, schema, config) as Transaction;
      }
      dispatch(tr);
      view?.focus();
    }

    return false;
  };

  __isEnabled = (state: EditorState, _view?: EditorView): boolean => {
    const tr = state;
    const {selection} = tr;
    if (selection instanceof TextSelection) {
      return selection.from === selection.to;
    }
    return true;
  };

  cancel(): void {
    return null;
  }

  renderLabel() {
    return null;
  }

  isActive(): boolean {
    return true;
  }

  executeCustom(_state: EditorState, tr: Transform): Transform {
    return tr;
  }

  executeCustomStyleForTable(_state: EditorState, tr: Transform): Transform {
    return tr;
  }
}
