/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import {EditorState, Transaction} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import {Editor} from '@tiptap/react';
import {StarterKit} from '@tiptap/starter-kit';
import {Table} from '@tiptap/extension-table';
import {CellSelection, selectionCell, setCellAttr} from 'prosemirror-tables';
import TableColorCommand from './tableColorCommand';
import { createPopUp } from '../../commands';
import {TableRowEx} from '../extensions/tableRowEx';
import {TableCellEx} from '../extensions/tableCellEx';
import {TableHeaderEx} from '../extensions/tableHeaderEx';

jest.mock('../../commands', () => {
  // define inside the factory → safe from hoisting issues
  const createPopUpMock = jest
    .fn()
    .mockImplementation(
      (
        _Component: unknown,
        _props: unknown,
        opts: { onClose?: (v: string) => void }
      ) => {
        return {
          close: jest.fn((_value: unknown) => opts.onClose?.('mocked value')),
        };
      }
    );

  const actual =
    jest.requireActual<typeof import('../../commands')>('../../commands');

  return {
    ...actual,
    createPopUp: createPopUpMock,
    atAnchorRight: jest.fn(),
    RuntimeService: { Runtime: 'mockRuntime' },
  };
});

// Mock color-picker import
jest.mock('@modusoperandi/color-picker', () => ({
  ColorEditor: jest.fn(),
}));

jest.mock('prosemirror-tables', () => {
  const actual =
    jest.requireActual<typeof import('prosemirror-tables')>(
      'prosemirror-tables'
    );

  return {
    ...actual,
    setCellAttr: jest.fn(() => jest.fn(() => false)),
  };
});

// A typed synthetic mouseenter event
interface FakeReactEvent extends React.SyntheticEvent {
  readonly type: string;
  readonly currentTarget: EventTarget & HTMLElement;
}

