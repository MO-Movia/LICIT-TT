/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Schema} from 'prosemirror-model';
import {
  EditorState,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import type {EditorView} from 'prosemirror-view';
import type {SyntheticEvent} from 'react';
import {
  EnhancedTableCommands,
  addNotesCommand,
  removeEmptyNotesCommand,
} from './EnhancedTableCommands';
import {schema as basicSchema} from 'prosemirror-schema-basic';
import {p} from 'jest-prosemirror';

// Extend the basic schema with necessary nodes
const nodes = basicSchema.spec.nodes.append({
  enhanced_table_figure: {
    group: 'block',
    content:
      'enhanced_table_figure_body enhanced_table_figure_notes? enhanced_table_figure_capco',
    attrs: {
      figureType: {default: 'table'},
      orientation: {default: 'landscape'},
    },
    toDOM: () => ['div', 0],
    parseDOM: [{tag: 'div'}],
  },
  enhanced_table_figure_body: {
    content: 'table',
    toDOM: () => ['div', 0],
    parseDOM: [{tag: 'div'}],
  },
  enhanced_table_figure_notes: {
    content: 'text*',
    toDOM: () => ['div', 0],
    parseDOM: [{tag: 'div'}],
  },
  enhanced_table_figure_capco: {
    content: 'text*',
    toDOM: () => ['div', 0],
    parseDOM: [{tag: 'div'}],
  },
  table: {
    content: 'tableRow+',
    tableRole: 'table',
    toDOM: () => ['table', 0],
    parseDOM: [{tag: 'table'}],
  },
  tableRow: {
    content: 'tableCell+',
    tableRole: 'row',
    toDOM: () => ['tr', 0],
    parseDOM: [{tag: 'tr'}],
  },
  tableCell: {
    content: 'paragraph+',
    attrs: {background: {default: null}},
    tableRole: 'cell',
    toDOM: (node) => [
      'td',
      {
        style: node.attrs.background
          ? `background:${node.attrs.background}`
          : '',
      },
      0,
    ],
    parseDOM: [{tag: 'td'}],
  },
});

const schema = new Schema({nodes, marks: basicSchema.spec.marks});

describe('EnhancedTableCommands', () => {
  let command: EnhancedTableCommands;
  let state: EditorState;

  beforeEach(() => {
    command = new EnhancedTableCommands('table');
    const docNode = p('Hello World');
    state = EditorState.create({doc: docNode, schema});
  });

  test('isEnabled returns true', () => {
    expect(command.isEnabled(state)).toBe(true);
  });

  test('executeCustomStyleForTable returns tr', () => {
    const mockTr = {} as Transaction;
    expect(command.executeCustomStyleForTable(state, mockTr, 0, 0)).toBe(
      mockTr
    );
  });

  test('executeCustom returns tr', () => {
    const mockTr = {} as Transaction;
    expect(command.executeCustom(state, mockTr, 0, 0)).toBe(mockTr);
  });

  test('execute inserts enhanced table figure', () => {
    const dispatch = jest.fn();
    const view = {focus: jest.fn()} as unknown as EditorView;

    command.execute(state, dispatch, view);

    expect(dispatch).toHaveBeenCalled();
    expect(view.focus).toHaveBeenCalled();
  });

  test('execute returns true without dispatch', () => {
    expect(command.execute(state)).toBe(true);
  });

  test('execute dispatches unchanged transaction for non-table commands', () => {
    const otherCommand = new EnhancedTableCommands('image');
    const dispatch = jest.fn();

    otherCommand.execute(state, dispatch);

    expect(dispatch).toHaveBeenCalledWith(state.tr);
  });

  test('insertEnhancedTableFigure returns unchanged tr when selection is not empty', () => {
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Hello')),
      ]),
      schema,
    });
    let tr = state.tr;
    const selection = TextSelection.create(state.doc, 1, 2);
    tr = tr.setSelection(selection); // works now

    const result = command.insertEnhancedTableFigure(tr, schema);
    expect(result).toBe(tr); // unchanged when selection is not empty
  });

  test('createBlueTable creates a table node', () => {
    const tableNode = command.createBlueTable(schema, 2, 2);
    expect(tableNode?.type.name).toBe('table');
    expect(tableNode?.childCount).toBe(2);
    expect(tableNode?.child(0).child(0).attrs.background).toBe('#abdbe3');
    expect(tableNode?.child(1).child(0).attrs.background).toBeNull();
  });

  test('createBlueTable returns undefined when schema does not include table nodes', () => {
    const basicOnlySchema = new Schema({
      nodes: basicSchema.spec.nodes,
      marks: basicSchema.spec.marks,
    });

    expect(command.createBlueTable(basicOnlySchema, 2, 2)).toBeUndefined();
  });

  test('waitForUserInput resolves to undefined', async () => {
    const result = await command.waitForUserInput(
      state,
      () => {},
      {} as EditorView,
      {} as SyntheticEvent<Element, Event>
    );
    expect(result).toBeUndefined();
  });

  test('executeWithUserInput returns false', () => {
    const result = command.executeWithUserInput(state, () => {}, {} as EditorView, '');
    expect(result).toBe(false);
  });

  test('cancel returns null', () => {
    expect(command.cancel()).toBeNull();
  });
});

