/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Fragment, Node, Schema } from 'prosemirror-model';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { UICommand } from '../../core';
import { Transform } from 'prosemirror-transform';
import { PARAGRAPH, TABLE, TABLE_CELL, TABLE_ROW, ENHANCED_TABLE_FIGURE_BODY, ENHANCED_TABLE_FIGURE_NOTES, ENHANCED_TABLE_FIGURE } from './Constants';

export class EnhancedTableCommands extends UICommand {
  // image,table
  _nodeType: string;
  _withLandscape: boolean;

  constructor(type: string, withLandscape = false) {
    super();
    this._nodeType = type;
    this._withLandscape = withLandscape;
  }
  executeCustom(_state: EditorState, tr: Transform, _from: number, _to: number): Transform {
    return tr;
  }

  executeCustomStyleForTable(_state: EditorState, tr: Transform, _from: number, _to: number): Transform {
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
      const { schema } = state;
      let { tr } = state;
      if (this._nodeType === 'table') {
        tr = this.insertEnhancedTableFigure(tr, schema, this._withLandscape);

      }

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

  // Command to insert the entire Enhanced Table/Figure node
  insertEnhancedTableFigure(
    tr: Transaction,
    schema: Schema,
    withLandscape = false
  ): Transaction {
    const { selection } = tr;
    const { from, to } = selection;
    if (from !== to) {
      // Only insert if the cursor is at a single position.
      return tr;
    }

    const figureNodeType = schema.nodes.enhanced_table_figure;
    if (!figureNodeType) {
      return tr;
    }

    // Create the body with a 3×3 table.
    const bodyType = schema.nodes.enhanced_table_figure_body;
    const tableNode = this.createBlueTable(schema, 3, 3);
    if (!bodyType || !tableNode) {
      return tr;
    }
    const bodyNode = bodyType.create({}, Fragment.from(tableNode));

    // No notes by default.

    // Create a blank CAPCO (footer) node.
    const capcoType = schema.nodes.enhanced_table_figure_capco;
    if (!capcoType) {
      return tr;
    }
    const capcoNode = capcoType.create({}, schema.text(' '));

    // Assemble the composite in the order: [body, (notes optional), capco]
    const content = Fragment.fromArray([bodyNode, capcoNode]);
    const figureNode = figureNodeType.create({ figureType: 'table', orientation: 'landscape' }, content);

    const insertNode =
      withLandscape && schema.nodes.landscape_section
        ? schema.nodes.landscape_section.create(null, figureNode)
        : figureNode;

    const $from = selection.$from;
    const replaceEmptyParagraph =
      $from.depth > 0 &&
      $from.parent.type.name === PARAGRAPH &&
      $from.parent.content.size === 0;
    const insertFrom = replaceEmptyParagraph ? $from.before() : from;
    const insertTo = replaceEmptyParagraph ? $from.after() : from;

    // Insert the figure node, optionally wrapped in a landscape section.
    tr = tr.replaceWith(insertFrom, insertTo, insertNode);

    const para = schema.nodes.paragraph.createAndFill();
    if (para) {
      const after = replaceEmptyParagraph
        ? insertFrom + insertNode.nodeSize
        : tr.mapping.map(from, 1);
      tr = tr.insert(after, para);
      tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
    }

    return tr;
  }


  createBlueTable(schema: Schema, rows: number, cols: number): Node | undefined {
    const { nodes } = schema;
    const cell = nodes[TABLE_CELL] ?? nodes.table_cell;
    const paragraph = nodes[PARAGRAPH];
    const row = nodes[TABLE_ROW] ?? nodes.table_row;
    const table = nodes[TABLE];
    if (!(cell && paragraph && row && table)) {
      return undefined;
    }

    const rowNodes = [];
    for (let rr = 0; rr < rows; rr++) {
      const cellNodes = [];
      for (let cc = 0; cc < cols; cc++) {
        // For the first row, first 3 cells get a yellow background.
        const attrs = rr === 0 && cc < 3 ? { background: '#abdbe3' } : undefined;
        const cellNode = cell.create(
          attrs,
          Fragment.fromArray([paragraph.create()])
        );
        cellNodes.push(cellNode);
      }
      const rowNode = row.create({}, Fragment.from(cellNodes));
      rowNodes.push(rowNode);
    }
    const tableNode = table.create({}, Fragment.from(rowNodes));
    return tableNode;
  }

}

export function addNotesCommand(
  tr: Transform,
  schema: Schema,
  pos: number
): Transform {
  const node = tr.doc.nodeAt(pos);
  if (!node || node.type.name !== ENHANCED_TABLE_FIGURE) return tr;

  // Check if notes already exist.
  let notesExists = false;
  const children = [];
  const paragraph = schema.nodes.paragraph.create(
    {},
    schema.text('\u200B') // optional placeholder
  );

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    children.push(child);
    if (child.type.name === ENHANCED_TABLE_FIGURE_NOTES) {
      notesExists = true;
    }
  };
  if (notesExists) return tr;

  // Create a blank notes node (with a zero-width space placeholder).
  const notesType = schema.nodes.enhanced_table_figure_notes;
  const notesNode = notesType.create({}, paragraph);

  // Insert the notes node after the body.
  const newChildren = [];
  let inserted = false;
  for (const child of children) {
    newChildren.push(child);
    if (!inserted && child.type.name === ENHANCED_TABLE_FIGURE_BODY) {
      newChildren.push(notesNode);
      inserted = true;
    }
  }

  const newNode = node.type.create(node.attrs, Fragment.fromArray(newChildren));
  return tr.replaceWith(pos, pos + node.nodeSize, newNode);
}
