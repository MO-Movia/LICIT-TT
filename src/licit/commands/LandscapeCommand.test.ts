/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import {LandscapeCommand} from './LandscapeCommand';
import LandscapeSectionNodeSpec from '../specs/landscapeSectionNodeSpec';

describe('LandscapeCommand', () => {
  let schema: Schema;

  beforeEach(() => {
    schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { content: 'text*', group: 'block' },
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
          content: 'block+',
          tableRole: 'cell',
        },
        landscape_section: LandscapeSectionNodeSpec,
        text: { group: 'inline' },
      },
      marks: {},
    });
  });

  test('inserts empty landscape section for collapsed selection', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Hello')]),
    ]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 2),
    });
    const command = new LandscapeCommand();
    let applied: Transaction | null = null;

    const handled = command.execute(state, (tr) => {
      applied = tr;
    });

    expect(handled).toBe(true);
    expect(applied).toBeTruthy();
    expect(applied.doc.childCount).toBe(2);
    expect(applied.doc.child(1).type.name).toBe('landscape_section');
    expect(applied.doc.child(1).child(0).type.name).toBe('paragraph');
    expect(applied.doc.child(1).child(0).content.size).toBe(0);
  });

  test('wraps selected content in landscape section', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Hello')]),
    ]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 1, 6),
    });
    const command = new LandscapeCommand();
    let applied: Transaction | null = null;

    const handled = command.execute(state, (tr) => {
      applied = tr;
    });

    expect(handled).toBe(true);
    expect(applied).toBeTruthy();
    expect(applied.doc.child(0).type.name).toBe('landscape_section');
  });

  test('wraps the entire table when cursor is inside a table cell', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Before')]),
      schema.node('table', null, [
        schema.node('table_row', null, [
          schema.node('table_cell', null, [
            schema.node('paragraph', null, [schema.text('Cell')]),
          ]),
        ]),
      ]),
    ]);

    let cursorPos = -1;
    doc.descendants((node, pos) => {
      if (node.isText && node.text === 'Cell') {
        cursorPos = pos + 1;
        return false;
      }
      return true;
    });

    expect(cursorPos).toBeGreaterThan(0);

    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, cursorPos),
    });
    const command = new LandscapeCommand();
    let applied: Transaction | null = null;

    const handled = command.execute(state, (tr) => {
      applied = tr;
    });

    expect(handled).toBe(true);
    expect(applied).toBeTruthy();
    expect(applied.doc.child(1).type.name).toBe('landscape_section');
    expect(applied.doc.child(1).child(0).type.name).toBe('table');
  });

  test('returns false when landscape_section node is unavailable in schema', () => {
    const schemaWithoutLandscape = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { content: 'text*', group: 'block' },
        text: { group: 'inline' },
      },
      marks: {},
    });

    const doc = schemaWithoutLandscape.node('doc', null, [
      schemaWithoutLandscape.node('paragraph', null, [
        schemaWithoutLandscape.text('Hello'),
      ]),
    ]);

    const state = EditorState.create({
      schema: schemaWithoutLandscape,
      doc,
      selection: TextSelection.create(doc, 2),
    });

    const command = new LandscapeCommand();
    const dispatch = jest.fn();

    expect(command.execute(state, dispatch)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('unwraps an existing landscape section when selection is inside', () => {
    const doc = schema.node('doc', null, [
      schema.node('landscape_section', null, [
        schema.node('paragraph', null, [schema.text('Hello')]),
      ]),
    ]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 2),
    });
    const command = new LandscapeCommand();
    let applied: Transaction | null = null;

    const handled = command.execute(state, (tr) => {
      applied = tr;
    });

    expect(handled).toBe(true);
    expect(applied).toBeTruthy();
    expect(applied?.doc.child(0).type.name).toBe('paragraph');
  });

  test('isActive returns true when inside landscape section', () => {
    const doc = schema.node('doc', null, [
      schema.node('landscape_section', null, [
        schema.node('paragraph', null, [schema.text('Hi')]),
      ]),
    ]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 2),
    });
    const command = new LandscapeCommand();
    expect(command.isActive(state)).toBe(true);
  });

  test('returns false when paragraph node is missing', () => {
    const schemaWithoutParagraph = new Schema({
      nodes: {
        doc: {content: 'text*'},
        landscape_section: LandscapeSectionNodeSpec,
        text: {group: 'inline'},
      },
      marks: {},
    });
    const doc = schemaWithoutParagraph.node('doc', null, [
      schemaWithoutParagraph.text('Hello'),
    ]);
    const state = EditorState.create({
      schema: schemaWithoutParagraph,
      doc,
      selection: TextSelection.create(doc, 1),
    });
    const command = new LandscapeCommand();
    const dispatch = jest.fn();
    expect(command.execute(state, dispatch)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('returns false when landscape section cannot be inserted', () => {
    const limitedSchema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {content: 'text*', group: 'block'},
        landscape_section: LandscapeSectionNodeSpec,
        text: {group: 'inline'},
      },
      marks: {},
    });
    const doc = limitedSchema.node('doc', null, [
      limitedSchema.node('paragraph', null, [limitedSchema.text('Hello')]),
    ]);
    const state = EditorState.create({
      schema: limitedSchema,
      doc,
      selection: TextSelection.create(doc, 2),
    });
    const command = new LandscapeCommand();
    const dispatch = jest.fn();
    expect(command.execute(state, dispatch)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('returns false when table cannot be wrapped', () => {
    const tableSchema = new Schema({
      nodes: {
        doc: {content: 'table+'},
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
          content: 'paragraph+',
          tableRole: 'cell',
        },
        paragraph: {content: 'text*', group: 'block'},
        landscape_section: LandscapeSectionNodeSpec,
        text: {group: 'inline'},
      },
      marks: {},
    });
    const doc = tableSchema.node('doc', null, [
      tableSchema.node('table', null, [
        tableSchema.node('table_row', null, [
          tableSchema.node('table_cell', null, [
            tableSchema.node('paragraph', null, [tableSchema.text('Cell')]),
          ]),
        ]),
      ]),
    ]);
    let pos = -1;
    doc.descendants((node, p) => {
      if (node.isText) {
        pos = p + 1;
        return false;
      }
      return true;
    });
    if (pos < 0) {
      pos = 1;
    }
    const state = EditorState.create({
      schema: tableSchema,
      doc,
      selection: TextSelection.create(doc, pos),
    });
    const command = new LandscapeCommand();
    const dispatch = jest.fn();
    expect(command.execute(state, dispatch)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

});
