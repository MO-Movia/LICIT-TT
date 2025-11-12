/* eslint-disable */

import {InfoIconPlugin, InfoIconDialog} from './index';
import MenuPlugin, {markActive, getLink} from './plugins/menu/index';
import {Transform} from 'prosemirror-transform';
import {schema, builders} from 'prosemirror-test-builder';
import {Plugin, PluginKey, EditorState, TextSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {Schema} from 'prosemirror-model';
import {InfoIconView} from './infoIconView';
import {InfoIconCommand} from './infoIconCommand';
import {createEditor} from 'jest-prosemirror';
import {createPopUp} from '@modusoperandi/licit-ui-commands';

class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}

describe('Info Plugin Extended', () => {
  const info = {
    from: 0,
    to: 9,
    description: 'Test description',
    infoIcon: 'faIcon',
  };

  const mySchema = new Schema({
    nodes: schema.spec.nodes,
    marks: schema.spec.marks,
  });
  const plugin = new InfoIconPlugin();
  const effSchema = plugin.getEffectiveSchema(mySchema);

  const newInfoIconNode = effSchema.node(effSchema.nodes.infoicon, info);
  plugin.initButtonCommands();
  const {doc, p} = builders(mySchema, {p: {nodeType: 'paragraph'}});

  it('Infoiconview call createInfoIconTooltip', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const cView = new InfoIconView(
      view.state.doc.nodeAt(6),
      view,
      undefined as any
    );
    const ttContent = document.createElement('div');
    ttContent.id = 'tooltip-content';
    ttContent.innerHTML =
      '"<p>test <a href="ingo" title="ingo">ingo</a> icon</p>"';
    const errorinfodiv = document.createElement('div');
    errorinfodiv.className = 'ProseMirror czi-prosemirror-editor';
    const tooltip = document.createElement('div');
    tooltip.className = 'molcit-infoicon-tooltip';

    const clickEvent = new MouseEvent('mouseclick', {
      clientX: 1120,
      clientY: 125,
    });

    cView.setContentRight(clickEvent, errorinfodiv, tooltip, ttContent);
  });
});