describe('TableColorCommand (typed)', () => {
  let command: TableColorCommand;
  let mockState: EditorState;
  let mockTransform: Transform;
  let dispatchMock: jest.Mock;
  let viewMock: EditorView;

  beforeEach(() => {
    mockState = {} as EditorState;
    mockTransform = {} as Transform;
    dispatchMock = jest.fn();
    viewMock = {} as EditorView;
    (setCellAttr as jest.Mock).mockReturnValue(jest.fn(() => false));

    command = new TableColorCommand('backgroundColor');

    jest.clearAllMocks();
  });

  it('should initialize attribute', () => {
    expect(command.attribute).toBe('backgroundColor');
  });

  it('executeCustom returns same transform', () => {
    expect(command.executeCustom(mockState, mockTransform, 0, 0)).toBe(
      mockTransform
    );
  });

  it('executeCustomStyleForTable returns same transform', () => {
    expect(command.executeCustomStyleForTable(mockState, mockTransform)).toBe(
      mockTransform
    );
  });

  it('should respond only to mouseenter', () => {
    const evtEnter: FakeReactEvent = {
      type: 'mouseenter',
      currentTarget: document.createElement('div'),
    } as unknown as FakeReactEvent;

    const evtClick: FakeReactEvent = {
      type: 'click',
      currentTarget: document.createElement('div'),
    } as unknown as FakeReactEvent;

    expect(command.shouldRespondToUIEvent(evtEnter)).toBe(true);
    expect(command.shouldRespondToUIEvent(evtClick)).toBe(false);
  });

 it('should return true when selection is inside a table', () => {
  const mockState = {
    selection: {
      $from: {
        depth: 3,
        node: (depth: number) =>
          depth === 1
            ? { type: { name: 'table' } }
            : { type: { name: 'paragraph' } },
      },
    },
  };

  expect(command.isEnabled(mockState as unknown as EditorState)).toBe(true);
});

  it('returns undefined when target invalid', async () => {
    const badEvent = {
      currentTarget: null,
      type: 'mouseenter',
    } as unknown as FakeReactEvent;

    const result = await command.waitForUserInput(
      mockState,
      dispatchMock,
      viewMock,
      badEvent
    );

    expect(result).toBeUndefined();
  });

  it('should replace existing popup when opening again', async () => {
    const close = jest.fn();
    command._popUp = {close, update: jest.fn()};

    const evt: FakeReactEvent = {
      type: 'mouseenter',
      currentTarget: document.createElement('div'),
    } as unknown as FakeReactEvent;

    const promise = command.waitForUserInput(
      mockState,
      dispatchMock,
      viewMock,
      evt
    );
    const call = (createPopUp as jest.Mock).mock.calls[0];
    const options = call[2];
    options.onClose('mocked value');

    expect(close).toHaveBeenCalledWith(undefined);
    expect(createPopUp).toHaveBeenCalled();
    expect(command._popUp).toBeNull();
    await expect(promise).resolves.toBe('mocked value');
  });

  it('returns false when hex undefined', () => {
    expect(
      command.executeWithUserInput(mockState, dispatchMock, viewMock)
    ).toBe(false);
  });

  it('ignores an empty color result', () => {
    expect(
      command.executeWithUserInput(mockState, dispatchMock, viewMock, {
        color: '',
      })
    ).toBe(false);
  });

  it('calls setCellAttr when hex provided', () => {
    const setCellAttrCommandMock = jest.fn(() => false);
    (setCellAttr as jest.Mock).mockReturnValue(setCellAttrCommandMock);

    const result = command.executeWithUserInput(
      mockState,
      dispatchMock,
      viewMock,
      {color: '#333333'}
    );

    expect(setCellAttr).toHaveBeenCalledWith('backgroundColor', '#333333');
    expect(setCellAttrCommandMock).toHaveBeenCalledWith(
      mockState,
      expect.any(Function)
    );
    expect(result).toBeFalsy();
  });

  it('routes a border picker result through the supplied dispatch', () => {
    command = new TableColorCommand('borderColor');
    const setCellBordersSpy = jest
      .spyOn(command, 'setCellBorders')
      .mockReturnValue(true);

    const hex = { color: '#333333', selectedPosition: ['Top', 'Bottom'] };
    const result = command.executeWithUserInput(
      mockState,
      dispatchMock,
      undefined,
      hex
    );

    expect(setCellBordersSpy).toHaveBeenCalledWith(
      mockState,
      dispatchMock,
      ['Top', 'Bottom'],
      '#333333'
    );
    expect(result).toBe(true);
  });

  it('routes a border picker result through the active editor view', () => {
    command = new TableColorCommand('borderColor');
    const setCellBordersSpy = jest
      .spyOn(command, 'setCellBorders')
      .mockReturnValue(true);
    const hex = { color: '#333333', selectedPosition: ['Top', 'Bottom'] };

    const result = command.executeWithUserInput(
      mockState,
      dispatchMock,
      viewMock,
      hex
    );

    expect(setCellBordersSpy).toHaveBeenCalledWith(
      mockState,
      expect.any(Function),
      ['Top', 'Bottom'],
      '#333333'
    );
    expect(result).toBe(true);
  });


  it('cancel closes popup if exists', () => {
    const close = jest.fn();
    command._popUp = {close, update: jest.fn()};

    command.cancel();
    expect(close).toHaveBeenCalledWith(undefined);
    expect(command._popUp).toBeNull();
  });

  it('cancel does nothing when no popup', () => {
    command._popUp = null;
    expect(() => command.cancel()).not.toThrow();
  });

  it('should clear popup and resolve value when onClose is triggered', async () => {
    const div = document.createElement('div');

    // Prepare event
    const event = {
      type: 'mouseenter',
      currentTarget: div,
    } as unknown as React.SyntheticEvent;

    const promise = command.waitForUserInput(
      mockState,
      dispatchMock,
      viewMock,
      event
    );

    // Extract the call arguments for createPopUp
    const call = (createPopUp as jest.Mock).mock.calls[0];
    const options = call[2];

    expect(options).toHaveProperty('onClose');
    expect(options.autoDismiss).toBe(true);
    const onClose = options.onClose!;
    expect(command._popUp).not.toBeNull();
    onClose('close-value');
    expect(command._popUp).toBeNull();
    await expect(promise).resolves.toBe('close-value');
  });
});

