import {VideoNodeView, VideoViewBody} from './VideoNodeView';
import {EditorState} from 'prosemirror-state';
import {schema} from 'prosemirror-schema-basic';
import {Schema, Node} from 'prosemirror-model';
import {EditorFocused} from './CustomNodeView';
import {MultimediaPlugin} from '../index';
import {createEditor, doc, p} from 'jest-prosemirror';
import {PopUpHandle} from '@modusoperandi/licit-ui-commands';
// Mock data

const plugin = new MultimediaPlugin();
const editor = createEditor(doc(p('<cursor>')), {
  plugins: [plugin],
});
const editorState = EditorState.create({
  schema: schema,
  selection: editor.selection,
  plugins: [new MultimediaPlugin()],
});

// Mock ProseMirror editor view
const dummyEditorFocused: EditorFocused = {
  focused: true,
  runtime: {},
  readOnly: false,
  state: editorState,
  dispatch: jest.fn(),
  update: jest.fn(),

  dom: document.createElement('div'),

  focus: jest.fn(),
  hasFocus: jest.fn(),
} as unknown as EditorFocused;
const dummyNodeWithImage = {
  type: {
    name: 'image',
    spec: {
      attrs: {
        src: {default: null},
        alt: {default: null},
      },
      inline: true,
      group: 'inline',
      draggable: true,
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs: (dom: HTMLElement) => ({
            src: dom.getAttribute('src'),
            alt: dom.getAttribute('alt'),
          }),
        },
      ],
      toDOM: (node) => ['img', {src: node.attrs.src, alt: node.attrs.alt}],
    },
    create: (attrs) => ({
      type: 'image',
      attrs,
    }),
  },
  attrs: {
    src: 'https://example.com/image.jpg',
    alt: 'An example image',
  },
};

describe('video node view ', () => {
  it('should handle VideoNodeView', () => {
    const videonodeview = new VideoNodeView(
      dummyNodeWithImage as unknown as Node,
      dummyEditorFocused,
      () => 1,
      []
    );
    expect(videonodeview).toBeDefined();
  });
  it('should handle update', () => {
    const videonodeview = new VideoNodeView(
      dummyNodeWithImage as unknown as Node,
      dummyEditorFocused,
      () => 1,
      []
    );
    expect(
      videonodeview.update(dummyNodeWithImage as unknown as Node, [])
    ).toBeTruthy();
  });
});

