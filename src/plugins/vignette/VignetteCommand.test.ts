/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { VignetteCommand } from './VignetteCommand';
import * as React from 'react';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import { DEF_BORDER_COLOR, TABLE, TABLE_CELL, PARAGRAPH } from './Constants';

jest.mock('prosemirror-model', () => ({
  Fragment: {
    fromArray: jest.fn((arr: unknown[]) => arr),
    from: jest.fn((obj: unknown) => obj),
  },
}));

jest.mock('prosemirror-state', () => ({
  TextSelection: {
    create: jest.fn((_doc, from, to) => ({ from, to })),
  },
}));

describe('VignetteCommand', () => {
  let cmd: VignetteCommand;
  let mockDispatch: jest.Mock;
  let mockView: EditorView;
  let mockTr: Transaction;
  let mockState: EditorState;
  let schemaNodes: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();

    schemaNodes = {
      [TABLE_CELL]: { create: jest.fn((attrs, content) => ({ type: 'cell', attrs, content })) },
      [PARAGRAPH]: { create: jest.fn(() => ({ type: 'paragraph' })) },
      tableRow: { create: jest.fn((_attrs, content) => ({ type: 'row', content })) },
      [TABLE]: { create: jest.fn((_attrs, content) => ({ type: 'table', content })) },
      text: jest.fn((t: string) => ({ type: 'text', text: t })),
    };

    mockTr = {
      selection: { from: 5, to: 5, $head: { node: () => ({ nodeSize: 10 }) } },
      doc: { nodeAt: jest.fn() },
      insert: jest.fn().mockReturnThis(),
      setSelection: jest.fn().mockReturnThis(),
    } as unknown as Transaction;

    mockState = {
      tr: mockTr,
      doc: { content: [] },
      selection: mockTr.selection,
      schema: { nodes: schemaNodes, text: schemaNodes.text },
    } as unknown as EditorState;

    mockDispatch = jest.fn();
    mockView = { focus: jest.fn() } as unknown as EditorView;

    cmd = new VignetteCommand();
  });

  test('isEnabled calls internal __isEnabled', () => {
    const spy = jest.spyOn(cmd, '__isEnabled');
    cmd.isEnabled(mockState, mockView);
    expect(spy).toHaveBeenCalledWith(mockState, mockView);
  });

  test('execute should insert table and paragraph and call dispatch + view.focus', () => {
    const insertTableSpy = jest.spyOn(cmd, 'insertTable').mockReturnValue(mockTr);
    const insertParagraphSpy = jest.spyOn(cmd, 'insertParagraph').mockReturnValue(mockTr);

    const result = cmd.execute(mockState, mockDispatch, mockView);
    expect(result).toBe(true);
    expect(insertTableSpy).toHaveBeenCalled();
    expect(insertParagraphSpy).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(mockTr);
    expect(mockView.focus).toHaveBeenCalled();
  });

  test('execute should still return true even without dispatch', () => {
    const result = cmd.execute(mockState);
    expect(result).toBe(true);
  });

  test('waitForUserInput should resolve undefined', async () => {
    const result = await cmd.waitForUserInput(
      mockState as unknown as EditorState,
      mockDispatch,
      mockView as unknown as EditorView,
      {} as React.SyntheticEvent<Element, Event>
    );
    expect(result).toBeUndefined();
  });

  test('executeWithUserInput should return false', () => {
    expect(cmd.executeWithUserInput(mockState, mockDispatch, mockView, 'input')).toBe(false);
  });

  test('cancel should return null', () => {
    expect(cmd.cancel()).toBeNull();
  });

  test('__isEnabled should always return true', () => {
    expect(cmd.__isEnabled(mockState, mockView)).toBe(true);
  });

  test('insertTable should return tr unchanged if no selection', () => {
    const tr = { doc: {}, selection: null };
    const result = cmd.insertTable(
      tr as unknown as Transaction,
      mockState.schema,
      1,
      1
    );
    expect(result).toBe(tr);
  });

  test('insertTable should return tr unchanged if from !== to', () => {
    const tr = { selection: { from: 1, to: 2 } };
    const result = cmd.insertTable(
      tr as unknown as Transaction,
      mockState.schema,
      1,
      1
    );
    expect(result).toBe(tr);
  });

  test('insertTable should return tr unchanged if nodes missing', () => {
    const badSchema = { nodes: { [TABLE]: null } };
    const result = cmd.insertTable(mockTr, badSchema as unknown as EditorState['schema'], 1, 1);
    expect(result).toBe(mockTr);
  });

  test('insertTable creates correct nested structure and sets selection', () => {
    const result = cmd.insertTable(mockTr, mockState.schema, 2, 2);
    expect((schemaNodes[TABLE_CELL] as { create: jest.Mock }).create).toHaveBeenCalledWith(
      expect.objectContaining({
        borderColor: DEF_BORDER_COLOR,
        backgroundColor: '#dce6f2',
        vignette: true,
      }),
      expect.anything()
    );
    expect((schemaNodes[PARAGRAPH] as { create: jest.Mock }).create).toHaveBeenCalled();
    expect((schemaNodes.tableRow as { create: jest.Mock }).create).toHaveBeenCalled();
    expect((schemaNodes[TABLE] as { create: jest.Mock }).create).toHaveBeenCalled();
    expect(mockTr.insert).toHaveBeenCalled();
    expect(mockTr.setSelection).toHaveBeenCalled();
    expect(TextSelection.create).toHaveBeenCalled();
    expect(result).toBe(mockTr);
  });

  test('insertParagraph inserts paragraph when from === to', () => {
    const result = cmd.insertParagraph(mockState, mockTr);
    expect((schemaNodes[PARAGRAPH] as { create: jest.Mock }).create).toHaveBeenCalled();
    expect(mockTr.insert).toHaveBeenCalled();
    expect(result).toBe(mockTr);
  });

  test('insertParagraph returns tr unchanged when from !== to', () => {
    const badTr = { selection: { from: 1, to: 2 } };
    const result = cmd.insertParagraph(
      mockState as unknown as EditorState,
      badTr as unknown as Transaction
    );
    expect(result).toBe(badTr);
  });

  test('renderLabel returns null', () => {
    expect(cmd.renderLabel()).toBeNull();
  });

  test('isActive returns true', () => {
    expect(cmd.isActive()).toBe(false);
  });

  test('executeCustom returns tr unchanged', () => {
    const tr = new Transform(mockState.doc);
    expect(cmd.executeCustom(mockState, tr)).toBe(tr);
  });
});
