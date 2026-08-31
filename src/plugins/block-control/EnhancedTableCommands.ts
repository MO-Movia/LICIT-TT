/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Fragment, Node, Schema } from 'prosemirror-model';
import {
  EditorState,
  NodeSelection,
  TextSelection,
  Selection,
  Transaction,
} from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { UICommand } from '../../core';
import { Transform } from 'prosemirror-transform';
import {
  PARAGRAPH,
  TABLE,
  TABLE_CELL,
  TABLE_ROW,
  ENHANCED_TABLE_FIGURE_BODY,
  ENHANCED_TABLE_FIGURE_NOTES,
  ENHANCED_TABLE_FIGURE,
  ENHANCED_TABLE_FIGURE_TABLE,
  LANDSCAPE_SECTION,
} from './Constants';
import {
  applyTableStyle,
  DEFAULT_TABLE_STYLE_NAME,
  TABLE_STYLE_NAME_ATTRIBUTE,
} from '../../licit/extensions/tableEx/tableStyle';

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
        tr = this.insertEnhancedTableFigure(tr, schema, state);

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
    state?: EditorState
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
    const eicTableType = schema.nodes[ENHANCED_TABLE_FIGURE_TABLE];
    if (!bodyType || !tableNode || !eicTableType) {
      return tr;
    }
    const tableWrapper = eicTableType.create({}, tableNode);
    const bodyNode = bodyType.create({}, Fragment.from(tableWrapper));

    // No notes by default.

    // Create a blank CAPCO (footer) node.
    const capcoType = schema.nodes.enhanced_table_figure_capco;
    const capcoNode = capcoType.create({}, schema.text(' '));

    // Assemble the composite in the order: [body, (notes optional), capco]
    const content = Fragment.fromArray([bodyNode, capcoNode]);
    const figureNode = figureNodeType.create({ figureType: 'table', orientation: 'landscape' }, content);

    // Insert the figure node at the current selection.
    tr = tr.insert(from, figureNode);
    if (state) {
      applyTableStyle(
        state,
        tr,
        from + 3,
        DEFAULT_TABLE_STYLE_NAME
      );
    }


    const para = schema.nodes.paragraph.createAndFill();
    if (para) {
      const after = from + figureNode.nodeSize;
      tr = tr.insert(after, para);
      tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
    }

    return tr;
  }


  createBlueTable(schema: Schema, rows: number, cols: number): Node | undefined {
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
          Fragment.fromArray([
            paragraph.create({ styleName: DEFAULT_TABLE_STYLE_NAME }),
          ])
        );
        cellNodes.push(cellNode);
      }
      const rowNode = row.create({}, Fragment.from(cellNodes));
      rowNodes.push(rowNode);
    }
    const tableNode = table.create(
      { [TABLE_STYLE_NAME_ATTRIBUTE]: DEFAULT_TABLE_STYLE_NAME },
      Fragment.from(rowNodes)
    );
    return tableNode;
  }

}

export function addNotesCommand(
  tr: Transform,
  schema: Schema,
  pos: number
): Transform {
  const node = tr.doc.nodeAt(pos);
  if (node?.type.name !== ENHANCED_TABLE_FIGURE) return tr;

  // Check if notes already exist.
  let notesExists = false;
  const children = [];
  const paragraph = schema.nodes.paragraph.create(
    { styleName: 'Normal' },
    schema.text('\u200B') // optional placeholder
  );

  for (const child of getNodeChildren(node)) {
    children.push(child);
    if (child.type.name === ENHANCED_TABLE_FIGURE_NOTES) {
      notesExists = true;
    }
  }
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

function getNodeChildren(node: Node): Node[] {
  return Array.from(
    { length: node.childCount },
    (_, index) => node.child(index)
  );
}


function findParentNotes(selection) {
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === ENHANCED_TABLE_FIGURE_NOTES) {
      return {
        node,
        pos: $from.before(depth),
      };
    }
  }

  return null;
}

function isEmptyNotesNode(node): boolean {
  return node.textContent.replaceAll('\u200B', '').trim().length === 0;
}

