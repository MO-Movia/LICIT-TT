import { MARK_TEXT_COLOR, MARK_TEXT_HIGHLIGHT } from './MarkNames';
import { TextHighlightCommand } from './TextHighlightCommand';
import { EditorView } from 'prosemirror-view';
import * as applymark from './applyMark';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import * as ismarkcommandenabled from './isTextStyleMarkCommandEnabled';
import * as isNodeSelectionForNodeType from './isNodeSelectionForNodeType';
import { MATH } from './NodeNames';
import { Mark, Node } from 'prosemirror-model';
import * as findNodesWithSameMark from './findNodesWithSameMark';

describe('TextHighlightCommand', () => {
  let plugin!: TextHighlightCommand;

  beforeEach(() => {
    plugin = new TextHighlightCommand('yellow');
  });
  it('should create', () => {
    expect(plugin).toBeTruthy();
  });

  it('should be active', () => {
    expect(plugin.isActive()).toBeTruthy();
  });

  it('should not render label', () => {
    expect(plugin.renderLabel()).toBeNull();
  });

  it('executeWithUserInput function should be return false', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-highlight': MARK_TEXT_HIGHLIGHT } },
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
      schema: { marks: { 'mark-text-highlight': MARK_TEXT_HIGHLIGHT } },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
        resolve: () => {
          return { pos: 0 };
        },
        selection: { from: 0, to: 1 }
      },
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
  it('executeWithUserInput function() should be return true, If docChanged = true', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-highlight': MARK_TEXT_HIGHLIGHT } },
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
      .mockReturnValue({ docChanged: true } as unknown as Transform);
    const test = plugin.executeWithUserInput(
      state,
      (_x) => {
        return 'red';
      },
      editorview,
      { color: {}, selectedOption: {} }
    );

    expect(test).toBeTruthy();
  });
  it('executeWithUserInput function() should be return true, If storedMarksSet = true', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-highlight': MARK_TEXT_HIGHLIGHT } },
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

  it('executeCustom function should be return array', () => {
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-highlight': MARK_TEXT_HIGHLIGHT } },
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

  it('should call when executeCustom function return false', () => {
    const mock = jest.spyOn(
      ismarkcommandenabled,
      'isTextStyleMarkCommandEnabled'
    );
    const state = {
      plugins: [],
      schema: { marks: { 'mark-text-highlight': undefined } },
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);
    expect(mock).toHaveBeenLastCalledWith(state, 'mark-text-highlight');
    expect(test).toBe(false);
  });

  it('should call when executeCustom function return false', () => {
    const mock = jest.spyOn(
      ismarkcommandenabled,
      'isTextStyleMarkCommandEnabled'
    );
    const state = {
      selection: { to: 2, from: 1 },
      schema: {
        marks: { 'mark-text-highlight': MARK_TEXT_HIGHLIGHT },
        nodes: { math: MATH },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: true, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);
    expect(mock).toHaveBeenLastCalledWith(state, 'mark-text-highlight');
    expect(test).toBeFalsy();
  });

  it('should call when executeCustom function return true', () => {
    const mock = jest.spyOn(
      ismarkcommandenabled,
      'isTextStyleMarkCommandEnabled'
    );
    const state = {
      selection: { to: 2, from: 1 },
      schema: {
        marks: { 'mark-text-highlight': MARK_TEXT_HIGHLIGHT },
        nodes: { math: MATH },
      },
      tr: {
        doc: {
          nodeAt: (_x) => {
            return { isAtom: false, isLeaf: true, isText: false };
          },
        },
      },
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);
    expect(mock).toHaveBeenLastCalledWith(state, 'mark-text-highlight');
    jest
      .spyOn(isNodeSelectionForNodeType, 'isNodeSelectionForNodeType')
      .mockReturnValue(true);
    expect(test).toBeTruthy();
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
        }
      }
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
  it('waitForUserInput function() should be return undefined when popup is present', () => {
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
        }
      }
    } as unknown as EditorState;

    const _dispatch = jest.fn();
    const event_ = {
      currentTarget: document.createElement('div'),
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

  it('should resolve with undefined when event is not defined or currentTarget is not an HTMLElement', async () => {
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
        }
      }
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
});
