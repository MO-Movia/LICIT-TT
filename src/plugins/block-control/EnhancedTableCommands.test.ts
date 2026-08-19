/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node as ProseMirrorNode, Schema} from 'prosemirror-model';
import {
  EditorState,
  NodeSelection,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import type {EditorView} from 'prosemirror-view';
import type {SyntheticEvent} from 'react';
import {
  EnhancedTableCommands,
  addNotesCommand,
  convertEnhancedTableFigureToLandscape,
  convertEnhancedTableFigureToPortrait,
  isEnhancedTableFigureInLandscape,
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
    content: 'enhanced_table_figure_table',
    toDOM: () => ['div', 0],
    parseDOM: [{tag: 'div'}],
  },
  enhanced_table_figure_table: {
    content: 'table',
    group: 'block',
    isolating: true,
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
  landscape_section: {
    attrs: {class: {default: 'section-landscape'}},
    content: 'block+',
    group: 'block',
    toDOM: () => ['section', 0],
    parseDOM: [{tag: 'section'}],
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

  test('execute inserts enhanced table figure', () => {
    const dispatch = jest.fn();
    const view = {focus: jest.fn()} as unknown as EditorView;

    command.execute(state, dispatch, view);

    expect(dispatch).toHaveBeenCalled();
    expect(view.focus).toHaveBeenCalled();
  });

  test('insertEnhancedTableFigure returns unchanged tr when selection is not empty', () => {
    const state = EditorState.create({schema});
    let tr = state.tr;
    const selection = TextSelection.create(state.doc, 0, 1);
    tr = tr.setSelection(selection); // works now

    const result = command.insertEnhancedTableFigure(tr, schema);
    expect(result).toBe(tr); // unchanged when selection is not empty
  });

  test('createBlueTable creates a table node', () => {
    const tableNode = command.createBlueTable(schema, 2, 2);
    expect(tableNode?.type.name).toBe('table');
    expect(tableNode?.childCount).toBe(2);
  });

  test('inserts the table inside the dedicated EIC table payload', () => {
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, schema.nodes.paragraph.create()),
      schema,
    });
    const tr = command.insertEnhancedTableFigure(state.tr, schema);
    const figure = tr.doc.firstChild;

    expect(figure.type.name).toBe('enhanced_table_figure');
    expect(figure.firstChild.firstChild.type.name).toBe(
      'enhanced_table_figure_table'
    );
    expect(figure.firstChild.firstChild.firstChild.type.name).toBe('table');
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

describe('EIC landscape conversion', () => {
  it('wraps a portrait EIC and selects the converted figure', () => {
    const figure = createEicFigure();
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, figure),
      schema,
    });

    const tr = convertEnhancedTableFigureToLandscape(state.tr, schema, 0);
    const figurePos = findNodePosition(tr.doc, 'enhanced_table_figure');

    expect(tr.doc.firstChild.type.name).toBe('landscape_section');
    expect(isEnhancedTableFigureInLandscape(tr.doc, figurePos)).toBe(true);
    expect(tr.selection).toBeInstanceOf(NodeSelection);
  });

  it('unwraps a lone EIC from landscape', () => {
    const figure = createEicFigure('figure');
    const landscape = schema.nodes.landscape_section.create(
      {class: 'custom-landscape'},
      figure
    );
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, landscape),
      schema,
    });
    const figurePos = findNodePosition(state.doc, 'enhanced_table_figure');

    const tr = convertEnhancedTableFigureToPortrait(state.tr, figurePos);

    expect(tr.doc.firstChild.type.name).toBe('enhanced_table_figure');
    expect(tr.doc.firstChild.attrs.figureType).toBe('figure');
  });

  it('preserves landscape siblings and moves the EIC after their section', () => {
    const landscape = schema.nodes.landscape_section.create(
      {class: 'custom-landscape'},
      [
        schema.nodes.paragraph.create({}, schema.text('Before')),
        createEicFigure(),
        schema.nodes.paragraph.create({}, schema.text('After')),
      ]
    );
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, landscape),
      schema,
    });

    const tr = convertEnhancedTableFigureToPortrait(
      state.tr,
      findNodePosition(state.doc, 'enhanced_table_figure')
    );

    expect(tr.doc.childCount).toBe(2);
    expect(tr.doc.firstChild.attrs.class).toBe('custom-landscape');
    expect(tr.doc.firstChild.textContent).toBe('BeforeAfter');
    expect(tr.doc.child(1).type.name).toBe('enhanced_table_figure');
  });

  it('does not re-convert an EIC already in the requested orientation', () => {
    const figure = createEicFigure();
    const portraitState = EditorState.create({
      doc: schema.nodes.doc.create({}, figure),
      schema,
    });
    const landscapeState = EditorState.create({
      doc: schema.nodes.doc.create(
        {},
        schema.nodes.landscape_section.create({}, figure)
      ),
      schema,
    });

    expect(
      convertEnhancedTableFigureToPortrait(portraitState.tr, 0).steps
    ).toHaveLength(0);
    expect(
      convertEnhancedTableFigureToLandscape(
        landscapeState.tr,
        schema,
        findNodePosition(landscapeState.doc, 'enhanced_table_figure')
      ).steps
    ).toHaveLength(0);
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
      schema.nodes.enhanced_table_figure_table.create({}, tableNode)
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
      schema.nodes.enhanced_table_figure_table.create({}, tableNode)
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

function createEicFigure(figureType = 'table'): ProseMirrorNode {
  const table = schema.nodes.table.createAndFill();
  const tablePayload = schema.nodes.enhanced_table_figure_table.create(
    {},
    table
  );
  const body = schema.nodes.enhanced_table_figure_body.create(
    {},
    tablePayload
  );
  const capco = schema.nodes.enhanced_table_figure_capco.create(
    {},
    schema.text('CAPCO')
  );
  return schema.nodes.enhanced_table_figure.create(
    {figureType},
    [body, capco]
  );
}

function findNodePosition(doc: ProseMirrorNode, typeName: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found < 0 && node.type.name === typeName) {
      found = pos;
      return false;
    }
    return true;
  });
  return found;
}
