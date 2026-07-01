/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import {EditorState, TextSelection} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import {UICommand} from '../../core';
import TableInsertCommand from './tableInsertCommand';
import {Node as ProseMirrorNode, Schema} from 'prosemirror-model';
import {Editor} from '@tiptap/react';
import {createPopUp} from '../../commands';
import TableDetailsCommand from './TableDetailsCommand';

jest.mock('../ui/tableGridSizeEditor', () => {
  return jest.fn(() => '<div>Mocked Table Grid Size Editor</div>');
});

jest.mock('nullthrows', () => jest.fn(<T>(val: T) => val), {virtual: true});

jest.mock('../../commands', () => {
  const actual = jest.requireActual<typeof import('../../commands')>(
    '../../commands'
  );

  return {
    ...actual,
    createPopUp: jest.fn((
      _component,
      _props,
      options: {onClose?: (value?: unknown) => void} | undefined
    ) => ({
      close: jest.fn((value?: unknown) => {
        options?.onClose?.(value);
      }),
    })),
  };
});

describe('TableInsertCommand', () => {
  let command;
  let editorState;
  let view;
  let dispatchMock;
  let viewMock;
  let closeMock;

  // Mock state and selection
  const mySchema = new Schema({
    nodes: {
      doc: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'block+',
      },
      paragraph: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'text*',
        group: 'block',
      },
      heading: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'text*',
        group: 'block',
        defining: true,
      },
      bullet_list: {
        content: 'list_item+',
        group: 'block',
      },
      list_item: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'paragraph',
        defining: true,
      },
      blockquote: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'block+',
        group: 'block',
      },
      text: {
        inline: true,
      },
    },
  });
  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('heading', {marks: []}, [mySchema.text('Heading 1')]),
    mySchema.node('paragraph', {marks: []}, [
      mySchema.text('This is a paragraph'),
    ]),
    mySchema.node('bullet_list', {marks: []}, [
      mySchema.node('list_item', {marks: []}, [
        mySchema.node('paragraph', {marks: []}, [mySchema.text('List item 1')]),
      ]),
      mySchema.node('list_item', {marks: []}, [
        mySchema.node('paragraph', {marks: []}, [mySchema.text('List item 2')]),
      ]),
    ]),
    mySchema.node('blockquote', {marks: []}, [
      mySchema.node('paragraph', {marks: []}, [
        mySchema.text('This is a blockquote'),
      ]),
    ]),
  ]);

  beforeEach(() => {
    command = new TableInsertCommand();
    editorState = {
      doc: dummyDoc,
      selection: {
        from: 0,
        to: 0,
        $head: {
          depth: 1,
          node: jest.fn(() => ({type: {spec: {tableRole: ''}}})),
        },
      },
    };
    view = {};
    // Create a mock for close method
    closeMock = jest.fn();
  });

  it('should enable the command when the selection is valid', () => {
    editorState.selection = TextSelection.create(editorState.doc, 0, 0);

    const result = command.isEnabled(editorState);
    expect(result).toBe(true);
  });

  it('should disable the command if selection is inside a table', () => {
    editorState.selection = TextSelection.create(editorState.doc, 0, 0);
    editorState.selection.$head.depth = 1;
    editorState.selection.$head.node = jest.fn().mockReturnValueOnce({
      type: {spec: {tableRole: 'row'}},
    });
    const result = command.isEnabled(editorState);
    expect(result).toBe(false);
  });

  it('should return to if the target is not htnl element', () => {
    editorState.selection = {};

    const result = command.isEnabled(editorState);
    expect(result).toBe(false);
  });

  it('waitForUserInput should create a pop-up and resolve', async () => {
    const state = {
      plugins: [],
      selection: {from: 1, to: 2},
      schema: {marks: {'mark-text-color': 'mark-text-color'}},
      doc: {
        nodeAt: (_x) => {
          return {isAtom: true, isLeaf: true, isText: false};
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return {isAtom: true, isLeaf: true, isText: false, marks: []};
          },
        },
      },
    } as unknown as EditorState;

    // Mock DOM element to be returned by getElementById
    const mockElement = document.createElement('div');
    mockElement.id = 'parent-id';
    document.getElementById = jest.fn().mockReturnValue(mockElement);
    // Mock the offsetParent to simulate a parent element with an id
    Object.defineProperty(mockElement, 'offsetParent', {
      value: {id: 'parent-id'},
    });

    const _dispatch = jest.fn();
    const event_ = {
      currentTarget: mockElement,
    } as unknown as Event;

    const editorview = {} as unknown as EditorView;

    const result = command.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_
    );

    const onCloseCallback = command._popUp?.close;
    if (onCloseCallback) {
      onCloseCallback('mocked value');
    }

    await expect(result).resolves.toBe('mocked value');

    expect(result).toBeDefined();
  });

  it('waitForUserInput should resolve with undefined if _popUp is already set', async () => {
    const eventMock = {
      currentTarget: document.createElement('div'),
      type: 'mouseenter',
    } as unknown as React.SyntheticEvent;
    command._popUp = {close: closeMock};
    const result = await command.waitForUserInput(
      editorState,
      dispatchMock,
      viewMock,
      eventMock
    );
    expect(result).toBeUndefined();
  });

  it('should handle invalid target in waitForUserInput gracefully', async () => {
    const eventMock = {
      currentTarget: document.createElement('div'),
      type: 'mouseenter',
    } as unknown as React.SyntheticEvent;
    // Making the target null to simulate an invalid event
    eventMock.currentTarget = null;
    const result = await command.waitForUserInput(
      editorState,
      dispatchMock,
      viewMock,
      eventMock
    );
    expect(result).toBeUndefined();
  });

  it('should execute with user input', () => {
    const inputs = {rows: 3, cols: 3};
    const insertTableMock = jest.fn().mockReturnValue(true);

    // Mock the getEditor function to return a mock editor
    UICommand.prototype.editor = {
      view: {focus: () => {}, dispatch: () => {}},
      commands: {
        redo: jest.fn(),
        setCellAttribute: jest.fn(),
        insertTable: insertTableMock,
      },
    } as unknown as Editor;

    const result = command.executeWithUserInput(
      editorState,
      undefined,
      view,
      inputs
    );

    expect(result).toBe(true);
    expect(insertTableMock).toHaveBeenCalledWith({rows: 3, cols: 3});
  });

  it('should return false if no user input is provided', () => {
    const result = command.executeWithUserInput(editorState);
    expect(result).toBe(false);
  });

  it('should detect and handle a mouse enter event', () => {
    const mouseEnterEvent = new MouseEvent('mouseenter');
    const result = command.shouldRespondToUIEvent(mouseEnterEvent);
    expect(result).toBe(true);
  });

  it('should not respond to non-mouseenter events', () => {
    const clickEvent = new MouseEvent('click');
    const result = command.shouldRespondToUIEvent(clickEvent);
    expect(result).toBe(false);
  });

  it('should handle cancel', () => {
    const result = command.cancel();
    expect(result).toBeNull();
  });

  it('should handle executeCustomStyleForTable', () => {
  const mockState = {} as EditorState;
  const mockTransform = {} as Transform;  
  const result = command.executeCustomStyleForTable(mockState, mockTransform);  
  expect(result).toBe(mockTransform);
  });

  describe('executeCustom', () => {
    it('should return the given Transform', () => {
      const mockTransform = {} as Transform;
      const result = command.executeCustom(editorState, mockTransform, 0, 1);
      expect(result).toBe(mockTransform);
    });
  });
});

