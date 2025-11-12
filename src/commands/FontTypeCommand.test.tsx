import {FontTypeCommand} from './FontTypeCommand';
import {EditorState} from 'prosemirror-state';
import {Schema, Node} from 'prosemirror-model';
import {schema} from 'prosemirror-test-builder';
import * as applymark from './applyMark';
import {Transform} from 'prosemirror-transform';

declare let beforeEach: jest.Lifecycle;
declare let describe: jest.Describe;
declare let it: jest.It;
declare const expect: jest.Expect;

describe('FontTypeCommand', () => {
  let schema1;
  let command: FontTypeCommand;
  let dispatch: jest.Mock;

  beforeEach(() => {
    schema1 = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    command = new FontTypeCommand('Arial');
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

  it('should apply the font size mark to the current selection', () => {
    const state = EditorState.create({schema: schema1});
    command.execute(state, undefined);
    const transform = new Transform(schema as unknown as Node);
    expect(dispatch).not.toHaveBeenCalledWith(expect.any(transform));
  });
});

describe('FontTypeCommand', () => {
  let plugin!: FontTypeCommand;
  beforeEach(() => {
    plugin = new FontTypeCommand('Arielle');
  });
  it('should create when name is null', () => {
    expect(new FontTypeCommand(null)).toBeTruthy();
  });
  it('should create', () => {
    expect(plugin).toBeTruthy();
  });

  const MARK_FONT_TYPE = {
    attrs: {
      fontType: {default: 'Arial'},
    },
    parseDOM: [
      {
        style: 'font-family',
        getAttrs: (value) => ({fontType: value}),
      },
    ],
    toDOM: (mark) => [
      'span',
      {style: `font-family: ${mark.attrs.fontType}`},
      0,
    ],
  };

  it('should call isEnabled when mark-font-size undefined', () => {
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
    expect(test).toBe(false);
  });

  it('should call isEnabled when mark-font-size value is aviable', () => {
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
        from: 1,
        to: 2,
      },
      plugins: [],
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
      schema: {marks: {'mark-font-type': MARK_FONT_TYPE}},
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);
    plugin.execute(state, jest.fn());
    expect(test).toBe(false);
  });

  it("should call when isEnabled function return 'true' ", () => {
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
      schema: {marks: {'mark-font-type': MARK_FONT_TYPE}},
    } as unknown as EditorState;

    const test = plugin.isEnabled(state);
    expect(test).toBe(true);
  });

  it('should call when execute function return false', () => {
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
      schema: {marks: {'mark-font-type': MARK_FONT_TYPE}},
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

    const test = plugin.execute(state, (_x) => {
      return '';
    });
    expect(test).toBe(false);
  });

  it('should call when execute function return true', () => {
    jest
      .spyOn(applymark, 'applyMark')
      .mockReturnValue({docChanged: true} as unknown as Transform);
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
        resolve:()=>{
          return {pos:0};
        }
      },
    } as unknown as EditorState;

    const test = plugin.execute(state, (_x) => {
      return '';
    });
    expect(test).toBe(true);
  });
  it('should call when execute function return true', () => {
    jest
      .spyOn(applymark, 'applyMark')
      .mockReturnValue({docChanged: true} as unknown as Transform);
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
        resolve:()=>{
          return {pos:0};
        }
      },
    } as unknown as EditorState;
    plugin = new FontTypeCommand(null as unknown as string);
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
          resolve:()=>{
            return {pos:0};
          }
        },
      },
    } as unknown as EditorState;

    const test = plugin.execute(state, (_x) => {
      return '';
    });
    expect(test).toBe(true);
  });

  it('should be active', () => {
    expect(plugin.isActive()).toBeTruthy();
  });
  it('should handle cancel',()=>{
    expect(plugin.cancel()).toBeNull();
  });
  it('should handle renderLabel ',()=>{
    expect(plugin.renderLabel({} as unknown as EditorState)).toBeDefined();
  });
});
