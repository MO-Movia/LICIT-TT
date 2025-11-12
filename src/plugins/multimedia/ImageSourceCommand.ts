import {Fragment, Schema} from 'prosemirror-model';
import {EditorState, Transaction, TextSelection} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import React from 'react';
import {
  hideCursorPlaceholder,
  showCursorPlaceholder,
} from './CursorPlaceholderPlugin';
import {UICommand} from '@modusoperandi/licit-doc-attrs-step';
import {createPopUp, PopUpHandle} from '@modusoperandi/licit-ui-commands';

import type {ImageLike} from './Types';

interface ImageAttrs {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
}

export function insertImage(
  tr: Transform,
  schema: Schema,
  src: string,
  width?: number,
  height?: number
): Transform {
  const {selection} = tr as Transaction;
  if (!selection) return tr;
  const {from, to} = selection;
  if (from !== to) return tr;

  const image = schema.nodes['image'];
  if (!image) return tr;

  const attrs: ImageAttrs = {
    src: src || '',
    alt: '',
    title: '',
  };

  if (width && height) {
    attrs.width = width;
    attrs.height = height;
  }

  const node = image.create(attrs, null);
  const frag = Fragment.from(node);
  return tr.insert(from, frag);
}

export function getImageSize(
  src: string
): Promise<{width: number; height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({width: img.width, height: img.height});
    };
    img.onerror = reject;
    img.src = src;
  });
}

export class ImageSourceCommand extends UICommand {
  _popUp?: PopUpHandle;

  getEditor(): typeof React.Component {
    throw new Error('Not implemented');
  }

  isEnabled = (state: EditorState, view: EditorView): boolean => {
    return this.__isEnabled(state, view);
  };

  waitForUserInput = (
    state: EditorState,
    dispatch: (tr: Transform) => void,
    view: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<unknown> => {
    if (this._popUp) {
      return Promise.resolve(undefined);
    }

    if (dispatch) {
      dispatch(showCursorPlaceholder(state));
    }

    return new Promise((resolve) => {
      const props = {runtime: view ? view['runtime'] : null};
      this._popUp = createPopUp(this.getEditor(), props, {
        modal: true,
        onClose: (val) => {
          if (this._popUp) {
            this._popUp = undefined;
            resolve(val);
          }
        },
      });
    });
  };

  executeWithUserInput = (
    state: EditorState,
    dispatch: (tr: Transform) => void,
    view: EditorView,
    inputs: ImageLike
  ): boolean => {
    if (dispatch && inputs?.src) {
      getImageSize(inputs.src).then(({width, height}) => {
        const {selection, schema} = state;
        let {tr} = state;
        tr = view ? (hideCursorPlaceholder(view.state) as Transaction) : tr;
        tr = tr.setSelection(selection);

        tr = insertImage(tr, schema, inputs.src, width, height) as Transaction;

        dispatch(tr);
        view?.focus();
      });
    }
    return false;
  };

  __isEnabled = (state: EditorState, _view: EditorView): boolean => {
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
