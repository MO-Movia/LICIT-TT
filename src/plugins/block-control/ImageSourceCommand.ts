/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Fragment, Schema } from 'prosemirror-model';
import { EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import React from 'react';
import {
  hideCursorPlaceholder,
  showCursorPlaceholder,
} from './CursorPlaceholderPlugin';
import { UICommand } from '../../core';
import { createPopUp, PopUpHandle } from '../../commands';

import type { ImageProps } from './Types';


// Command to insert the Enhanced Table/Figure node (for image)
export function insertEnhancedImageFigure(
  tr: Transaction,
  schema: Schema,
  imageUrl: string,
  altText = '',
  withLandscape = false
): Transaction {
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
  if (!bodyType || !imageNodeType) {
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
  if (!capcoType) {
    return tr;
  }
  const capcoNode = capcoType.create({}, schema.text(' '));

  // Assemble the composite in the order: [body, capco]
  const content = Fragment.fromArray([bodyNode, capcoNode]);
  // Set the figureType to 'figure'.
  const figureNode = figureNodeType.create({ figureType: 'figure', orientation: 'landscape' }, content);

  const insertNode =
    withLandscape && schema.nodes.landscape_section
      ? schema.nodes.landscape_section.create(null, figureNode)
      : figureNode;

  const $from = selection.$from;
  const replaceEmptyParagraph =
    $from.depth > 0 &&
    $from.parent.type.name === 'paragraph' &&
    $from.parent.content.size === 0;
  const insertFrom = replaceEmptyParagraph ? $from.before() : from;
  const insertTo = replaceEmptyParagraph ? $from.after() : from;

  // Insert the figure node, optionally wrapped in a landscape section.
  tr = tr.replaceWith(insertFrom, insertTo, insertNode);

  // Insert a new paragraph after the figure.
  const paragraphNode = schema.nodes.paragraph.createAndFill();
  if (paragraphNode) {
    const after = replaceEmptyParagraph
      ? insertFrom + insertNode.nodeSize
      : tr.mapping.map(from, 1);
    tr = tr.insert(after, paragraphNode);
    tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
  }
  return tr;
}


export class ImageSourceCommand extends UICommand {
  _popUp?: PopUpHandle;
  _withLandscape: boolean;

  constructor(withLandscape = false) {
    super();
    this._withLandscape = withLandscape;
  }

  getEditor(): typeof React.Component | undefined {
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
      tr = view ? (hideCursorPlaceholder(view.state) as unknown as Transaction) : tr;
      tr = tr.setSelection(selection);
      if (inputs) {
        const { src } = inputs;
        tr = insertEnhancedImageFigure(tr, schema, src, '', this._withLandscape);
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
