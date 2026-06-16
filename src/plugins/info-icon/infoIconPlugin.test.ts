/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { schema, builders } from 'prosemirror-test-builder';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { InfoIconView } from './infoIconView';
import { InfoIconCommand } from './infoIconCommand';
import { InfoIconNodeSpec } from './infoIconNodeSpec';
import { markActive, getLink } from './plugins/menu/index';
import { createEditor, doc, p } from 'jest-prosemirror';
import type { PopUpHandle } from '../../commands/ui/PopUp';
import { InfoIconPlugin, INFO_ICON, KEY_INFO_ICON, bindInfoIconView } from './infoIconPlugin';

describe('Info Icon Command', () => {
  const info = {
    from: 0,
    to: 9,
    description: 'Test description',
    infoIcon: 'faIcon',
  };

  const mySchema = new Schema({
    nodes: schema.spec.nodes.addToEnd('infoicon', InfoIconNodeSpec),
    marks: schema.spec.marks,
  });

  const { doc: pmDoc, p: para } = builders(mySchema, {
    p: { nodeType: 'paragraph' },
  });

  it('should compute parent positions', () => {
    const infoNode = mySchema.node(mySchema.nodes.infoicon, info);
    const state = EditorState.create({
      doc: pmDoc(para('Hello ', infoNode, 'World')),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    const view = new EditorView({ mount: dom }, { state });

    const selection = TextSelection.create(view.state.doc, 1, 3);
    view.dispatch(view.state.tr.setSelection(selection));

    const cmd = new InfoIconCommand();
    expect(cmd.getParentNodeSize(view.state)).toBeGreaterThan(0);
    expect(
      cmd.getParentStartPos(view.state.selection.$head)
    ).toBeGreaterThanOrEqual(1);
  });

  it('InfoIconView basic behaviors', () => {
    const infoNode = mySchema.node(mySchema.nodes.infoicon, info);
    const state = EditorState.create({
      doc: pmDoc(para('Hello ', infoNode, 'World')),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(7), view, undefined);
    expect(cView.stopEvent(new MouseEvent('click'))).toBe(false);
    expect(cView.ignoreMutation()).toBe(true);
  });

  it('waitForUserInput returns when popup exists', async () => {
    const editor = createEditor(doc('<cursor>', p('Hello')));
    const dom = document.createElement('div');
    const view = new EditorView({ mount: dom }, { state: editor.state });
    const cmd = new InfoIconCommand();
    cmd._popUp = { close: jest.fn() } as unknown as PopUpHandle;
    const result = await cmd.waitForUserInput(editor.state, undefined, view);
    expect(result).toBeUndefined();
  });
});

describe('Info Icon Menu Helpers', () => {
  const mySchema = new Schema({
    nodes: schema.spec.nodes.addToEnd('infoicon', InfoIconNodeSpec),
    marks: schema.spec.marks,
  });
  const { doc: pmDoc, p: para } = builders(mySchema, {
    p: { nodeType: 'paragraph' },
  });

  it('markActive and getLink should be callable', () => {
    const selection = TextSelection.create(pmDoc(para('Hello')), 1, 6);
    const state = EditorState.create({
      doc: pmDoc(para('Hello')),
      schema: mySchema,
      selection,
    });
    const dom = document.createElement('div');
    const view = new EditorView({ mount: dom }, { state });

    const { marks } = view.state.schema;
    expect(typeof markActive(view.state, marks.strong)).toBe('boolean');
    expect(getLink(view)).toBe('Hello');
  });
});

describe('InfoIconPlugin', () => {
  it('adds the info icon node to the schema and key commands', () => {
    const plugin = new InfoIconPlugin();
    const schemaWithInfoIcon = plugin.getEffectiveSchema(schema);
    const keyCommands = plugin.initKeyCommands() as {
      props?: { handleKeyDown?: unknown };
      spec?: unknown;
    };

    expect(schemaWithInfoIcon.nodes[INFO_ICON]).toBeDefined();
    expect(keyCommands).toBeDefined();
  });

  it('creates button commands for light and dark themes', () => {
    const plugin = new InfoIconPlugin();
    const lightButtons = plugin.initButtonCommands('light') as Record<string, unknown>;
    const darkButtons = plugin.initButtonCommands('dark') as Record<string, unknown>;

    expect(Object.keys(lightButtons)[0]).toContain('Add Info Icon');
    expect(Object.keys(darkButtons)[0]).toContain('Add Info Icon');
    expect(lightButtons).not.toEqual(darkButtons);
  });

  it('binds node views and executes the static create helper', () => {
    const plugin = new InfoIconPlugin();
    const schemaWithInfoIcon = plugin.getEffectiveSchema(schema);
    const infoNode = schemaWithInfoIcon.node(INFO_ICON, {
      from: 0,
      to: 1,
      description: 'desc',
      infoIcon: 'icon',
    });
    const view = {
      state: EditorState.create({
        doc: schemaWithInfoIcon.node('doc', null, [
          schemaWithInfoIcon.node('paragraph', null, []),
        ]),
        schema: schemaWithInfoIcon,
      }),
    } as unknown as EditorView;
    const dispatch = jest.fn();

    expect(bindInfoIconView(infoNode, view, () => 1)).toBeInstanceOf(InfoIconView);
    expect(
      InfoIconPlugin.createInfoIcon(view.state, dispatch as never, view)
    ).toBe(false);
    expect(KEY_INFO_ICON.common).toContain('Mod-Alt');
  });
});
