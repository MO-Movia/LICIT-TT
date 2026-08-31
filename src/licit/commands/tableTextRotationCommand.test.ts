/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Editor} from '@tiptap/core';
import {StarterKit} from '@tiptap/starter-kit';
import {Table} from '@tiptap/extension-table';
import {TableRow} from '@tiptap/extension-table-row';
import {CellSelection} from 'prosemirror-tables';

import {TableCellEx} from '../extensions/tableCellEx';
import {TableHeaderEx} from '../extensions/tableHeaderEx';
import TableTextRotationCommand from './tableTextRotationCommand';

describe('TableTextRotationCommand', () => {
  let editor: Editor;
  let command: TableTextRotationCommand;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, Table, TableRow, TableHeaderEx, TableCellEx],
      content:
        '<table><tr><th>Header</th><td>Body</td></tr></table><p>Outside</p>',
    });
    command = new TableTextRotationCommand();
  });

  afterEach(() => editor.destroy());

  function getCellPositions(): number[] {
    const positions: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.spec.tableRole === 'cell' || node.type.spec.tableRole === 'header_cell') {
        positions.push(pos);
      }
    });
    return positions;
  }

  it('toggles clockwise rotation for the current cell', () => {
    const [cellPos] = getCellPositions();
    editor.commands.setTextSelection(cellPos + 1);

    expect(command.isEnabled(editor.state)).toBe(true);
    expect(command.isActive(editor.state)).toBe(false);
    expect(command.execute(editor.state, editor.view.dispatch)).toBe(true);
    expect(editor.state.doc.nodeAt(cellPos)?.attrs.textRotation).toBe(
      'clockwise'
    );
    expect(command.isActive(editor.state)).toBe(true);

    expect(command.execute(editor.state, editor.view.dispatch)).toBe(true);
    expect(editor.state.doc.nodeAt(cellPos)?.attrs.textRotation).toBeNull();
  });

  it('applies rotation to every selected cell', () => {
    const [headerPos, cellPos] = getCellPositions();
    editor.view.dispatch(
      editor.state.tr.setSelection(
        CellSelection.create(editor.state.doc, headerPos, cellPos)
      )
    );

    expect(command.execute(editor.state, editor.view.dispatch)).toBe(true);
    expect(editor.state.doc.nodeAt(headerPos)?.attrs.textRotation).toBe(
      'clockwise'
    );
    expect(editor.state.doc.nodeAt(cellPos)?.attrs.textRotation).toBe(
      'clockwise'
    );
    expect(command.isActive(editor.state)).toBe(true);
  });

  it('is disabled outside a table', () => {
    const outsidePos = editor.state.doc.content.size - 2;
    editor.commands.setTextSelection(outsidePos);

    expect(command.isEnabled(editor.state)).toBe(false);
    expect(command.isActive(editor.state)).toBe(false);
    expect(command.execute(editor.state, editor.view.dispatch)).toBe(false);
  });
});
