import { VignetteCommand } from './VignetteCommand';
import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { DEF_BORDER_COLOR, TABLE, TABLE_CELL, PARAGRAPH } from './Constants';

jest.mock('prosemirror-model', () => ({
  Fragment: {
    fromArray: jest.fn((arr) => arr),
    from: jest.fn((obj) => obj),
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
  let mockView: any;
  let mockTr: any;
  let mockState: any;
  let schemaNodes: any;

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
    };

    mockState = {
      tr: mockTr,
      doc: { content: [] },
      selection: mockTr.selection,
      schema: { nodes: schemaNodes, text: schemaNodes.text },
    };

    mockDispatch = jest.fn();
    mockView = { focus: jest.fn() };

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
    const result = await cmd.waitForUserInput(mockState, mockDispatch, mockView, {} as any);
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
    const result = cmd.insertTable(tr as any, mockState.schema, 1, 1);
    expect(result).toBe(tr);
  });

  test('insertTable should return tr unchanged if from !== to', () => {
    const tr = { selection: { from: 1, to: 2 } };
    const result = cmd.insertTable(tr as any, mockState.schema, 1, 1);
    expect(result).toBe(tr);
  });

  test('insertTable should return tr unchanged if nodes missing', () => {
    const badSchema = { nodes: { [TABLE]: null } };
    const result = cmd.insertTable(mockTr, badSchema as any, 1, 1);
    expect(result).toBe(mockTr);
  });

  test('insertTable creates correct nested structure and sets selection', () => {
    const result = cmd.insertTable(mockTr, mockState.schema, 2, 2);
    expect(schemaNodes[TABLE_CELL].create).toHaveBeenCalledWith(
      expect.objectContaining({
        borderColor: DEF_BORDER_COLOR,
        backgroundColor: '#dce6f2',
        vignette: true,
      }),
      expect.anything()
    );
    expect(schemaNodes[PARAGRAPH].create).toHaveBeenCalled();
    expect(schemaNodes.tableRow.create).toHaveBeenCalled();
    expect(schemaNodes[TABLE].create).toHaveBeenCalled();
    expect(mockTr.insert).toHaveBeenCalled();
    expect(mockTr.setSelection).toHaveBeenCalled();
    expect(TextSelection.create).toHaveBeenCalled();
    expect(result).toBe(mockTr);
  });

  test('insertParagraph inserts paragraph when from === to', () => {
    const result = cmd.insertParagraph(mockState, mockTr);
    expect(schemaNodes[PARAGRAPH].create).toHaveBeenCalled();
    expect(mockTr.insert).toHaveBeenCalled();
    expect(result).toBe(mockTr);
  });

  test('insertParagraph returns tr unchanged when from !== to', () => {
    const badTr = { selection: { from: 1, to: 2 } };
    const result = cmd.insertParagraph(mockState, badTr as any);
    expect(result).toBe(badTr);
  });

  test('renderLabel returns null', () => {
    expect(cmd.renderLabel()).toBeNull();
  });

  test('isActive returns true', () => {
    expect(cmd.isActive()).toBe(true);
  });

  test('executeCustom returns tr unchanged', () => {
    const tr = new Transform();
    expect(cmd.executeCustom(mockState, tr)).toBe(tr);
  });
});