describe('addNotesCommand', () => {
  let state: EditorState;
  let tr: Transform;
  let pos: number;

  beforeEach(() => {
    const tableNode = schema.nodes.table.createAndFill();
    const bodyNode = schema.nodes.enhanced_table_figure_body.create(
      {},
      tableNode
    );
    const capcoNode = schema.nodes.enhanced_table_figure_capco.create(
      {},
      schema.text('Footer')
    );
    const figureNode = schema.nodes.enhanced_table_figure.create({}, [
      bodyNode,
      capcoNode,
    ]);

    const docNode = schema.nodes.doc.create({}, [figureNode]);
    state = EditorState.create({doc: docNode, schema});
    tr = new Transform(state.doc);
    pos = 0;
  });

  test('adds notes when not present', () => {
    const result = addNotesCommand(tr, schema, pos);
    const newNode = result.doc.nodeAt(pos);
    expect(newNode.childCount).toBe(3);
    expect(newNode.child(1).type.name).toBe('enhanced_table_figure_notes');
  });

  test('does not add notes when already present', () => {
    const notesNode = schema.nodes.enhanced_table_figure_notes.create(
      {},
      schema.text('Note')
    );
    const tableNode = schema.nodes.table.createAndFill();
    const bodyNode = schema.nodes.enhanced_table_figure_body.create(
      {},
      tableNode
    );
    const capcoNode = schema.nodes.enhanced_table_figure_capco.create(
      {},
      schema.text('Footer')
    );
    const figureNode = schema.nodes.enhanced_table_figure.create({}, [
      bodyNode,
      notesNode,
      capcoNode,
    ]);

    const docNode = schema.nodes.doc.create({}, [figureNode]);
    state = EditorState.create({doc: docNode, schema});
    tr = new Transform(state.doc);

    const result = addNotesCommand(tr, schema, pos);
    expect(result).toBe(tr);
  });

  test('returns original tr when node is not enhanced_table_figure', () => {
    const docNode = schema.nodes.doc.create({}, [
      schema.nodes.paragraph.create(),
    ]);
    state = EditorState.create({doc: docNode, schema});
    tr = new Transform(state.doc);

    const result = addNotesCommand(tr, schema, pos);
    expect(result).toBe(tr);
  });
});

describe('removeEmptyNotesCommand', () => {
  function createStateWithNotes(text: string): EditorState {
    const tableNode = schema.nodes.table.createAndFill();
    const bodyNode = schema.nodes.enhanced_table_figure_body.create(
      {},
      tableNode
    );
    const notesNode = schema.nodes.enhanced_table_figure_notes.create(
      {},
      schema.text(text)
    );
    const capcoNode = schema.nodes.enhanced_table_figure_capco.create(
      {},
      schema.text('Footer')
    );
    const figureNode = schema.nodes.enhanced_table_figure.create({}, [
      bodyNode,
      notesNode,
      capcoNode,
    ]);
    const docNode = schema.nodes.doc.create({}, [figureNode]);
    const state = EditorState.create({doc: docNode, schema});
    const notesPos = bodyNode.nodeSize + 1;
    const selection = TextSelection.create(state.doc, notesPos + 1);

    return state.apply(state.tr.setSelection(selection));
  }

  test('returns false when selection is not empty', () => {
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Hello')),
      ]),
      schema,
    });
    const selectedState = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1, 2))
    );

    expect(removeEmptyNotesCommand(selectedState, jest.fn())).toBe(false);
  });

  test('returns false when selection is not inside notes', () => {
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Hello')),
      ]),
      schema,
    });

    expect(removeEmptyNotesCommand(state, jest.fn())).toBe(false);
  });

  test('returns false when notes contain visible text', () => {
    const state = createStateWithNotes('Keep me');

    expect(removeEmptyNotesCommand(state, jest.fn())).toBe(false);
  });

  test('removes empty notes and dispatches the transaction', () => {
    const state = createStateWithNotes('\u200B');
    const dispatch = jest.fn();

    expect(removeEmptyNotesCommand(state, dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    expect(dispatch.mock.calls[0][0].doc.firstChild?.childCount).toBe(2);
  });

  test('removes empty notes without dispatch', () => {
    const state = createStateWithNotes('\u200B');

    expect(removeEmptyNotesCommand(state)).toBe(true);
  });
});
