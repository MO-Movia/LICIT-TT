/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Schema, Node as ProseMirrorNode} from 'prosemirror-model';
import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';

import {LicitTableNodeView} from './tableNodeView';

jest.mock('prosemirror-tables', () => ({
  TableView: class {
    dom: HTMLElement;
    table: HTMLElement;

    constructor() {
      this.table = document.createElement('table');
      this.dom = document.createElement('div');
      this.dom.appendChild(this.table);
    }

    update(): boolean {
      return true;
    }

    ignoreMutation(): boolean {
      return false;
    }
  },
}));

describe('LicitTableNodeView', () => {
  const schema = new Schema({
    nodes: {
      doc: {content: 'block+'},
      text: {group: 'inline'},
      paragraph: {content: 'inline*', group: 'block'},
      table: {
        content: 'table_row+',
        group: 'block',
        tableRole: 'table',
      },
      table_row: {
        content: 'table_cell+',
        tableRole: 'row',
      },
      table_cell: {
        content: 'paragraph',
        tableRole: 'cell',
      },
      enhanced_table_figure: {
        content: 'enhanced_table_figure_body',
        group: 'block',
      },
      enhanced_table_figure_body: {
        content: 'block+',
        group: 'block',
      },
    },
  });

  it('does not render a table hamburger inside enhanced table figure', () => {
    const tableNode = createTableNode();
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.enhanced_table_figure.create(null, [
        schema.nodes.enhanced_table_figure_body.create(null, [tableNode]),
      ]),
    ]);
    const tableView = new LicitTableNodeView(
      tableNode,
      100,
      createEditorView(doc)
    );

    expect(tableView.dom.classList.contains('has-hover-handle')).toBe(false);
    expect(
      tableView.dom.querySelector('[aria-label="Table options"]')
    ).toBeNull();
  });

  it('keeps the table hamburger outside enhanced table figure', () => {
    const tableNode = createTableNode();
    const doc = schema.nodes.doc.create(null, [tableNode]);
    const tableView = new LicitTableNodeView(
      tableNode,
      100,
      createEditorView(doc)
    );

    expect(tableView.dom.classList.contains('has-hover-handle')).toBe(true);
    expect(
      tableView.dom.querySelector('[aria-label="Table options"]')
    ).not.toBeNull();
  });

  function createTableNode(): ProseMirrorNode {
    return schema.nodes.table.create(null, [
      schema.nodes.table_row.create(null, [
        schema.nodes.table_cell.create(null, [
          schema.nodes.paragraph.create(),
        ]),
      ]),
    ]);
  }

  function createEditorView(doc: ProseMirrorNode): EditorView {
    return {
      state: EditorState.create({doc, schema}),
      posAtDOM: () => 1,
    } as unknown as EditorView;
  }
});
