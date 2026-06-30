/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { TextColorCommand } from './TextColorCommand';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Schema, Mark, Node } from 'prosemirror-model';
import { schema } from 'prosemirror-test-builder';
import { Transform } from 'prosemirror-transform';
import { MARK_TEXT_COLOR } from './MarkNames';
import { EditorView } from 'prosemirror-view';
import * as applymark from './applyMark';
import * as findNodesWithSameMark from './findNodesWithSameMark';
import * as createPopUpModule from './ui/createPopUp';
import type { PopUpHandle } from './ui/createPopUp';

describe('TextColorCommand', () => {
  let plugin!: TextColorCommand;
  beforeEach(() => {
    plugin = new TextColorCommand('red');
  });
  it('should create', () => {
    expect(plugin).toBeTruthy();
  });

  it('should be active', () => {
    expect(plugin.isActive()).toBeFalsy();
  });

  it('should not render label', () => {
    expect(plugin.renderLabel()).toBeNull();
  });

  it('executeWithUserInput function() should be return false', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;

    const test = plugin.executeWithUserInput(state);
    expect(test).toBeFalsy();
  });

  it('executeWithUserInput function() should be return true, If docChanged = true', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
        resolve: () => {
          return { pos: 0 };
        },
      },
      selection: { from: 0, to: 1 },
    } as unknown as EditorState;

    const editorview = {} as unknown as EditorView;

    jest
      .spyOn(applymark, 'applyMark')
      .mockReturnValue({ docChanged: true } as unknown as Transform);
    const test = plugin.executeWithUserInput(
      state,
      (_x) => {
        return 'red';
      },
      editorview,
      { color: 'red', selectedOption: 'top' }
    );

    expect(test).toBeTruthy();
  });
  it('executeWithUserInput function() should be return true, If storedMarksSet = true', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;

    const editorview = {} as unknown as EditorView;

    jest
      .spyOn(applymark, 'applyMark')
      .mockReturnValue({ storedMarksSet: true } as unknown as Transform);
    const test = plugin.executeWithUserInput(
      state,
      (_x) => {
        return 'red';
      },
      editorview,
      { color: 'red', selectedOption: 'top' }
    );

    expect(test).toBeTruthy();
  });
  it('executeWithUserInput function() should be return true, If storedMarksSet = false', () => {
    const state = {
      plugins: [],
      schema: { marks: null },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;

    const editorview = {} as unknown as EditorView;

    jest
      .spyOn(applymark, 'applyMark')
      .mockReturnValue({ storedMarksSet: false } as unknown as Transform);
    const test = plugin.executeWithUserInput(
      state,
      (_x) => {
        return 'red';
      },
      editorview,
      { color: 'red', selectedOption: 'top' }
    );

    expect(test).toBeFalsy();
  });

  it('should be call executeCustom methood return tr', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
    } as unknown as EditorState;

    const tr = {
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
        resolve: () => {
          return 1;
        },
      },
      storedMarks: [],
      setSelection: () => {
        return '';
      },
    } as unknown as Transform;
    jest
      .spyOn(TextSelection, 'create')
      .mockReturnValue({} as unknown as TextSelection);

    jest
      .spyOn(applymark, 'applyMark')
      .mockReturnValue({ storedMarks: [] } as unknown as Transform);
    const test = plugin.executeCustom(state, tr, 2, 2);

    expect(test).toStrictEqual({ storedMarks: [] });
  });

  it('waitForUserInput function() should be return undefined', () => {
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false, marks: [] };
          },
        },
      },
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const event_ = {
      currentTarget: document.createElement('div'),
    } as unknown as Event;

    const editorview = {} as unknown as EditorView;

    const result = plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_
    );

    expect(result).toBeDefined();
  });

  it('waitForUserInput function() should be return undefined (case 2)', () => {
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false, marks: [] };
          },
        },
      },
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const editorview = {} as unknown as EditorView;

    const result = plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      undefined
    );

    expect(result).toBeDefined();
  });
  it('waitForUserInput function() should be return undefined (case 3)', () => {
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false, marks: [] };
          },
        },
      },
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const event_ = {
      currentTarget: null,
    } as unknown as Event;

    const editorview = {} as unknown as EditorView;

    const result = plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_
    );

    expect(result).toBeDefined();
  });
  it('waitForUserInput function() should be return undefined (case 4)', () => {
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false, marks: [] };
          },
        },
      },
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const event_ = {
      currentTarget: null,
    } as unknown as Event;

    const editorview = {} as unknown as EditorView;
    plugin._popUp = {};
    const result = plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_
    );

    expect(result).toBeDefined();
  });

  it('should resolve with undefined when event is not defined or currentTarget is not an HTMLElement', async () => {
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const editorview = {} as unknown as EditorView;
    const event_ = {
      currentTarget: 'not an HTMLElement',
    } as unknown as Event;
    const result = await plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_
    );
    expect(result).toBeUndefined();
  });

  it('should resolve with undefined when event is not defined or currentTarget is not an HTMLElement (case 2)', async () => {
    const state = {} as unknown as EditorState;

    const _dispatch = jest.fn();
    const editorview = {} as unknown as EditorView;
    const event_ = {
      currentTarget: 'not an HTMLElement',
    } as unknown as Event;
    const result = await plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_
    );
    expect(result).toBeUndefined();
  });

  it('should be check the condition result is there', () => {
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-text-color': MARK_TEXT_COLOR } },
      doc: {
        nodeAt: (_x) => {
          return { isAtom: true, isLeaf: true, isText: false };
        },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false, marks: [] };
          },
        },
      },
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const event_ = {
      currentTarget: document.createElement('div'),
    } as unknown as Event;
    const result1 = {
      mark: { attrs: { color: 'red' } } as unknown as Mark,
      from: {
        node: {} as unknown as Node,
        pos: 0,
      },
      to: {
        node: {} as unknown as Node,
        pos: 1,
      },
    };
    jest
      .spyOn(findNodesWithSameMark, 'findNodesWithSameMark')
      .mockReturnValue(result1);
    const editorview = {} as unknown as EditorView;

    const result = plugin.waitForUserInput(
      state,
      _dispatch,
      editorview,
      event_
    );

    expect(result).toBeDefined();
  });

  it('should resolve selected color when popup closes with an active text color', async () => {
    const popUpHandle: PopUpHandle = {
      close: jest.fn(),
      update: jest.fn(),
    };
    const createPopUpSpy = jest
      .spyOn(createPopUpModule, 'createPopUp')
      .mockReturnValue(popUpHandle);
    const markType = { name: MARK_TEXT_COLOR };
    const state = {
      plugins: [],
      selection: { from: 1, to: 2 },
      schema: { marks: { 'mark-text-color': markType } },
      doc: {},
      tr: {
        doc: {
          nodeAt: () => ({
            marks: [{ attrs: { color: 'green' } }],
          }),
        },
      },
    } as unknown as EditorState;
    jest
      .spyOn(findNodesWithSameMark, 'findNodesWithSameMark')
      .mockReturnValue(null);

    const promise = plugin.waitForUserInput(
      state,
      jest.fn(),
      {} as unknown as EditorView,
      { currentTarget: document.createElement('button') } as unknown as Event
    );

    const popUpParams = createPopUpSpy.mock.calls[0][2];
    popUpParams.onClose?.('green');

    await expect(promise).resolves.toBe('green');
    popUpParams.onClose?.('ignored');
    expect(createPopUpSpy.mock.calls[0][1]).toMatchObject({
      hex: null,
      Textcolor: 'green',
    });
  });

  it('executeWithUserInput function() should return false when color is undefined', () => {
    const state = {
      // Define your test state here
    } as unknown as EditorState;

    const editorview = {} as unknown as EditorView;

    const test = plugin.executeWithUserInput(
      state,
      (_x) => {
        return 'red';
      },
      editorview,
      undefined
    );

    expect(test).toBeFalsy();
  });
  it('call cancel()', () => {
    const test = plugin.cancel();
    expect(test).toBeNull();
  });
});

describe('HeadingCommand', () => {
  let schema1;
  let command: TextColorCommand;
  beforeEach(() => {
    schema1 = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    command = new TextColorCommand('red');
  });

  it('should enable the command when text align is enabled', () => {
    const state = EditorState.create({ schema: schema1 });
    const isEnabled = command.isEnabled(state);
    expect(isEnabled).toBe(false);
  });

  //////////////////////////////////////
});
