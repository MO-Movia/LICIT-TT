/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {createEditor, doc, p} from 'jest-prosemirror';
import {
  EditorState,
  TextSelection,
  Transaction,
  Plugin,
  PluginKey,
} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {MultimediaPlugin, bindImageView, bindVideoView} from './index';
import {VideoEditorState} from './ui/VideoEditor';
import {VideoSourceCommand, insertIFrame} from './VideoSourceCommand';
import {ImageUploadCommand} from './ImageUploadCommand';
import {VideoUploadCommand} from './VideoUploadCommand';
import {isOffline} from './ui/isOffline';
import {ImageNodeView} from './ui/ImageNodeView';
import {EditorView} from 'prosemirror-view';
import {VideoFromURLCommand} from './VideoFromURLCommand';
import {SelectionObserver} from './ui/SelectionObserver';
import {uuid} from './ui/uuid';
import {CustomNodeView, EditorFocused} from './ui/CustomNodeView';
import {ImageFromURLCommand} from './ImageFromURLCommand';
import {EditorRuntime, ImageLike} from './Types';

class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}

describe('MultimediaPlugin', () => {
  const plugin = new MultimediaPlugin();
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [plugin],
  });
  const view = editor.view as unknown as EditorView;

  const schema = plugin.getEffectiveSchema(editor.schema);
  const state: EditorState = EditorState.create({
    doc: doc(p('Hello World!!!')),
    schema: schema,
    selection: editor.selection,
    plugins: [new MultimediaPlugin()],
  });

  const selection = TextSelection.create(view.state.doc, 0, 0);
  const tr = view.state.tr.setSelection(selection);
  view.updateState(
    view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
  );

  view.dispatch(tr);

  const attrs = {
    id: '',
    align: null,
    alt: '',
    crop: null,
    height: 113,
    rotate: null,
    src: 'https://www.youtube.com/embed/ru60J99ojJw',
    title: '',
    width: 200,
  };

  const veState: VideoEditorState = {
    id: attrs.id,
    src: attrs.src,
    width: attrs.width,
    height: attrs.height,
    validValue: true,
  };

  isOffline();
  new VideoSourceCommand().executeWithUserInput(
    state,
    view.dispatch as (tr: Transform) => void,
    view,
    veState
  );

  new VideoSourceCommand().__isEnabled(state, view);

  it('should handle Video', () => {
    const plugin = new MultimediaPlugin();
    const editor = createEditor(doc(p('<cursor>')), {
      plugins: [plugin],
    });

    const schema = plugin.getEffectiveSchema(editor.schema);

    const attrs = {
      id: '',
      align: null,
      alt: '',
      crop: null,
      height: 113,
      rotate: null,
      src: 'https://www.youtube.com/embed/ru60J99ojJw',
      title: '',
      width: 200,
    };

    const veState: VideoEditorState = {
      id: attrs.id,
      src: attrs.src,
      width: attrs.width,
      height: attrs.height,
      validValue: true,
    };

    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new MultimediaPlugin()],
    });

    const newState = state.apply(
      insertIFrame(state.tr, schema, veState) as Transaction
    );

    expect(() =>
      new VideoSourceCommand().executeWithUserInput(
        state,
        view.dispatch,
        view,
        veState
      )
    ).toThrow();

    const json = state.doc.toJSON();
    const videoJSON = newState.doc.toJSON();

    expect(json).not.toEqual(videoJSON);

    expect(JSON.stringify(videoJSON)).toContain(
      JSON.stringify({
        type: 'video',
        attrs: attrs,
      })
    );
  });

  it('returns different menu labels for light and dark themes', () => {
    const plugin = new MultimediaPlugin();
    const lightMenu = plugin.initButtonCommands('light') as Record<string, unknown>;
    const darkMenu = plugin.initButtonCommands('dark') as Record<string, unknown>;

    const lightKey = Object.keys(lightMenu)[0];
    const darkKey = Object.keys(darkMenu)[0];

    expect(lightKey).toContain('Insert MultiMedia');
    expect(darkKey).toContain('Insert MultiMedia');
    expect(lightKey).not.toEqual(darkKey);
  });

  it('__isEnabled in VideoSourceCommand', () => {
    const statetest: EditorState = EditorState.create({
      doc: doc(p('Hello World!!!')),
      schema: schema,
      selection: undefined,
      plugins: [new MultimediaPlugin()],
    });
    const enabled = new VideoSourceCommand().__isEnabled(statetest, view);
    expect(enabled).toBeDefined();
  });

  it('isEnabled in VideoSourceCommand', () => {
    const statetest: EditorState = EditorState.create({
      doc: doc(p('Hello World!!!')),
      schema: schema,
      selection: undefined,
      plugins: [new MultimediaPlugin()],
    });
    const enabled = new VideoSourceCommand().isEnabled(statetest, view);
    expect(enabled).toBeDefined();
  });

  it('isEnabled in image', () => {
    const trans = new ImageUploadCommand();
    const editorruntime: EditorRuntime = {
      // Image Proxy
      canProxyImageSrc: () => {
        return true;
      },
      // getProxyImageSrc: () => Promise.reject(),
      // Image Upload
      canUploadImage: undefined,
      uploadImage: undefined,
    };
    expect(trans.isEnabled(state)).toBeTruthy();
    editorruntime.uploadImage = () => Promise.resolve({} as ImageLike);
    expect(trans.isEnabled(state)).toBeTruthy();
    editorruntime.canUploadImage = () => false;
    expect(trans.isEnabled(state)).toBeTruthy();
  });

  it('Image Upload Command', () => {
    const trans = new ImageUploadCommand();

    const state = EditorState.create({
      doc: doc(p('Hello World!!')),
      schema: schema,
    });

    expect(trans.isEnabled(state)).toBeDefined();
    expect(trans.getEditor()).toBeDefined();
  });

  it('isEnabled', () => {
    const trans = new ImageUploadCommand();

    const state = EditorState.create({
      doc: doc(p('Hello World!!')),
      schema: schema,
    });

    expect(trans.isEnabled(state)).toBeDefined();
  });

  it('getEditor', () => {
    const trans = new VideoUploadCommand();
    expect(trans.getEditor()).toBeDefined();
  });

  it('can Image Upload', () => {
    const trans = new ImageUploadCommand();
    const state = EditorState.create({
      doc: doc(p('Hello World!!')),
      schema: schema,
    });

    expect(trans.isEnabled(state)).toBeDefined();
  });

  it('can Image Upload (case 2)', () => {
    const trans = new ImageUploadCommand();
    const state = EditorState.create({
      doc: doc(p('Hello World!!')),
      schema: schema,
    });

    expect(trans.isEnabled(state)).toBeDefined();
  });

  it('bindImageView', () => {
    const view = new EditorView(document.querySelector('#editor'), {
      state,
      handleKeyPress: () => undefined,
    });
    expect(bindImageView(doc(p('<cursor>')), view, () => 1)).toBeDefined();
  });

  it('bindVideoView', () => {
    const view = new EditorView(document.querySelector('#editor'), {
      state,
      handleKeyPress: () => undefined,
    });
    expect(bindVideoView(doc(p('<cursor>')), view, () => 1)).toBeDefined();
  });

  it('selectionObserver', () => {
    const selection = new SelectionObserver(() => undefined);
    selection.disconnect();
    selection.takeRecords();
    selection._check();
    expect(selection.takeRecords()).toEqual([]);
  });

  it('EditorFocused', () => {
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    expect(view.state).toEqual(state);
  });

  it('icon render', () => {
    const trans = new ImageFromURLCommand();
    expect(trans.getEditor()).toBeDefined();
    const trans1 = new VideoFromURLCommand();
    expect(trans1.getEditor()).toBeDefined();
  });

  it('uuid', () => {
    const id = uuid();
    expect(id).toBeTruthy();
  });

  it('icon', () => {
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );
    const node = view.state.doc.nodeAt(0);
    expect(node).toBeDefined();

    const imagenodeview = new ImageNodeView(
      node,
      view as unknown as EditorFocused,
      () => 0,
      []
    );
    imagenodeview.update(node, []);
    imagenodeview.renderReactComponent();
    const demodom = document.createElement('div');

    imagenodeview._updateDOM(demodom);
    expect(
      () =>
        new CustomNodeView(node, view as unknown as EditorFocused, () => 1, [])
    ).toThrow();
  });

  it('should init buttons', () => {
    expect(() => plugin.initButtonCommands('dark')).not.toThrow();
  });
});
