import {createEditor, doc, p} from 'jest-prosemirror';
import {
  EditorState,
  TextSelection,
  Plugin,
  PluginKey,
  Transaction,
} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {MultimediaPlugin} from './index';
import {resolveImage} from './ui/resolveImage';
import * as resolveImageMod from './ui/resolveImage';
import {ImageSourceCommand, insertImage} from './ImageSourceCommand';
import {ImageNodeView} from './ui/ImageNodeView';
import {Schema, Node} from 'prosemirror-model';
import {schema} from 'prosemirror-test-builder';
import {
  ImageUploadPlaceholderPlugin,
  uploadImageFiles,
  customEditorView,
} from './ImageUploadPlaceholderPlugin';
import {
  ImageEditorState,
  ImageEditorProps,
  ImageURLEditor,
} from './ui/ImageURLEditor';
import {ImageInlineEditor} from './ui/ImageInlineEditor';
import {EditorView} from 'prosemirror-view';
import {ImageNodeSpec, getAttrs} from './ImageNodeSpec';

import React from 'react';
import {EditorFocused} from './ui/CustomNodeView';

class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}

const plugin = new MultimediaPlugin();
const editor = createEditor(doc(p('<cursor>')), {
  plugins: [plugin],
});
const view = editor.view as unknown as EditorView;

const ImageArgs = {
  height: 400,
  id: '',
  src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',
  width: 200,
};

const state: EditorState = EditorState.create({
  schema: schema,
  selection: editor.selection,
  plugins: [new MultimediaPlugin()],
});
const newstate: EditorState = EditorState.create({
  schema: schema,
  selection: undefined,
  plugins: [new MultimediaPlugin()],
});

const selection = TextSelection.create(view.state.doc, 0, 0);
const tr = view.state.tr.setSelection(selection);
view.updateState(view.state.reconfigure({plugins: [plugin, new TestPlugin()]}));

view.dispatch(tr);
const newstate1: EditorState = EditorState.create({
  schema: schema,
  selection: selection,
  plugins: [new MultimediaPlugin()],
});
const srcevent = {
  target: {value: 'https://www.youtube.com/embed/ru60J99ojJw'},
} as React.ChangeEvent<HTMLInputElement>;

describe('MultimediaPlugin', () => {
  it('should handle Image', () => {
    const ImgSrcCmd = new ImageSourceCommand();

    ImgSrcCmd.executeWithUserInput(
      state,
      view.dispatch as (tr: Transform) => void,
      view,
      ImageArgs
    );
    ImgSrcCmd.__isEnabled(state, view);
    ImgSrcCmd.__isEnabled(newstate, view);
    ImgSrcCmd.__isEnabled(newstate1, view);
    ImgSrcCmd.isEnabled(state, view);
  });

  it('ImageNodespec ', () => {
    const img = document.createElement('img');
    img.src = '1200x800';
    img.setAttribute('align', 'left');
    getAttrs(img);
  });

  it('ImageNodespec ', () => {
    const img = document.createElement('img');
    img.src = '1200x800';
    img.style.cssFloat = 'left';
    getAttrs(img);
  });

  it('ImageNodespec ', () => {
    const img = document.createElement('img');
    img.src = '1200x800';
    img.style.cssFloat = 'right';
    getAttrs(img);
  });

  it('ImageNodespec ', () => {
    const img = document.createElement('img');
    img.src = '1200x800';
    img.style.display = 'block';
    getAttrs(img);
  });

  it('ImageNodeView ', () => {
    const node = {
      attrs: {
        id: '',
        align: null,
        alt: '',
        crop: null,
        height: 200,
        rotate: null,
        src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',

        title: '',
        width: 400,
      },
    } as unknown as Node;
    expect(ImageNodeSpec.toDOM?.(node)).toEqual([
      'img',
      {
        align: null,
        alt: '',
        crop: null,
        height: 200,
        id: '',
        rotate: null,
        src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',
        title: '',
        width: 400,
      },
    ]);
  });
});

