import { HeadingCommand } from './HeadingCommand';
import { EditorState } from 'prosemirror-state';
import { MARK_FONT_TYPE } from './MarkNames';
import { Transform } from 'prosemirror-transform';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-test-builder';
import * as toggleHeading from './toggleHeading';
describe('HeadingCommand', () => {
  let plugin!: HeadingCommand;
  let schema1;
  let command: HeadingCommand;

  beforeEach(() => {
    plugin = new HeadingCommand(1);
    schema1 = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    command = new HeadingCommand(1);
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
    schema: { marks: { 'mark-font-type': MARK_FONT_TYPE } },
  } as unknown as EditorState;

  it('should call when execute function return true', () => {
    const test = plugin.isActive(state);
    expect(test).toBe(true);
  });
  it('should enable the command when text style mark is enabled', () => {
    const state = EditorState.create({ schema: schema1 });
    const isEnabled = command.isActive(state);
    expect(isEnabled).toBe(true);
  });

  it('execute without dispatch', () => {
    const state = EditorState.create({ schema: schema1 });
    const test = command.execute(state);
    expect(test).toBeTruthy();
  });

  it('execute function() should be return false', () => {
    const state = {
      schema: {},
      selection: {},
      tr: {
        setSelection: () => {
          return {};
        },
      },
    } as unknown as EditorState;
    jest
      .spyOn(toggleHeading, 'toggleHeading')
      .mockReturnValue({ docChanged: false } as unknown as Transform);
    const test = plugin.execute(state);
    expect(test).toBeFalsy();
  });

  it('should not render label', () => {
    expect(command.renderLabel()).toBeNull();
  });

  it('should execute custom', () => {
    expect(
      command.executeCustom(
        null as unknown as EditorState,
        null as unknown as Transform,
      )
    ).toBeNull();
  });
});