type MockEditorView = EditorView & {
  dispatch: jest.Mock;
  focus: jest.Mock;
};

const schema = new Schema({
  nodes: {
    doc: {content: 'block+'},
    text: {group: 'inline'},
    paragraph: {content: 'inline*', group: 'block'},
    table: {
      attrs: {
        noOfColumns: {default: null},
        tableHeight: {default: null},
      },
      content: 'table_row+',
      group: 'block',
      tableRole: 'table',
    },
    table_row: {
      attrs: {
        rowHeight: {default: null},
        rowWidth: {default: null},
      },
      content: 'table_cell+',
      tableRole: 'row',
    },
    table_cell: {
      attrs: {
        colspan: {default: 1},
        rowspan: {default: 1},
        colwidth: {default: null},
        cellWidth: {default: null},
        cellStyle: {default: null},
        fontSize: {default: null},
        letterSpacing: {default: null},
        marginTop: {default: null},
        MarginBottom: {default: null},
      },
      content: 'paragraph+',
      tableRole: 'cell',
    },
    blockquote: {
      content: 'paragraph+',
      group: 'block',
    },
  },
});

function createTableDoc(): ProseMirrorNode {
  const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));
  const cell = (text: string) => schema.nodes.table_cell.create(null, [p(text)]);
  const row = (first: string, second: string) =>
    schema.nodes.table_row.create(null, [cell(first), cell(second)]);

  return schema.nodes.doc.create(null, [
    schema.nodes.table.create(
      {noOfColumns: 2, tableHeight: '120px'},
      [row('a', 'b'), row('c', 'd')]
    ),
  ]);
}

