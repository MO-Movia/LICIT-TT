import {Fragment, Schema} from 'prosemirror-model';
import {EditorState, Transaction, TextSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {UICommand} from '@modusoperandi/licit-doc-attrs-step';
import {DEF_BORDER_COLOR, PARAGRAPH, TABLE, TABLE_CELL} from './Constants';
import * as React from 'react';
import {Transform} from 'prosemirror-transform';

export class VignetteCommand extends UICommand {
  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }

  isEnabled = (state: EditorState, view?: EditorView): boolean => {
    return this.__isEnabled(state, view);
  };

  execute = (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView
  ): boolean => {
    if (dispatch) {
      const {schema} = state;
      let {tr} = state;
      tr = this.insertTable(tr, schema, 1, 1);
      tr = this.insertParagraph(state, tr);
      dispatch(tr);
      view?.focus();
    }

    return true;
  };

  waitForUserInput = (
    _state: EditorState,
    _dispatch: (tr: Transform) => void,
    _view: EditorView,
    _event: React.SyntheticEvent<Element, Event>
  ): Promise<undefined> => {
    return Promise.resolve(undefined);
  };

  executeWithUserInput = (
    _state: EditorState,
    _dispatch: (tr: Transform) => void,
    _view: EditorView,
    _inputs: string
  ): boolean => {
    return false;
  };

  cancel(): void {
    return null;
  }

  __isEnabled = (_state: EditorState, _view?: EditorView): boolean => {
    return true;
  };

  insertTable(
    tr: Transaction,
    schema: Schema,
    rows: number,
    cols: number
  ): Transaction {
    if (!tr.selection || !tr.doc) {
      return tr;
    }
    const {from, to} = tr.selection;
    if (from !== to) {
      return tr;
    }

    const {nodes} = schema;
    const cell = nodes[TABLE_CELL];
    const paragraph = nodes[PARAGRAPH];
    const row = nodes['tableRow'];
    const table = nodes[TABLE];
    if (!(cell && paragraph && row && table)) {
      return tr;
    }

    const rowNodes = [];
    for (let rr = 0; rr < rows; rr++) {
      const cellNodes = [];
      for (let cc = 0; cc < cols; cc++) {
        // [FS] IRAD-950 2020-05-25
        // Fix:Extra arrow key required for cell navigation using arrow right/Left
        const cellNode = cell.create(
          {
            borderColor: DEF_BORDER_COLOR,
            backgroundColor: '#dce6f2',
            vignette: true,
          },
          Fragment.fromArray([paragraph.create()])
        );
        cellNodes.push(cellNode);
      }
      const rowNode = row.create({}, Fragment.from(cellNodes));
      rowNodes.push(rowNode);
    }
    const tableNode = table.create({vignette: true}, Fragment.from(rowNodes));
    tr = tr.insert(from, Fragment.from(tableNode));

    const selection = TextSelection.create(tr.doc, from, from + 5);

    tr = tr.setSelection(selection);
    return tr;
  }

  // [FS] 2021-04-01
  // Add empty line after table drop
  // To make easier to enter a line after table
  insertParagraph(state: EditorState, tr: Transaction) {
    const paragraph = state.schema.nodes[PARAGRAPH];
    const textNode = state.schema.text(' ');
    const {from, to} = tr.selection;
    if (from !== to) {
      return tr;
    }
    const paragraphNode = paragraph.create({}, textNode, null);
    tr = tr.insert(
      from + tr.selection.$head.node(1).nodeSize - 2,
      Fragment.from(paragraphNode)
    );
    return tr;
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
}
