/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import {Schema, Node as PMNode} from 'prosemirror-model';
import {EditorState, TextSelection, NodeSelection} from 'prosemirror-state';
import {CellSelection, TableMap} from 'prosemirror-tables';
import findActionableCell from './findActionableCell';
import {findParentNodeOfType} from 'prosemirror-utils';

// Mock the Prosemirror-utils helper used internally
// NOTE: We are using a global mock definition since you didn't provide the import for findParentNodeOfType
jest.mock('prosemirror-utils', () => ({
  findParentNodeOfType: jest.fn(() => jest.fn()),
}));

/* -------------------------
    Minimal schema with table support (Base Schema)
    ------------------------- */
const schema = new Schema({
  nodes: {
    doc: {content: 'block+'},
    text: {group: 'inline'},
    paragraph: {
      content: 'inline*',
      group: 'block',
      toDOM: () => ['p', 0],
    },
    table: {
      content: 'tableRow+',
      group: 'block',
      tableRole: 'table',
      toDOM: () => ['table', 0],
    },
    tableRow: {
      content: '(tableCell | tableHeader)+',
      tableRole: 'row',
      toDOM: () => ['tr', 0],
    },
    tableCell: {
      content: 'paragraph+',
      group: 'block',
      tableRole: 'cell',
      toDOM: () => ['td', 0],
    },
    tableHeader: {
      content: 'paragraph+',
      group: 'block',
      tableRole: 'header',
      toDOM: () => ['th', 0],
    },
  },
});

function buildParagraph(
  text: string = '',
  targetSchema: Schema = schema
): PMNode {
  const contentText = text === '' ? ' ' : text;
  return targetSchema.nodes.paragraph.create(
    null,
    targetSchema.text(contentText)
  );
}

function buildTable(): PMNode {
  return schema.nodes.table.create(null, [
    schema.nodes.tableRow.create(null, [
      schema.nodes.tableCell.create(null, buildParagraph('A')),
      schema.nodes.tableCell.create(null, buildParagraph('B')),
    ]),
    schema.nodes.tableRow.create(null, [
      schema.nodes.tableCell.create(null, buildParagraph('C')),
      schema.nodes.tableCell.create(null, buildParagraph('D')),
    ]),
  ]);
}

