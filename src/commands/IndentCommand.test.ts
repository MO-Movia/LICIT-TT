import { IndentCommand } from './IndentCommand';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-test-builder';
import { Transform } from 'prosemirror-transform';
import { MARK_EM } from './MarkNames';

describe('IndentCommand', () => {
  let schema1;
  let command: IndentCommand;
  beforeEach(() => {
    schema1 = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    command = new IndentCommand(1);
  });

  it('should create', () => {
    expect(command).toBeTruthy();
  });

  it('should enable the command when text style mark is enabled', () => {
    const state = EditorState.create({ schema: schema1 });
    const isEnabled = command.isActive(state);
    expect(isEnabled).toBe(true);
  });

  it('execute without dispatch', () => {
    const state = EditorState.create({ schema: schema1 });
    const test = command.execute(state);
    expect(test).toBeDefined();
  });
  it('should handle execute when trx.docChanged is false', () => {
    const test = command.execute({ schema: schema1, selection: {}, tr: { setSelection: () => { return {}; } } } as unknown as EditorState);
    expect(test).toBeDefined();
  });
  it('should handle execute when trx.docChanged is true', () => {
    const test = command.execute({
      schema: {nodes:{'blockquote':null,'heading':null,'paragraph':null}}, selection: {},
      tr: { setSelection: () => { return { doc: {nodeAt:()=>{return undefined;},nodesBetween:()=>{return {};}}, selection: {$from:{before:()=>{return 0;}}} }; } }
    } as unknown as EditorState);
    expect(test).toBeDefined();
       const test1 = command.execute({
      schema: {nodes:{'blockquote':null,'heading':null,'paragraph':null}},
      tr: { setSelection: () => { return { doc: {nodeAt:()=>{return {attrs:{indent:1}};},
      nodesBetween:()=>{return {};}}, selection: {$from:{before:()=>{return 0;}}} }; } },
      selection:{$head:{parent:{attrs:{indent:1}}}}
    } as unknown as EditorState);
    expect(test1).toBeDefined();
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
      schema: { marks: { em: MARK_EM } },
      tr: {
        doc: {
          nodeAt: () => {
            return { isAtom: true, isLeaf: true, isText: false };
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
    expect(command.executeCustom(state, tr, 0, 1)).toBeDefined();
  });

  it('should not render label', () => {
    expect(command.renderLabel()).toBeNull();
  });
});