describe('TableColorCommand border attributes', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        Table,
        TableRowEx,
        TableHeaderEx,
        TableCellEx,
      ],
      content: {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    attrs: {
                      borderColor: '#000000',
                      borderTop: '2px dashed blue',
                      borderTopWidth: '2px',
                      borderTopColor: 'blue',
                      borderTopStyle: 'dashed',
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{type: 'text', text: 'Header'}],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      borderColor: '#000000',
                      borderTop: '2px dashed blue',
                      borderTopWidth: '2px',
                      borderTopColor: 'blue',
                      borderTopStyle: 'dashed',
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{type: 'text', text: 'Body'}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  function selectBothCells(): void {
    let headerPos: number | null = null;
    let bodyPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableHeader') {
        headerPos = pos;
      } else if (node.type.name === 'tableCell') {
        bodyPos = pos;
      }
    });

    if (headerPos === null || bodyPos === null) {
      throw new Error('Expected a header and body cell');
    }

    editor.view.dispatch(
      editor.state.tr.setSelection(
        CellSelection.create(editor.state.doc, headerPos, bodyPos)
      )
    );
  }

  it('updates canonical side colors for selected header and body cells', () => {
    selectBothCells();
    const command = new TableColorCommand('borderColor');

    expect(
      command.executeWithUserInput(
        editor.state,
        (tr) => editor.view.dispatch(tr as Transaction),
        editor.view,
        {color: '#ff0000', selectedPosition: ['Top', 'Bottom']}
      )
    ).toBe(true);

    const cellAttrs: Array<Record<string, unknown>> = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'tableHeader' || node.type.name === 'tableCell') {
        cellAttrs.push(node.attrs);
      }
    });

    expect(cellAttrs).toHaveLength(2);
    for (const attrs of cellAttrs) {
      expect(attrs).toMatchObject({
        borderColor: null,
        borderTop: '2px dashed blue',
        borderTopWidth: '2px',
        borderTopStyle: 'dashed',
        borderTopColor: '#ff0000',
        borderBottomColor: '#ff0000',
        borderLeftColor: '#000000',
        borderRightColor: '#000000',
      });
    }

    expect(editor.getHTML()).not.toContain('[object Object]');
    expect(editor.getHTML()).toContain('border-top-color: #ff0000');
  });

  it('renders all border sides on a freshly inserted table cell', () => {
    editor.commands.setContent('<p>Before table</p>');
    editor.commands.focus('end');
    expect(editor.commands.insertTable({rows: 2, cols: 2})).toBe(true);
    expect(editor.commands.setCellAttribute('verticalAlign', 'top')).toBe(true);

    const command = new TableColorCommand('borderColor');
    expect(
      command.executeWithUserInput(
        editor.state,
        (tr) => editor.view.dispatch(tr as Transaction),
        editor.view,
        {
          color: '#ff0000',
          selectedPosition: ['Top', 'Right', 'Bottom', 'Left'],
        }
      )
    ).toBe(true);

    const cell = editor.state.doc.nodeAt(selectionCell(editor.state).pos);
    expect(cell?.attrs).toMatchObject({
      borderTopColor: '#ff0000',
      borderRightColor: '#ff0000',
      borderBottomColor: '#ff0000',
      borderLeftColor: '#ff0000',
    });

    const html = editor.getHTML();
    expect(html).toContain('border-top-color: #ff0000');
    expect(html).toContain('border-right-color: #ff0000');
    expect(html).toContain('border-bottom-color: #ff0000');
    expect(html).toContain('border-left-color: #ff0000');
    expect(html).toContain('vertical-align: top');
    expect(html).not.toContain('#ff0000vertical-align');
  });

  it('does nothing when no border side is selected', () => {
    selectBothCells();
    const command = new TableColorCommand('borderColor');
    const before = editor.getJSON();

    expect(
      command.executeWithUserInput(
        editor.state,
        (tr) => editor.view.dispatch(tr as Transaction),
        editor.view,
        {color: '#ff0000', selectedPosition: []}
      )
    ).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  });

  it('stores fill colors as strings through the supplied editor view', () => {
    selectBothCells();
    const command = new TableColorCommand('backgroundColor');

    expect(
      command.executeWithUserInput(
        editor.state,
        (tr) => editor.view.dispatch(tr as Transaction),
        editor.view,
        {color: '#00ff00'}
      )
    ).toBe(true);

    const colors: unknown[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'tableHeader' || node.type.name === 'tableCell') {
        colors.push(node.attrs.backgroundColor);
      }
    });
    expect(colors).toEqual(['#00ff00', '#00ff00']);
  });

  it('synchronizes the opposite side of a collapsed shared border', () => {
    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: {
                    borderColor: '#000000',
                    borderBottomWidth: '2px',
                    borderBottomStyle: 'dashed',
                    borderBottomColor: '#000000',
                  },
                  content: [
                    {
                      type: 'paragraph',
                      content: [{type: 'text', text: 'Above'}],
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: {
                    borderColor: '#000000',
                    borderTopWidth: '2px',
                    borderTopStyle: 'dashed',
                    borderTopColor: '#000000',
                  },
                  content: [
                    {
                      type: 'paragraph',
                      content: [{type: 'text', text: 'Below'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    let belowPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' && node.textContent === 'Below') {
        belowPos = pos;
      }
    });
    if (belowPos === null) {
      throw new Error('Expected the lower table cell');
    }
    editor.commands.setTextSelection(belowPos + 2);

    const command = new TableColorCommand('borderColor');
    expect(
      command.executeWithUserInput(
        editor.state,
        (tr) => editor.view.dispatch(tr as Transaction),
        editor.view,
        {color: '#ff0000', selectedPosition: ['Top']}
      )
    ).toBe(true);

    const byText = new Map<string, Record<string, unknown>>();
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'tableCell') {
        byText.set(node.textContent, node.attrs);
      }
    });
    expect(byText.get('Above')).toMatchObject({
      borderBottomWidth: '2px',
      borderBottomStyle: 'dashed',
      borderBottomColor: '#ff0000',
    });
    expect(byText.get('Below')).toMatchObject({
      borderTopWidth: '2px',
      borderTopStyle: 'dashed',
      borderTopColor: '#ff0000',
    });
  });
});