describe('Image Node View ', () => {
  it('should handle View', () => {
    const MMplugin = new MultimediaPlugin();
    const editor = createEditor(doc(p('<cursor>')), {
      plugins: [MMplugin],
    });

    const schema = MMplugin.getEffectiveSchema(editor.schema);

    const modSchema = new Schema({
      nodes: schema.spec.nodes,
    });

    const effSchema = MMplugin.getEffectiveSchema(modSchema);
    const newNode = effSchema.node(effSchema.nodes.paragraph);
    const newruntime = editor.view['runtime'];
    const foc = {
      focused: true,
      runtime: newruntime,
    };
    const editfoc = Object.assign(view, foc);

    const ImageNdView = new ImageNodeView(newNode, editfoc, () => 0, []);
    expect(ImageNdView).toBeTruthy();
    // Need to catch async errors from this call
    // ImageNdView.__renderReactComponent();
  });
  it('should handle image placeholder plugin', () => {
    const plugin = new ImageUploadPlaceholderPlugin();
    expect(plugin).toBeDefined();

    const editor = createEditor(doc(p('<cursor>')), {
      plugins: [plugin],
    });
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [plugin],
    });
    expect(state.plugins).toContain(plugin);
  });
});

it('should resolve Image - Img Instance', async () => {
  const res = {
    complete: true,
    height: 400,
    naturalHeight: 400,
    naturalWidth: 200,
    src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',
    width: 200,
  };

  const isImgInsMock = jest.spyOn(resolveImageMod, 'isImgInstance');
  isImgInsMock.mockReturnValue(true);
  global.document.createElement = (function (create) {
    return function (...args) {
      const element = create.apply(this, args);

      if (element.tagName === 'IMG') {
        setTimeout(() => {
          element.onload(new Event('load'));
        }, 100);
      }
      return element;
    };
  })(document.createElement);

  await resolveImage(res.src);
});

describe('ImageEditor ', () => {
  const attrs = {
    id: '',
    align: null,
    alt: '',
    crop: null,
    height: 200,
    rotate: null,
    src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',

    title: '',
    width: 400,
  };
  const ImgState: ImageEditorState = {
    id: attrs.id,
    src: attrs.src,
    width: attrs.width,
    height: attrs.height,
    validValue: {},
  };
  const properties: ImageEditorProps = {
    initialValue: {},
    close: (_val?) => undefined,
  };
  const newState = state.apply(
    insertImage(state.tr, schema, ImgState.src) as Transaction
  );
  const ImgeditorIns = new ImageURLEditor(properties, newState);
  ImgeditorIns._didSrcChange();

  it('should change on src Change Event', async () => {
    expect(() => ImgeditorIns._onSrcChange(srcevent)).not.toThrow();
  });
  it('should check on src Change Event', async () => {
    expect(() => ImgeditorIns._didSrcChange()).not.toThrow();
  });

  it('should handle image placeholder plugin', () => {
    const plugin = new ImageUploadPlaceholderPlugin();
    const editor = createEditor(doc(p('<cursor>')), {
      plugins: [plugin],
    });
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [plugin],
    });
    expect(plugin).toBeDefined();
    expect(state.plugins).toContain(plugin);
  });

  it('Image Inline Editor', async () => {
    const props = {
      onSelect: (_val: 'RIGHT') => undefined,
      value: {align: 'RIGHT'},
    };
    const ImgInlinEdtr = new ImageInlineEditor(props);
    const x = ImgInlinEdtr.render();
    expect(x).toBeDefined();
  });

  it('should upload image files readonly and disabled true and runtime.canuploadimage true', () => {
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new MultimediaPlugin()],
    });
    const view1 = new EditorView(document.querySelector('#editor'), {
      state,
    });
    const cusEdtView = {
      ...view1,
      runtime: {canUploadImage: () => true},
      readOnly: false,
      disabled: false,
    };
    const view: customEditorView = cusEdtView as customEditorView;

    const filex: File = new File([], 'NEW FILE');

    expect(uploadImageFiles(view, [filex], {x: 1, y: 2})).toBeDefined();
  });

  it('should upload image files readonly and disabled true and runtime.canuploadimage true', () => {
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new MultimediaPlugin()],
    });
    const view1 = new EditorView(document.querySelector('#editor'), {
      state,
    });
    const cusEdtView = {
      ...view1,
      runtime: {},
      readOnly: false,
      disabled: false,
    };
    const view: customEditorView = cusEdtView as customEditorView;
    const filex: File = new File([], 'NEW FILE');

    expect(uploadImageFiles(view, [filex], {x: 1, y: 2})).toBeDefined();
  });
});

