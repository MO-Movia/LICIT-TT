import { Fragment } from 'prosemirror-model';
import { EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import React from 'react';
import {
  hideCursorPlaceholder,
  showCursorPlaceholder,
} from './CursorPlaceholderPlugin';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { createPopUp, PopUpHandle } from '@modusoperandi/licit-ui-commands';

import type { ImageProps } from './Types';


// Command to insert the Enhanced Table/Figure node (for image)
export function insertEnhancedImageFigure(tr, schema, imageUrl, altText = '') {
  const { selection } = tr;
  const { from, to } = selection;
  if (from !== to) {
    return tr;
  }

  const figureNodeType = schema.nodes.enhanced_table_figure;
  if (!figureNodeType) {
    return tr;
  }

  // Create the body that contains an image.
  const bodyType = schema.nodes.enhanced_table_figure_body;
  const imageNodeType = schema.nodes['image'];
  if (!imageNodeType) {
    return tr;
  }
  const imageAttrs = {
    src: imageUrl,
    alt: altText,
    simpleImg: 'false',
    cropData: null,
  };
  const imageNode = imageNodeType.create(imageAttrs, null);
  const bodyNode = bodyType.create({}, imageNode);

  // No notes by default.
  // Create a blank CAPCO (footer) node.
  const capcoType = schema.nodes.enhanced_table_figure_capco;
  const capcoNode = capcoType.create({}, schema.text(' '));

  // Assemble the composite in the order: [body, capco]
  const content = Fragment.fromArray([bodyNode, capcoNode]);
  // Set the figureType to 'figure'.
  const figureNode = figureNodeType.create({ figureType: 'figure', orientation: 'landscape' }, content);

  // Insert the figure node.
  tr = tr.insert(from, figureNode);

  // Insert a new paragraph after the figure.
  const paragraphNode = schema.nodes.paragraph.createAndFill();
  if (paragraphNode) {
    const after = from + figureNode.nodeSize;
    tr = tr.insert(after, paragraphNode);
    tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
  }
  return tr;
}


export class ImageSourceCommand extends UICommand {
  _popUp?: PopUpHandle;

  getEditor(): typeof React.Component {
    return undefined;
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
      const props = { runtime: view ? view['runtime'] : null };
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
    inputs: ImageProps
  ): boolean => {
    if (dispatch) {
      const { selection, schema } = state;
      let { tr } = state;
      tr = view ? (hideCursorPlaceholder(view.state) as Transaction) : tr;
      tr = tr.setSelection(selection);
      if (inputs) {
        const { src } = inputs;
        tr = insertEnhancedImageFigure(tr, schema, src) as Transaction;
      }
      dispatch(tr);
      view?.focus();
    }

    return false;
  };

  __isEnabled = (state: EditorState, _view: EditorView): boolean => {
    const tr = state;
    const { selection } = tr;
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

  executeCustomStyleForTable(_state: EditorState, tr: Transform, _from: number, _to: number): Transform {
    return tr;
  }
}