function findTextPos(doc: ProseMirrorNode, text: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (node.isText && node.text === text) {
      found = pos;
      return false;
    }
    return true;
  });
  return found;
}

function createState(doc = createTableDoc(), text = 'a'): EditorState {
  return EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, findTextPos(doc, text)),
  });
}

function createTableDom(): {
  table: HTMLTableElement;
  td: HTMLTableCellElement;
  text: Text;
} {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  const text = document.createTextNode('a');
  td.appendChild(text);
  tr.appendChild(td);
  tbody.appendChild(tr);
  table.appendChild(tbody);
  table.getBoundingClientRect = jest.fn(
    () => ({width: 222, height: 111}) as DOMRect
  );
  td.getBoundingClientRect = jest.fn(
    () => ({width: 55, height: 44}) as DOMRect
  );
  return {table, td, text};
}

function createView(state = createState()): MockEditorView {
  const {table, text} = createTableDom();
  return {
    state,
    dispatch: jest.fn(),
    focus: jest.fn(),
    domAtPos: jest.fn((pos: number) => {
      if (pos === state.selection.from) {
        return {node: text, offset: 0};
      }
      return {node: table, offset: 0};
    }),
  } as unknown as MockEditorView;
}

describe('TableDetailsCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens table details with table, row and cell metadata', () => {
    const command = new TableDetailsCommand();
    const state = createState();
    const view = createView(state);

    expect(command.execute(state, jest.fn(), view)).toBe(true);

    expect(createPopUp).toHaveBeenCalled();
    const props = (createPopUp as jest.Mock).mock.calls[0][1];
    expect(props.table).toEqual({
      width: 222,
      height: 111,
      noOfColumns: 2,
      tableHeight: '120px',
    });
    expect(props.row).toEqual({rowHeight: null, rowWidth: null});
    expect(props.cell).toMatchObject({
      width: 55,
      height: 44,
      cellWidth: null,
      cellStyle: null,
    });

    props.close();
    props.onApply({
      noOfColumns: '3',
      tableHeight: '90px',
      rowHeight: '24px',
      rowWidth: '100%',
      cellWidth: '88px',
      cellStyle: 'highlight',
      fontSize: '12pt',
      letterSpacing: '1px',
      marginTop: '2px',
      MarginBottom: '3px',
    });

    expect(view.dispatch).toHaveBeenCalled();
    expect(view.focus).toHaveBeenCalled();
  });

  it('returns false when execute cannot locate required context', () => {
    const command = new TableDetailsCommand();
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.blockquote.create(null, [
        schema.nodes.paragraph.create(null, schema.text('outside')),
      ]),
    ]);
    const state = createState(doc, 'outside');
    const view = createView(state);
    view.domAtPos = jest.fn(() => ({node: document.createTextNode('x'), offset: 0}));

    expect(command.execute(state, jest.fn(), null)).toBe(false);
    expect(command.execute(state, jest.fn(), view)).toBe(false);
  });

  it('covers lookup, DOM and normalization helper branches', async () => {
    const command = new TableDetailsCommand();
    const state = createState();
    const view = createView(state);

    expect(command.isActive(state)).toBe(false);
    expect(command.isEnabled(state)).toBe(true);
    await expect(command.waitForUserInput(state, jest.fn(), view, null)).resolves.toBe(
      undefined
    );
    expect(command.executeWithUserInput(state, jest.fn(), view, 'x')).toBe(false);
    const customTr = state.tr;
    const customStyleTr = state.tr;
    expect(command.executeCustom(state, customTr, 0, 1)).toBe(customTr);
    expect(command.executeCustomStyleForTable(state, customStyleTr)).toBe(
      customStyleTr
    );

    expect(command.getNodeType(schema, ['missing', 'table'])).toBe(
      schema.nodes.table
    );
    expect(command.getNodeType(schema, ['missing'])).toBeNull();
    expect(command.getNodeTypes(schema, ['missing', 'table_cell'])).toEqual([
      schema.nodes.table_cell,
    ]);
    expect(command.getParentNodeRef(state.selection, null)).toBeNull();
    expect(command.getParentNodeRefByTypes(state.selection, [])).toBeNull();
    expect(command.getParentNodeRef(state.selection, schema.nodes.table)).not.toBeNull();
    expect(
      command.getParentNodeRefByTypes(state.selection, [schema.nodes.table_cell])
    ).not.toBeNull();

    expect(command.normalizeString('  value  ')).toBe('value');
    expect(command.normalizeString('   ')).toBeNull();
    expect(command.normalizeNumber('42')).toBe(42);
    expect(command.normalizeNumber('bad')).toBeNull();
    expect(command.normalizeSizeAsNumber('12.6px')).toBe(13);
    expect(command.normalizeSizeAsNumber('0')).toBeNull();
    expect(command.normalizeSizeAsNumber('bad')).toBeNull();

    expect(command.findTableDOM(view, 1)).not.toBeNull();
    view.domAtPos = jest.fn(() => ({node: document.createTextNode('x'), offset: 0}));
    expect(command.findTableDOM(view, 1)).toBeNull();
    expect(command.getSelectedCellDOM(view)).toBeNull();
  });

  it('covers selected cell DOM element and non-text selection paths', () => {
    const command = new TableDetailsCommand();
    const state = createState();
    const view = createView(state);
    const td = document.createElement('td');
    view.domAtPos = jest.fn(() => ({node: td, offset: 0}));

    expect(command.getSelectedCellDOM(view)).toBe(td);

    const nonTextView = {
      ...view,
      state: {
        ...state,
        selection: {},
      },
    } as unknown as MockEditorView;
    expect(command.getSelectedCellDOM(nonTextView)).toBeNull();
  });

  it('covers applyColumnWidth guard branches', () => {
    const command = new TableDetailsCommand();
    const state = createState();
    const tableRef = command.getParentNodeRef(
      state.selection,
      schema.nodes.table
    );
    const cellRef = command.getParentNodeRefByTypes(state.selection, [
      schema.nodes.table_cell,
    ]);

    expect(tableRef).not.toBeNull();
    expect(cellRef).not.toBeNull();

    if (!tableRef || !cellRef) {
      throw new Error('Expected table and cell refs for coverage setup');
    }

    const missingTableTr = state.tr;
    const missingTableRef = {...tableRef, pos: state.doc.content.size};
    expect(command.applyColumnWidth(missingTableTr, missingTableRef, cellRef, 50)).toBe(
      missingTableTr
    );

    const notTableTr = state.tr;
    const notTableRef = {...tableRef, pos: cellRef.pos, node: cellRef.node};
    expect(command.applyColumnWidth(notTableTr, notTableRef, cellRef, 50)).toBe(
      notTableTr
    );

    const missingCellTr = state.tr;
    const missingCellRef = {...cellRef, pos: tableRef.pos};
    expect(command.applyColumnWidth(missingCellTr, tableRef, missingCellRef, 50)).toBe(
      missingCellTr
    );

    const updated = command.applyColumnWidth(state.tr, tableRef, cellRef, 77);
    expect(updated.doc.nodeAt(cellRef.pos)?.attrs.colwidth).toEqual([77]);
  });

  it('applies table and row attributes without a selected cell', () => {
    const command = new TableDetailsCommand();
    const state = createState();
    const view = createView(state);
    const tableRef = command.getParentNodeRef(
      state.selection,
      schema.nodes.table
    );
    const rowRef = command.getParentNodeRef(state.selection, schema.nodes.table_row);
    if (!tableRef) {
      throw new Error('Expected table ref for coverage setup');
    }

    command.applyAttributeInputs(
      view,
      {table: tableRef, row: rowRef, cell: null},
      {
        noOfColumns: '',
        tableHeight: '',
        rowHeight: '30px',
        rowWidth: 'auto',
        cellWidth: '',
        cellStyle: '',
        fontSize: '',
        letterSpacing: '',
        marginTop: '',
        MarginBottom: '',
      }
    );

    expect(view.dispatch).toHaveBeenCalled();
    expect(view.focus).toHaveBeenCalled();
  });

  it('closes an active popup on cancel', () => {
    const command = new TableDetailsCommand();
    const close = jest.fn();
    command._popUp = {close};

    command.cancel();

    expect(close).toHaveBeenCalledWith(undefined);
  });
});