export function removeEmptyNotesCommand(
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean {
  const { selection } = state;
  if (!selection.empty) {
    return false;
  }

  const notes = findParentNotes(selection);
  if (!notes || !isEmptyNotesNode(notes.node)) {
    return false;
  }

  let tr = state.tr.delete(notes.pos, notes.pos + notes.node.nodeSize);
  const selectionPos = Math.min(notes.pos, tr.doc.content.size);
  tr = tr
    .setSelection(Selection.near(tr.doc.resolve(selectionPos), -1))
    .scrollIntoView();

  dispatch?.(tr);
  return true;
}

type LandscapeFigureContext = {
  figure: Node;
  figureIndex: number;
  landscape: Node;
  landscapePos: number;
};

export function isEnhancedTableFigureInLandscape(
  doc: Node,
  figurePos: number
): boolean {
  if (!isValidDocumentPosition(doc, figurePos)) {
    return false;
  }

  const $figure = doc.resolve(figurePos);
  for (let depth = $figure.depth; depth > 0; depth--) {
    if ($figure.node(depth).type.name === LANDSCAPE_SECTION) {
      return true;
    }
  }
  return false;
}

export function convertEnhancedTableFigureToLandscape(
  tr: Transaction,
  schema: Schema,
  figurePos: number
): Transaction {
  const figure = getEnhancedTableFigureAt(tr.doc, figurePos);
  const landscapeType = schema.nodes[LANDSCAPE_SECTION];
  if (
    !figure ||
    !landscapeType ||
    isEnhancedTableFigureInLandscape(tr.doc, figurePos)
  ) {
    return tr;
  }

  const $figure = tr.doc.resolve(figurePos);
  const figureIndex = $figure.index();
  if (!$figure.parent.canReplaceWith(figureIndex, figureIndex + 1, landscapeType)) {
    return tr;
  }

  const landscape = landscapeType.create(null, figure);
  tr = tr.replaceWith(figurePos, figurePos + figure.nodeSize, landscape);
  return selectConvertedFigure(tr, figurePos + 1);
}

export function convertEnhancedTableFigureToPortrait(
  tr: Transaction,
  figurePos: number
): Transaction {
  const context = getDirectLandscapeFigureContext(tr.doc, figurePos);
  if (!context) {
    return tr;
  }

  const remainingChildren: Node[] = [];
  context.landscape.forEach((child, _offset, index) => {
    if (index !== context.figureIndex) {
      remainingChildren.push(child);
    }
  });

  let replacement: Fragment;
  let convertedFigurePos = context.landscapePos;
  if (remainingChildren.length) {
    const remainingLandscape = context.landscape.copy(
      Fragment.fromArray(remainingChildren)
    );
    replacement = Fragment.fromArray([remainingLandscape, context.figure]);
    convertedFigurePos += remainingLandscape.nodeSize;
  } else {
    replacement = Fragment.from(context.figure);
  }

  const $landscape = tr.doc.resolve(context.landscapePos);
  const landscapeIndex = $landscape.index();
  if (
    !$landscape.parent.canReplace(
      landscapeIndex,
      landscapeIndex + 1,
      replacement
    )
  ) {
    return tr;
  }

  tr = tr.replaceWith(
    context.landscapePos,
    context.landscapePos + context.landscape.nodeSize,
    replacement
  );
  return selectConvertedFigure(tr, convertedFigurePos);
}

function getDirectLandscapeFigureContext(
  doc: Node,
  figurePos: number
): LandscapeFigureContext | null {
  const figure = getEnhancedTableFigureAt(doc, figurePos);
  if (!figure) {
    return null;
  }

  const $figure = doc.resolve(figurePos);
  if ($figure.parent.type.name !== LANDSCAPE_SECTION) {
    return null;
  }

  const figureIndex = $figure.index();
  if ($figure.parent.child(figureIndex) !== figure) {
    return null;
  }

  return {
    figure,
    figureIndex,
    landscape: $figure.parent,
    landscapePos: $figure.before($figure.depth),
  };
}

function getEnhancedTableFigureAt(
  doc: Node,
  figurePos: number
): Node | null {
  if (!isValidDocumentPosition(doc, figurePos)) {
    return null;
  }
  const node = doc.nodeAt(figurePos);
  return node?.type.name === ENHANCED_TABLE_FIGURE ? node : null;
}

function isValidDocumentPosition(doc: Node, pos: number): boolean {
  return Number.isInteger(pos) && pos >= 0 && pos <= doc.content.size;
}

function selectConvertedFigure(
  tr: Transaction,
  figurePos: number
): Transaction {
  return tr
    .setSelection(NodeSelection.create(tr.doc, figurePos))
    .scrollIntoView();
}