describe('Info Plugin', () => {
  const info = {
    from: 0,
    to: 9,
    description: 'Test description',
    infoIcon: 'faIcon',
  };

  const mySchema = new Schema({
    nodes: schema.spec.nodes,
    marks: schema.spec.marks,
  });
  const plugin = new InfoIconPlugin();
  const effSchema = plugin.getEffectiveSchema(mySchema);

  const newInfoIconNode = effSchema.node(effSchema.nodes.infoicon, info);
  plugin.initButtonCommands();
  const {doc, p} = builders(mySchema, {p: {nodeType: 'paragraph'}});

  it('should create infoplugin', () => {
    const state = EditorState.create({
      doc: doc(p(newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);

    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    plugin.getState(state);
    expect(state.doc.nodeAt(0)).toBeDefined();
  });

  it('InfoiconCOMMAND ', () => {
    const before = 'hello';
    const after = ' world';
    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const infoIcon = {
      from: '1',
      to: '3',
      description: 'test description',
      mode: 0,
      editorView: view,
      infoIcon: '',
    };

    const infoIconCommand = new InfoIconCommand('');
    infoIconCommand.isEnabled(state);
    infoIconCommand.createInfoObject(view, 0);
    infoIconCommand.getParentNodeSize(state);
    infoIconCommand.getDocContent(infoIcon);
  });
  it('isList should return ', () => {
    const before = 'hello';

    const infoIconObj = {
      from: '1',
      to: '3',
      description: 'test description',
      mode: 0,
      infoIcon: '',
    };
    const infoiconnode = effSchema.node(effSchema.nodes.infoicon, infoIconObj);
    const plugin = new InfoIconPlugin();
    const after = ' world';
    const state = EditorState.create({
      doc: doc(p(before, infoiconnode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const infoIconCommand = new InfoIconCommand('');
    infoIconCommand.isList(state.selection.$head, 1);
  });

  it('Infoiconview getNodePosition ', () => {
    const before = 'hello';
    const after = ' world';
    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);
    const mockEvent = {
      clientX: 358,
      clientY: 115,
      offsetY: -10,
    } as MouseEvent;
    const spyImgNodView = jest.spyOn(cView, 'getNodePosEx');
    spyImgNodView.mockReturnValue(1);
    cView.getNodePosition(mockEvent);
    cView.parentNodeType(view.state.doc.nodeAt(6));
  });

  it('should return ParentNodePOS', () => {
    const before = 'hello';

    const infoIconObj = {
      from: '1',
      to: '3',
      description: 'test description',
      infoIcon: '',
    };
    const infoiconnode = effSchema.node(effSchema.nodes.infoicon, infoIconObj);
    const plugin = new InfoIconPlugin();
    const after = ' world';
    const state = EditorState.create({
      doc: doc(p(before, infoiconnode, after)),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');
    document.body.appendChild(dom);

    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const selection = TextSelection.create(view.state.doc, 7, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
    );

    view.dispatch(tr);
    const infoIconCommand = new InfoIconCommand();

    infoIconCommand.isEnabled(state);
    const parentpos = infoIconCommand.getParentNodeSize(state);
    expect(parentpos).toBe(13);

    const gPN = infoIconCommand.getParentStartPos(state.selection.$head);
    expect(gPN).toBe(1);
  });

  it('should executeWithUserInput', () => {
    const modSchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const infoIconObj = {
      from: '1',
      to: '1',
      description: 'test description',
      infoIcon: '',
    };
    const plugin = new InfoIconPlugin();
    const effSchema = plugin.getEffectiveSchema(modSchema);
    const {doc, p} = builders(effSchema, {p: {nodeType: 'paragraph'}});

    const state = EditorState.create({
      doc: doc(p(infoIconObj)),
      schema: effSchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    // Set up our document body
    document.body.innerHTML = '<div></div>';
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    const infoIcon = {
      from: '1',
      to: '3',
      description: 'test description',
      editorView: view,
      infoIcon: '',
    };

    const selection = TextSelection.create(view.state.doc, 1, 2);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
    );

    view.dispatch(tr);
    const addInfoIconcmd = new InfoIconCommand();

    addInfoIconcmd.createInfoIconAttrs(1, 3, 'test description', infoIcon);
    addInfoIconcmd._isEnabled(view.state);

    const getNodePosEx = jest.spyOn(addInfoIconcmd, 'getFragm');
    const getFragm = document.createElement('div');
    getFragm.innerHTML = '<p>Test Doc</p>';
    getNodePosEx.mockReturnValue(getFragm);
    const spyiSNVMock = jest.spyOn(addInfoIconcmd, 'isList');
    spyiSNVMock.mockReturnValue(true);
    const bok = addInfoIconcmd.executeWithUserInput(
      state,
      view.dispatch as (tr: Transform) => void,
      view,
      infoIcon as any
    );
    expect(bok).toBeFalsy();
  });

  it('should Wait For User Input', () => {
    const before = 'Hello World!!!';
    const modSchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const infoIconObj = {
      from: '1',
      to: '1',
      description: 'test description',
      infoIcon: '',
    };
    const plugin = new InfoIconPlugin();
    const effSchema = plugin.getEffectiveSchema(modSchema);
    const state = EditorState.create({
      doc: doc(p(infoIconObj)),
      schema: effSchema,
    });

    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const editor = createEditor(doc('<cursor>', p('Hello')));
    const AddInfoICmd = new InfoIconCommand();
    AddInfoICmd.waitForUserInput(editor.state, undefined, view);
  });

  it('should Wait For User Input', () => {
    const before = 'Hello World!!!';
    const modSchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    });
    const infoIconObj = {
      from: '1',
      to: '1',
      description: 'test description',
      infoIcon: '',
    };
    const plugin = new InfoIconPlugin();
    const effSchema = plugin.getEffectiveSchema(modSchema);
    const state = EditorState.create({
      doc: doc(p(infoIconObj)),
      schema: effSchema,
    });

    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const editor = createEditor(doc('<cursor>', p('Hello')));
    const AddInfoICmd = new InfoIconCommand();
    AddInfoICmd._popUp = createPopUp(
      InfoIconDialog,
      AddInfoICmd.createInfoObject(view, 1),
      {
        modal: true,
        IsChildDialog: false,
        autoDismiss: false,
      }
    );
    AddInfoICmd.waitForUserInput(editor.state, undefined, view);
  });
  it('should call initKeyCommands', () => {
    expect(plugin.initKeyCommands()).toBeDefined();
  });
  it('Infoiconview call parentNodeType', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const cView = new InfoIconView(
      view.state.doc.nodeAt(6),
      view,
      undefined as any
    );
    const clickEvent = new MouseEvent('mouseclick', {
      clientX: 281,
      clientY: 125,
    });
    cView.parentNodeType(view.state.doc.nodeAt(0));

    let divEl = document.createElement('div');
    let aTag = document.createElement('a');
    aTag.href = 'test.com';
    aTag.innerHTML = 'Test Link';
    divEl.id = 'tooltip-content';
    divEl.style.right = 'auto';
    divEl.appendChild(aTag);
    document.body.appendChild(divEl);
    cView.open(clickEvent);
  });

  it('Infoiconview ', () => {
    const state = EditorState.create({
      doc: doc(p(newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const infoIcon = {
      from: '1',
      to: '3',
      description: 'test description',
      mode: 0,
      editorView: view,
      infoIcon: '',
    };

    const cView = new InfoIconView(view.state.doc.nodeAt(0), view, undefined);
    const e = new MouseEvent('mouseenter', {clientX: 281, clientY: 125});
    const clickEvent = new MouseEvent('mouseclick', {
      clientX: 281,
      clientY: 125,
    });
    const errorinfodiv = document.createElement('div');
    errorinfodiv.className = 'ProseMirror czi-prosemirror-editor';
    cView.parentNodeType(view.state.doc.nodeAt(0));
    cView.hideSourceText(e);
    cView.stopEvent(e);
    cView.ignoreMutation();
    cView.onInfoRemove(view);
    cView._popUp_subMenu = createPopUp(
      InfoIconDialog,
      cView.createInfoObject(view, 1),
      {
        modal: true,
        IsChildDialog: false,
        autoDismiss: false,
      }
    );
    cView.onEditInfo(view);
    cView.isPNodeNull(null);

    cView._onClose();
    cView.updateInfoIcon(view, infoIcon);
    cView._popUp_subMenu = createPopUp(
      InfoIconDialog,
      cView.createInfoObject(view, 1),
      {
        modal: true,
        IsChildDialog: false,
        autoDismiss: false,
      }
    );

    const custDiv = document.createElement('div');
    custDiv.className = 'molcit-infoicon-submenu';
    document.body.appendChild(custDiv);
    cView.destroyPopup();
    cView.onCancel(view);

    cView.selectNode(clickEvent);
    cView.onInfoSubMenuMouseOut();
    cView.open(clickEvent);
    cView.showSourceText(clickEvent);
  });

  it('Infoiconview call createInfoIconTooltip', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const cView = new InfoIconView(
      view.state.doc.nodeAt(6),
      view,
      undefined as any
    );
    const ttContent = document.createElement('div');
    ttContent.id = 'tooltip-content';
    ttContent.innerHTML =
      "<a href='www.google.com'></a><p>test <a href='ingo' title='ingo'>ingo</a> icon</p>";
    const errorinfodiv = document.createElement('div');
    errorinfodiv.className = 'ProseMirror czi-prosemirror-editor';
    const tooltip = document.createElement('div');
    tooltip.className = 'molcit-infoicon-tooltip';

    const clickEvent = new MouseEvent('mouseclick', {
      clientX: 281,
      clientY: 125,
    });

    cView.setContentRight(clickEvent, errorinfodiv, tooltip, ttContent);
  });

  it('Infoiconview ', () => {
    const state = EditorState.create({
      doc: doc(p('Hello World', newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    const cView = new InfoIconView(view.state.doc.nodeAt(12), view, undefined);
    const selection = TextSelection.create(view.state.doc, 6, 10);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
    );
    view.dispatch(tr);
    cView.parentNodeType(view.state.doc.nodeAt(0));

    cView.isInfoIconNode(6);
    cView.isPNodeNull(view.state.doc.nodeAt(0));
  });

  it('Infoiconview ', () => {
    const state = EditorState.create({
      doc: doc(p(newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    const cView = new InfoIconView(view.state.doc.nodeAt(0), view, undefined);
    const errorinfodiv = document.createElement('div');
    errorinfodiv.className = 'molcit-infoicon-submenu';
    cView.onInfoSubMenuMouseOut();
    cView.destroyPopup();
  });

  it('Infoiconview selectNode with MouseEvent = undefined', () => {
    const state = EditorState.create({
      doc: doc(p(newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    const cView = new InfoIconView(
      view.state.doc.nodeAt(0),
      view,
      undefined as any
    );

    cView.selectNode(undefined as any);
  });

  it('Infoiconview selectNode', () => {
    const state = EditorState.create({
      doc: doc(p(newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    const cView = new InfoIconView(view.state.doc.nodeAt(0), view, undefined);

    const mouseclickEvent = new MouseEvent('mouseenter', {
      clientX: 281,
      clientY: 125,
    });
    cView.onCancel(view);
    cView.selectNode(mouseclickEvent);
    const errorinfodiv = document.createElement('div');
    errorinfodiv.className = 'molcit-infoicon-submenu';
    cView.isPNodeNull(view.state.doc.nodeAt(0));
    cView.destroyPopup();
  });
  it('menu plugin> selection empty for markActive', () => {
    const plugin = MenuPlugin();
    const state = EditorState.create({
      doc: doc(p(newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const {marks} = view.state.schema;

    markActive(view.state, marks.strong);
    getLink(view);
  });

  it('returns true if a marked range is empty', () => {
    const plugin = MenuPlugin();
    const state = EditorState.create({
      doc: doc(p('Hello World', newInfoIconNode)),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    const selection = TextSelection.create(view.state.doc, 6, 10);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
    );
    view.dispatch(tr);
    const {marks} = view.state.schema;

    markActive(view.state, marks.strong);
    getLink(view);
  });
});