describe('resolveImage ', () => {
  it('should resolve Image - onLoad', async () => {
    const res = {
      complete: true,
      height: 400,
      naturalHeight: 400,
      naturalWidth: 200,
      src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',
      width: 200,
    };

    await resolveImage(res.src);
  });
});

describe('resolveImage ', () => {
  it('should resolve Image - onLoad offline', async () => {
    const spy = jest
      .spyOn(Object, 'hasOwn')
      .mockReturnValue(true);
    const res = {
      complete: true,
      height: 400,
      naturalHeight: 400,
      naturalWidth: 200,
      src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',
      width: 200,
    };

    await resolveImage(res.src);
    expect(spy).toBeCalled();
  });
});

describe('Image Node View ', () => {
  it('should change attrs', () => {
    const MMplugin = new MultimediaPlugin();
    const editor = createEditor(doc(p('<cursor>')), {
      plugins: [MMplugin],
    });

    const schema = MMplugin.getEffectiveSchema(editor.schema);

    const modSchema = new Schema({
      nodes: schema.spec.nodes,
    });

    const effSchema = MMplugin.getEffectiveSchema(modSchema);
    const newNode = effSchema.node(effSchema.nodes.paragraph, {
      active: true,
      crop: false,
      rotate: false,
    });

    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      {mount: dom},
      {
        state: state,
      }
    );

    const newState = EditorState.create({
      doc: schema.nodeFromJSON({
        type: 'doc',
        attrs: {layout: null, padding: null, width: null, counterFlags: null},
        content: [
          {
            type: 'paragraph',
            attrs: {
              align: null,
              color: null,
              id: null,
              indent: null,
              lineSpacing: null,
              paddingBottom: null,
              paddingTop: null,
            },
            content: [
              {
                type: 'image',
                attrs: {
                  align: null,
                  alt: '',
                  crop: false,
                  height: null,
                  rotate: false,
                  src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',
                  title: '',
                  width: null,
                  fitToParent: 0,
                },
              },
            ],
          },
        ],
      }),
      plugins: [new MultimediaPlugin()],
    });

    view.updateState(newState);

    const spyresolveImage = jest.spyOn(resolveImageMod, 'resolveImage');
    spyresolveImage.mockResolvedValue({
      complete: true,
      height: 200,
      naturalHeight: 10,
      naturalWidth: 10,
      src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',
      width: 150,
    });

    jest.mock('./ui/ImageNodeView', () => ({
      myFunction: jest.fn().mockReturnValue(true),
    }));
    const foc = {
      focused: true,
      readOnly: false,
      // Image Proxy
      canProxyImageSrc: (_src: string) => true,
      getProxyImageSrc: jest
        .fn()
        .mockReturnValue(Promise.resolve('http:image.png')),

      // Image Upload
      canUploadImage: () => true,
      uploadImage: jest.fn().mockResolvedValue({
        height: 200,
        id: 'Test-1',
        src: '',
        width: 150,
      }),

      // Comments
      canComment: () => true,
      createCommentThreadID: () => 'Test-ID',

      // External HTML
      canLoadHTML: () => true,
      loadHTML: jest.fn().mockResolvedValue('baz'),
    };
    const editFoc = {...editor.view, ...foc} as unknown as EditorFocused;
    const ImageNdView = new ImageNodeView(newNode, editFoc, () => 10, []);
    expect(ImageNdView).toBeTruthy();
  });
});
