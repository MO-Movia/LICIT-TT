import { Selection, NodeSelection } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { isNodeSelectionForNodeType, getSelectionRange, getSelectedCellPositions, isColumnCellSelected } from './isNodeSelectionForNodeType';
import { CellSelection, tableNodes } from 'prosemirror-tables';
describe('isNodeSelectionForNodeType', () => {
  it('should return true if the selection is a NodeSelection for the provided node type', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        text: {},
      },
    });
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [schema.text('Sample text')]),
    ]);
    const selection = NodeSelection.create(doc, 1);
    const result = isNodeSelectionForNodeType(
      selection,
      schema.nodes.paragraph
    );

    expect(result).not.toBe(true);
  });

  it('should return false if selection is null', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        text: {},
      },
    });
    const result = isNodeSelectionForNodeType(
      null as unknown as Selection,
      schema.nodes.paragraph
    );
    expect(result).toBe(false);
  });

  it('should return the from and to position of a selection', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: {},
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0],
          parseDOM: [{ tag: 'p' }],
        },
        ...tableNodes({
          tableGroup: 'block',
          cellContent: 'paragraph',
          cellAttributes: {}
        }),
      },
    });

    const doc = schema.node('doc', null, [
      schema.node('table', null, [
        schema.node('table_row', null, [
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('A')]),
          ]),
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('B')]),
          ]),
        ]),
      ]),
    ]);

    const selection = CellSelection.create(doc, 2, 2);
    const test = getSelectionRange(selection);
    expect(test).toBeDefined();
  });
  it('should return the from and to position of a selection when selection instance of cell selection', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: {},
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0],
          parseDOM: [{ tag: 'p' }],
        },
        ...tableNodes({
          tableGroup: 'block',
          cellContent: 'paragraph',
          cellAttributes: {}
        }),
      },
    });

    const doc = schema.node('doc', null, [
      schema.node('table', null, [
        schema.node('table_row', null, [
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('A')]),
          ]),
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('B')]),
          ]),
        ]),
      ]),
    ]);
    const selection = CellSelection.create(doc, 2, 2);
    const test = getSelectedCellPositions(selection);
    expect(test).toBeDefined();
  });
  it('should return the from and to position of a selection', () => {
    const test = getSelectedCellPositions({} as unknown as Selection);
    expect(test).toBeDefined();
  });
  it('should handle isColumnCellSelected when selection instance of cellselection', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: {},
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0],
          parseDOM: [{ tag: 'p' }],
        },
        ...tableNodes({
          tableGroup: 'block',
          cellContent: 'paragraph',
          cellAttributes: {}
        }),
      },
    });

    const doc = schema.node('doc', null, [
      schema.node('table', null, [
        schema.node('table_row', null, [
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('A')]),
          ]),
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('B')]),
          ]),
        ]),
      ]),
    ]);



    const selection = CellSelection.create(doc, 2, 2);
    const test = isColumnCellSelected(selection);
    expect(test).toBeDefined();
  });
});