describe('Video view body', () => {
  const videoviewbody = new VideoViewBody(
    dummyNodeWithImage as unknown as Node
  );
  videoviewbody.props = {
    decorations: [],
    editorView: dummyEditorFocused,
    getPos: () => 1,
    node: dummyNodeWithImage as unknown as Node,
    dom: document.createElement('img'),
    selected: true,
    focused: true,
  };
  videoviewbody._inlineEditor = {close: () => null} as unknown as PopUpHandle;
  it('should handle video view body', () => {
    expect(videoviewbody).toBeDefined();
  });

  it('should handle componentDidMount', () => {
    expect(videoviewbody.componentDidMount()).toBeUndefined();
  });
  it('should handle componentWillUnmount', () => {
    expect(videoviewbody._inlineEditor?.close).toBeDefined();
    if (!videoviewbody._inlineEditor) return;
    const spy = jest.spyOn(videoviewbody._inlineEditor, 'close');
    videoviewbody.componentWillUnmount();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle componentDidUpdate', () => {
    const dummyNodeWithImage1 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt') || null,
              }),
            },
          ],
          toDOM: (node) => ['img', {src: node.attrs.src, alt: node.attrs.alt}],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
      },
    };

    const spy = jest.spyOn(videoviewbody, '_resolveOriginalSize');
    videoviewbody.componentDidUpdate({
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage1 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    });
    expect(spy).toHaveBeenCalled();
  });
  it('should handle componentDidUpdate _mounted - true', () => {
    const dummyNodeWithImage1 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom: HTMLElement) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt'),
              }),
            },
          ],
          toDOM: (node) => ['img', {src: node.attrs.src, alt: node.attrs.alt}],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
      },
    };
    videoviewbody._mounted = true;
    const spy = jest.spyOn(videoviewbody, '_resolveOriginalSize');
    videoviewbody.componentDidUpdate({
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage1 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    });
    expect(spy).toHaveBeenCalled();
  });
  it('should handle getScaleSize', () => {
    const dummyNodeWithImage2 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt') || null,
              }),
            },
          ],
          toDOM: (node) => ['img', {src: node.attrs.src, alt: node.attrs.alt}],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
        width: 10,
      },
    };
    const videoviewbody = new VideoViewBody(
      dummyNodeWithImage as unknown as Node
    );
    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage2 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };

    expect(videoviewbody.getScaleSize()).toStrictEqual({
      height: 24,
      loading: true,
      scale: 1,
      width: 10,
    });
  });
  it('should handle getScaleSize with width and !height', () => {
    const dummyNodeWithImage2 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
            width: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt'),
                width: dom.getAttribute('width'),
              }),
            },
          ],
          toDOM: (node) => [
            'img',
            {src: node.attrs.src, alt: node.attrs.alt, width: node.attrs.width},
          ],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
        width: 10,
      },
    };
    const videoviewbody = new VideoViewBody(
      dummyNodeWithImage as unknown as Node
    );

    videoviewbody.state = {
      maxSize: {
        width: 10,
        height: 0,
        complete: false,
      },
      originalSize: {
        src: '',
        complete: true,
        height: 0,
        width: 10,
      },
    };

    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage2 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };

    expect(videoviewbody.getScaleSize()).toStrictEqual({
      height: 0,
      loading: false,
      scale: 1,
      width: 10,
    });
  });
  it('should handle getScaleSize with height and !width', () => {
    const dummyNodeWithImage2 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
            height: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt') || null,
                height: dom.getAttribute('height'),
              }),
            },
          ],
          toDOM: (node) => [
            'img',
            {
              src: node.attrs.src,
              alt: node.attrs.alt,
              height: node.attrs.height,
            },
          ],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
        height: 10,
      },
    };
    const videoviewbody = new VideoViewBody(
      dummyNodeWithImage as unknown as Node
    );

    videoviewbody.state = {
      maxSize: {
        width: 0,
        height: 10,
        complete: false,
      },
      originalSize: {
        src: '',
        complete: true,
        height: 10,
        width: 0,
      },
    };

    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage2 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };

    expect(videoviewbody.getScaleSize()).toStrictEqual({
      height: 10,
      loading: false,
      scale: 1,
      width: 0,
    });
  });
  it('should handle getScaleSize with !height and !width', () => {
    const dummyNodeWithImage2 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt'),
              }),
            },
          ],
          toDOM: (node) => ['img', {src: node.attrs.src, alt: node.attrs.alt}],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
      },
    };
    const videoviewbody = new VideoViewBody(
      dummyNodeWithImage as unknown as Node
    );

    videoviewbody.state = {
      maxSize: {
        width: 10,
        height: 10,
        complete: false,
      },
      originalSize: {
        src: '',
        complete: true,
        height: 10,
        width: 10,
      },
    };

    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage2 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };

    expect(videoviewbody.getScaleSize()).toStrictEqual({
      height: 10,
      loading: false,
      scale: 1,
      width: 10,
    });
  });
  it('should handle getScaleSize with width > maxSize.width && (!crop || crop.width > maxSize.width', () => {
    const dummyNodeWithImage2 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
            width: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom: HTMLElement) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt'),
                width: dom.getAttribute('width'),
              }),
            },
          ],
          toDOM: (node) => [
            'img',
            {src: node.attrs.src, alt: node.attrs.alt, width: node.attrs.width},
          ],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
        width: 20,
      },
    };
    const videoviewbody = new VideoViewBody(
      dummyNodeWithImage as unknown as Node
    );

    videoviewbody.state = {
      maxSize: {
        width: 10,
        height: 10,
        complete: false,
      },
      originalSize: {
        src: '',
        complete: true,
        height: 10,
        width: 20,
      },
    };

    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage2 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };

    expect(videoviewbody.getScaleSize()).toStrictEqual({
      height: 5,
      loading: false,
      scale: 1,
      width: 10,
    });
  });

  it('should handle getClipStyle', () => {
    const getclipstyle = videoviewbody.getClipStyle(
      10,
      20,
      30,
      {width: 15, height: 25, left: 35, top: 45},
      50,
      {
        width: 20,
        height: 34,
        complete: true,
      }
    );
    expect(getclipstyle).toStrictEqual({
      clipStyle: {
        height: '33.33333333333333px',
        transform: 'rotate(50rad)',
        width: '20px',
      },
      imageStyle: {
        display: 'inline-block',
        height: '20px',
        left: '46.666666666666664px',
        position: 'relative',
        top: '60px',
        width: '10px',
      },
    });
  });

  it('should render', () => {
    expect(videoviewbody.render()).toBeDefined();
  });

  it('should handle _renderInlineEditor', () => {
    const dummyNodeWithImage1 = {
      type: {
        name: 'image',
        spec: {
          attrs: {
            src: {default: null},
            alt: {default: null},
          },
          inline: true,
          group: 'inline',
          draggable: true,
          parseDOM: [
            {
              tag: 'img[src]',
              getAttrs: (dom: HTMLElement) => ({
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt'),
              }),
            },
          ],
          toDOM: (node) => ['img', {src: node.attrs.src, alt: node.attrs.alt}],
        },
        create: (attrs) => ({
          type: 'image',
          attrs,
        }),
      },
      attrs: {
        src: 'https://example.com/image_test.jpg',
        alt: 'An example image',
      },
    };

    videoviewbody.state = {
      maxSize: {
        width: 10,
        height: 10,
        complete: false,
      },
      originalSize: {
        src: '',
        complete: true,
        height: 10,
        width: 20,
      },
    };

    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: dummyNodeWithImage1 as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    videoviewbody._inlineEditor = {
      close: () => true,
      update: (_editorprops) => true,
    };

    expect(videoviewbody._renderInlineEditor()).toBeUndefined();
  });

  it('should handle _onBodyRef', () => {
    const mockReactInstance = document.createElement('div');
    expect(
      videoviewbody._onBodyRef(
        mockReactInstance as unknown as React.ReactInstance
      )
    ).toBeUndefined();
  });
  it('should handle _onBodyRef when ref is undefined', () => {
    expect(videoviewbody._onBodyRef()).toBeUndefined();
  });
  it('should handle _onBodyResize ', () => {
    const mockReactInstance = document.createElement('div');
    const resizeobserverentry = {
      target: mockReactInstance,
      contentRect: {
        x: 2,
        y: 3,
        width: 4,
        height: 5,
        top: 6,
        right: 7,
        bottom: 8,
        left: 9,
      },
    };
    videoviewbody._body = document.createElement('div');
    expect(videoviewbody._onBodyResize(resizeobserverentry)).toBeUndefined();
  });
  it('should handle _onBodyResize with this._body undefined ', () => {
    const mockReactInstance = document.createElement('div');
    const resizeobserverentry = {
      target: mockReactInstance,
      contentRect: {
        x: 2,
        y: 3,
        width: 4,
        height: 5,
        top: 6,
        right: 7,
        bottom: 8,
        left: 9,
      },
    };
    videoviewbody._body = undefined;
    expect(videoviewbody._onBodyResize(resizeobserverentry)).toBeUndefined();
  });

  it('should handle render', () => {
    videoviewbody.state = {
      maxSize: {
        width: 10000,
        height: 10000,
        complete: false,
      },
      originalSize: {
        src: '',
        complete: true,
        height: 10000,
        width: 10000,
      },
    };
    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: {
        attrs: {
          src: 'test',
          align: 'left',
          crop: {width: 100001},
          rotate: 'left',
          width: 100001,
          height: 10,
          fitToParent: true,
        },
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    expect(videoviewbody.render()).toBeDefined();
  });
  it('should handle render', () => {
    videoviewbody.state = {
      maxSize: {
        width: 10000,
        height: 10000,
        complete: false,
      },
      originalSize: {
        src: '',
        complete: true,
        height: 10000,
        width: 10000,
      },
    };
    videoviewbody.props = {
      decorations: [],
      editorView: dummyEditorFocused,
      getPos: () => 1,
      node: {
        attrs: {
          src: 'test',
          align: 'left',
          crop: {width: 100001, heigt: 10, left: 10, top: 10},
          rotate: 'left',
          width: 100001,
          height: 10,
          fitToParent: true,
        },
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    expect(videoviewbody.render()).toBeDefined();
  });
  it('should handle _renderInlineEditor', () => {
    const elem = document.createElement('div');
    const spy = jest.spyOn(document, 'getElementById').mockReturnValue(elem);

    expect(videoviewbody._renderInlineEditor()).toBeUndefined();
    spy.mockRestore();
  });
  it('should handle _renderInlineEditor', () => {
    const elem = document.createElement('div');
    elem.setAttribute('data-active', 'true');
    const spy = jest.spyOn(document, 'getElementById').mockReturnValue(elem);

    expect(videoviewbody._renderInlineEditor()).toBeUndefined();
    expect(spy).toBeCalled();
  });
  it('should handle _renderInlineEditor else statement', () => {
    videoviewbody._inlineEditor = {
      update: () => undefined,
    } as unknown as PopUpHandle;
    const elem = document.createElement('div');
    elem.setAttribute('data-active', 'true');
    const spy = jest.spyOn(document, 'getElementById').mockReturnValue(elem);

    expect(videoviewbody._renderInlineEditor()).toBeUndefined();
    expect(spy).toBeCalled();
  });

  it('should handle _onResizeEnd ', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: {content: 'block+'},
        paragraph: {content: 'inline*', group: 'block'},
        text: {group: 'inline'},
        image: {
          inline: true,
          attrs: {align: {default: null}, fitToParent: {default: null}},
          group: 'inline',
        }, // Define your custom node type
      },
      marks: {},
    });
    const editorState = EditorState.create({
      doc: mockSchema.nodeFromJSON({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'image',
                attrs: {
                  src: '/path/to/image.jpg',
                },
              },
            ],
          },
        ],
      }),
      schema: mockSchema,
    });
    const el = document.createElement('div');
    const mockEditorView = {
      state: editorState,
      dispatch: jest.fn(),
      posAtCoords: () => {
        return {
          pos: 1,
          inside: 1,
        };
      },
      destroy: jest.fn(),
      dom: el,
    };
    const editorfocused = {
      focused: true,
      runtime: {},
      readOnly: true,
      ...mockEditorView,
    } as unknown as EditorFocused;

    const mockImageNode = Node.fromJSON(mockSchema, {
      type: 'image',
      attrs: {
        align: 'left',
        fitToParent: 'fit',
      },
    }) as unknown as Node;
    const videoviewbody = new VideoViewBody(mockImageNode);
    videoviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {attrs: {align: 'left', fitToParent: 'fit'}} as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    videoviewbody._inlineEditor = {
      close: () => undefined,
    } as unknown as PopUpHandle;
    expect(videoviewbody._onResizeEnd(10, 20)).toBeUndefined();
  });

  it('should handle _onChange  ', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: {content: 'block+'},
        paragraph: {content: 'inline*', group: 'block'},
        text: {group: 'inline'},
        image: {
          inline: true,
          attrs: {align: {default: null}, fitToParent: {default: null}},
          group: 'inline',
        }, // Define your custom node type
      },
      marks: {},
    });
    const editorState = EditorState.create({
      doc: mockSchema.nodeFromJSON({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'image',
                attrs: {
                  src: '/path/to/image.jpg',
                },
              },
            ],
          },
        ],
      }),
      schema: mockSchema,
    });

    const el = document.createElement('div');
    const mockEditorView = {
      state: editorState,
      dispatch: jest.fn(),
      posAtCoords: () => {
        return {
          pos: 1,
          inside: 1,
        };
      },
      destroy: jest.fn(),
      dom: el,
    };
    const editorfocused = {
      focused: true,
      runtime: {},
      readOnly: true,
      ...mockEditorView,
    } as unknown as EditorFocused;

    const mockImageNode = Node.fromJSON(mockSchema, {
      type: 'image',
      attrs: {
        align: 'left',
        fitToParent: 'fit',
      },
    }) as unknown as Node;
    const videoviewbody = new VideoViewBody(mockImageNode);
    videoviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {attrs: {align: 'left', fitToParent: 'fit'}} as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    videoviewbody._inlineEditor = {
      close: () => undefined,
    } as unknown as PopUpHandle;
    expect(videoviewbody._onChange({align: 'left'})).toBeUndefined();
    videoviewbody._mounted = true;
    expect(videoviewbody._onChange({align: 'left'})).toBeUndefined();
    expect(videoviewbody._onChange(undefined)).toBeUndefined();
  });
});