describe('findActionableCell', () => {
  let doc: PMNode;
  let cellStarts: number[];

  const createMockCellSelection = (tableNode: PMNode): CellSelection => {
    const selection = Object.create(CellSelection.prototype) as CellSelection;
    const firstRow = tableNode.firstChild;
    const firstCell = firstRow?.firstChild;
    const selectionWithProps = selection as unknown as {
      $anchorCell: {
        start: (depth?: number) => number;
        node: (depth?: number) => PMNode;
      };
      forEachCell: (f: (cell: PMNode, cellPos: number) => void) => void;
    };
    selectionWithProps.$anchorCell = {
      start: () => 0,
      node: () => tableNode,
    };
    selectionWithProps.forEachCell = (f) => {
      if (firstCell) {
        f(firstCell, 1);
      }
    };
    return selection;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    doc = schema.node('doc', null, [buildParagraph(''), buildTable()]);
    cellStarts = [];
    doc.descendants((node, pos) => {
      if (
        node.type === schema.nodes.tableCell ||
        node.type === schema.nodes.tableHeader
      ) {
        cellStarts.push(pos);
      }
    });
  });

  test('returns null when tableCell and tableHeader are missing in schema', () => {
    const fakeSchema = new Schema({
      nodes: {
        doc: {content: 'block+'},
        paragraph: {content: 'inline*', group: 'block'},
        text: {group: 'inline'},
      },
    });
    const doc = fakeSchema.node('doc', null, [
      fakeSchema.nodes.paragraph.create(null, fakeSchema.text('Hello')),
    ]);
    const selection = TextSelection.create(doc, 1);
    const state = EditorState.create({doc, selection});

    expect(findActionableCell(state)).toBeNull();
  });

  test('returns null for TextSelection with non-collapsed range', () => {
    const selection = TextSelection.create(doc, 2, 4);
    const state = EditorState.create({doc, selection});
    expect(findActionableCell(state)).toBeNull();
  });

  test('returns null for non-TextSelection and non-CellSelection (NodeSelection)', () => {
    const tablePos = 3;
    const nodeSel = NodeSelection.create(doc, tablePos);
    const state = EditorState.create({doc, selection: nodeSel});

    expect(findActionableCell(state)).toBeNull();
  });
  test('covers (tdType && findParentNodeOfType(tdType)(selection))', () => {
    const doc = schema.node('doc', null, [buildTable()]);
    const selection = TextSelection.create(doc, 6); // cursor inside first cell
    const state = EditorState.create({doc, selection});

    findActionableCell(state);

    // Assert that findParentNodeOfType was called with tdType
    expect(findParentNodeOfType).toHaveBeenCalledWith(schema.nodes.tableCell);
  });

  test('table contains expected number of cells', () => {
    expect(cellStarts.length).toBeGreaterThan(0);
  });

  test('returns actionable cell for CellSelection', () => {
    const tableNode = buildTable();
    doc = schema.node('doc', null, [buildParagraph(''), tableNode]);
    const selection = createMockCellSelection(tableNode);
    const mapSpy = jest
      .spyOn(TableMap, 'get')
      .mockReturnValue({
        findCell: () => ({
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }),
      } as unknown as TableMap);
    const state = {doc, selection, schema} as unknown as EditorState;
    const result = findActionableCell(state);
    expect(result).not.toBeNull();
    expect(result?.pos).toBeGreaterThan(0);
    mapSpy.mockRestore();
  });

  test('returns actionable cell for TextSelection when parent cell found', () => {
    const tableNode = buildTable();
    doc = schema.node('doc', null, [buildParagraph(''), tableNode]);
    const mockSelection = createMockCellSelection(tableNode);
    jest
      .spyOn(CellSelection, 'create')
      .mockReturnValue(mockSelection);
    const mapSpy = jest
      .spyOn(TableMap, 'get')
      .mockReturnValue({
        findCell: () => ({
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }),
      } as unknown as TableMap);
    const firstCellPos = 1;
    (findParentNodeOfType as jest.Mock).mockImplementation(() => () => ({
      pos: firstCellPos,
    }));
    const selection = TextSelection.create(doc, firstCellPos + 1);
    const state = EditorState.create({doc, selection});
    const result = findActionableCell(state);
    expect(result).not.toBeNull();
    expect(result?.pos).toBeGreaterThan(0);
    mapSpy.mockRestore();
  });

  test('returns null when CellSelection has no cells', () => {
    const tableNode = buildTable();
    doc = schema.node('doc', null, [buildParagraph(''), tableNode]);
    const selection = Object.create(CellSelection.prototype) as CellSelection;
    const selectionWithProps = selection as unknown as {
      $anchorCell: {
        start: (depth?: number) => number;
        node: (depth?: number) => PMNode;
      };
      forEachCell: (f: (cell: PMNode, cellPos: number) => void) => void;
    };
    selectionWithProps.$anchorCell = {
      start: () => 0,
      node: () => tableNode,
    };
    selectionWithProps.forEachCell = () => {};
    const state = {doc, selection, schema} as unknown as EditorState;
    const result = findActionableCell(state);
    expect(result).toBeNull();
  });

  test('selects the top-right cell when multiple cells are present', () => {
    const tableNode = buildTable();
    doc = schema.node('doc', null, [buildParagraph(''), tableNode]);
    const selection = Object.create(CellSelection.prototype) as CellSelection;
    const selectionWithProps = selection as unknown as {
      $anchorCell: {
        start: (depth?: number) => number;
        node: (depth?: number) => PMNode;
      };
      forEachCell: (f: (cell: PMNode, cellPos: number) => void) => void;
    };
    selectionWithProps.$anchorCell = {
      start: () => 0,
      node: () => tableNode,
    };
    const firstCell = tableNode.firstChild?.firstChild;
    const secondCell = tableNode.firstChild?.child(1);
    selectionWithProps.forEachCell = (f) => {
      if (firstCell) {
        f(firstCell, 1);
      }
      if (secondCell) {
        f(secondCell, 2);
      }
    };
    const mapSpy = jest
      .spyOn(TableMap, 'get')
      .mockReturnValue({
        findCell: (pos: number) => ({
          left: pos === 1 ? 0 : 1,
          top: 0,
          right: 0,
          bottom: 0,
        }),
      } as unknown as TableMap);

    const state = {doc, selection, schema} as unknown as EditorState;
    const result = findActionableCell(state);
    expect(result?.pos).toBe(2);
    mapSpy.mockRestore();
  });
});
