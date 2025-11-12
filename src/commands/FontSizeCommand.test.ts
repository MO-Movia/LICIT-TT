import {FontSizeCommand} from './FontSizeCommand';
import {EditorState, TextSelection} from 'prosemirror-state';
import {MARK_FONT_SIZE, MARK_FONT_TYPE} from './MarkNames';
import {Schema, Node} from 'prosemirror-model';
import {schema} from 'prosemirror-test-builder';
import {Transform} from 'prosemirror-transform';
import * as applymark from './applyMark';
import * as ismarkcommandenabled from './isTextStyleMarkCommandEnabled';

describe('FontSizeCommand', () => {
  let plugin!: FontSizeCommand;
  beforeEach(() => {
    plugin = new FontSizeCommand(12);
  });
  it('should create', () => {
    expect(plugin).toBeTruthy();
  });

  const state = {
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a mock Prosemirror state.',
            },
          ],
        },
      ],
    },
    selection: {
      node: null,
      anchor: 0,
      head: 0,
    },
    plugins: [],
    schema: {marks: {'mark-font-size': MARK_FONT_SIZE}},
    tr: {
      doc: {
        nodeAt: (_x) => {
          return {isAtom: true, isLeaf: true, isText: false};
        },
        resolve:()=>{
          return {pos:0};
        },
        nodesBetween:()=>{}
      },

    },
  } as unknown as EditorState;

  it('should call when execute function return false', () => {
    const test = plugin.execute(state, (_x) => {
      return '';
    });
    expect(test).toBe(false);
  });
  it('should call when execute function return true', () => {
    jest
      .spyOn(applymark, 'applyMark')
      .mockReturnValue({docChanged: true} as unknown as Transform);

    const test = plugin.execute(state, (_x) => {
      return '';
    });
    expect(test).toBe(true);
  });

  it('should call when execute function return true', () => {
    jest.spyOn(applymark, 'applyMark').mockReturnValue({
      docChanged: false,
      storedMarksSet: true,
    } as unknown as Transform);

    const test = plugin.execute(state, (_x) => {
      return '';
    });
    expect(test).toBe(true);
  });

  it('should handle executecustom', () => {
    jest
      .spyOn(TextSelection, 'create')
      .mockReturnValue({} as unknown as TextSelection);
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
      },
      plugins: [],
      schema: {marks: {'mark-font-type': MARK_FONT_TYPE}},
      tr: {
        doc: {
          nodeAt: (_x) => {
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
    } as unknown as EditorState;
    const tr = {
      setSelection: () => {
        return {};
      },
      doc: {},
    } as unknown as Transform;
    const test = plugin.executeCustom(state, tr, 0, 1);
    expect(test).toBeDefined();
  });

  it('should handle when pt is undefined', () => {
    plugin._pt = undefined as unknown as number;
    jest
      .spyOn(TextSelection, 'create')
      .mockReturnValue({} as unknown as TextSelection);
    const state = {
      selection: {
        node: null,
        anchor: 0,
        head: 0,
      },
      plugins: [],
      schema: {marks: {'mark-font-size': MARK_FONT_SIZE}},
      tr: {
        doc: {
          nodeAt: (_x) => {
            return {isAtom: true, isLeaf: true, isText: false};
          },
        },
      },
    } as unknown as EditorState;
    const tr = {
      setSelection: () => {
        return {};
      },
      doc: {},
    } as unknown as Transform;
    const test = plugin.executeCustom(state, tr, 0, 1);
    expect(test).toBeDefined();
  });

  it('should call when executeCustom function return false', () => {
    const mock = jest.spyOn(
      ismarkcommandenabled,
      'isTextStyleMarkCommandEnabled'
    );
    const state = {
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This is a mock Prosemirror state.',
              },
            ],
          },
        ],
      },
      selection: {
        node: null,
        anchor: 0,
        head: 0,
        from: 0,
        to: 0,
      },
      plugins: [],
      schema: {marks: {'mark-font-size': undefined}},
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);
    expect(mock).toHaveBeenLastCalledWith(state, 'mark-font-size');
    expect(test).toBe(false);
  });
});

describe('FontSizeCommand', () => {
  let schema1;
  let command: FontSizeCommand;
  let dispatch: jest.Mock;

  beforeEach(() => {
    schema1 = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    command = new FontSizeCommand(14);
    dispatch = jest.fn();
  });

  it('should enable the command when text style mark is enabled', () => {
    const state = EditorState.create({schema: schema1});
    const isEnabled = command.isEnabled(state);
    expect(isEnabled).toBe(false);
  });

  it('should apply the font size mark to the current selection', () => {
    const state = EditorState.create({schema: schema1});
    command.execute(state, dispatch);
    const transform = new Transform(schema as unknown as Node);
    expect(dispatch).not.toHaveBeenCalledWith(expect.any(transform));
  });
  it('execute without dispatch', () => {
    const state = EditorState.create({schema: schema1});
    const test = command.execute(state);
    expect(test).toBeDefined();
  });
  it('should be active', () => {
    expect(command.isActive()).toBeTruthy();
  });
  it('should not render label', () => {
    expect(command.renderLabel()).toBeNull();
  });
});
