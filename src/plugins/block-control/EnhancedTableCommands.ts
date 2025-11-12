import { Fragment } from 'prosemirror-model';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { Transform } from 'prosemirror-transform';
import { PARAGRAPH, TABLE, TABLE_CELL, TABLE_ROW, ENHANCED_TABLE_FIGURE_BODY, ENHANCED_TABLE_FIGURE_NOTES, ENHANCED_TABLE_FIGURE } from './Constants';

export class EnhancedTableCommands extends UICommand {
  // image,table
  _nodeType: string;

  constructor(type: string) {
    super();
    this._nodeType = type;
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
        tr = this.insertEnhancedTableFigure(tr, schema);

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
  insertEnhancedTableFigure(tr, schema) {
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
    const bodyNode = bodyType.create({}, Fragment.from(tableNode));

    // No notes by default.

    // Create a blank CAPCO (footer) node.
    const capcoType = schema.nodes.enhanced_table_figure_capco;
    const capcoNode = capcoType.create({}, schema.text(' '));

    // Assemble the composite in the order: [body, (notes optional), capco]
    const content = Fragment.fromArray([bodyNode, capcoNode]);
    const figureNode = figureNodeType.create({ figureType: 'table', orientation: 'landscape' }, content);

    // Insert the figure node at the current selection.
    tr = tr.insert(from, figureNode);


    const para = schema.nodes.paragraph.createAndFill();
    if (para) {
      const after = from + figureNode.nodeSize;
      tr = tr.insert(after, para);
      tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
    }

    return tr;
  }


  createBlueTable(schema, rows, cols) {
    const { nodes } = schema;
    const cell = nodes[TABLE_CELL];
    const paragraph = nodes[PARAGRAPH];
    const row = nodes[TABLE_ROW];
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

export function addNotesCommand(tr, schema, pos) {
  const node = tr.doc.nodeAt(pos);
  if (!node || node.type.name !== ENHANCED_TABLE_FIGURE) return tr;

  // Check if notes already exist.
  let notesExists = false;
  const children = [];
  const paragraph = schema.nodes.paragraph.create(
    {},
    schema.text('\u200B') // optional placeholder
  );

  node.forEach((child) => {
    children.push(child);
    if (child.type.name === ENHANCED_TABLE_FIGURE_NOTES) {
      notesExists = true;
    }
  });
  if (notesExists) return tr;

  // Create a blank notes node (with a zero-width space placeholder).
  const notesType = schema.nodes.enhanced_table_figure_notes;
  const notesNode = notesType.create({}, paragraph);

  // Insert the notes node after the body.
  const newChildren = [];
  let inserted = false;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    newChildren.push(child);
    if (!inserted && child.type.name === ENHANCED_TABLE_FIGURE_BODY) {
      newChildren.push(notesNode);
      inserted = true;
    }
  }

  const newNode = node.type.create(node.attrs, Fragment.fromArray(newChildren));
  return tr.replaceWith(pos, pos + node.nodeSize, newNode);
}
