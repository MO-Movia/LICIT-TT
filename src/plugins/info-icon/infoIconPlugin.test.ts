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
