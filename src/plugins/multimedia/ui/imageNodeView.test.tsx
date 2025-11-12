import {ImageNodeView, ImageViewBody} from './ImageNodeView';
import {Schema, Node} from 'prosemirror-model';
import {EditorState} from 'prosemirror-state';
import {EditorFocused, NodeViewProps} from './CustomNodeView';
import ResizeObserver from './ResizeObserver';
import {PopUpHandle} from '@modusoperandi/licit-ui-commands';

describe('ImageNodeView', () => {
  const mockSchema = new Schema({
    nodes: {
      doc: {content: 'image'},
      text: {},
      image: {
        inline: true,
        attrs: {
          align: {default: 'left'},
          fitToParent: {default: true},
        },
        group: 'inline',
        draggable: true,
        parseDOM: [
          {
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                align: dom.getAttribute('align'),
                fitToParent: dom.getAttribute('fitToParent'),
              };
            },
          },
        ],
        toDOM(node) {
          return ['img', {src: node.attrs.src, align: node.attrs.align || ''}];
        },
      },
    },
  });
  const editorState = EditorState.create({
    schema: mockSchema,
    plugins: [],
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
  const imagenodeview = new ImageNodeView(
    mockImageNode,
    editorfocused,
    () => 1,
    []
  );
  imagenodeview.props = {
    decorations: [],
    editorView: editorfocused,
    getPos: () => 1,
    node: {attrs: {align: 'left', fitToParent: 'fit'}} as unknown as Node,
    dom: document.createElement('img'),
    selected: true,
    focused: true,
  };
  it('should be defined', () => {
    expect(imagenodeview).toBeDefined();
  });
});
describe('Image view body', () => {
  const mockSchema = new Schema({
    nodes: {
      doc: {content: 'image'},
      text: {},
      image: {
        inline: true,
        attrs: {
          align: {default: 'left'},
          fitToParent: {default: true},
        },
        group: 'inline',
        draggable: true,
        parseDOM: [
          {
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                align: dom.getAttribute('align'),
                fitToParent: dom.getAttribute('fitToParent'),
              };
            },
          },
        ],
        toDOM(node) {
          return ['img', {src: node.attrs.src, align: node.attrs.align || ''}];
        },
      },
    },
  });
  const editorState = EditorState.create({
    schema: mockSchema,
    plugins: [],
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

  const mockPopupHandle = {
    close: () => undefined,
    update: () => undefined,
  } as unknown as PopUpHandle;

  const imageviewbody = new ImageViewBody(
    mockImageNode as unknown as NodeViewProps,
    editorfocused
  );
  imageviewbody.props = {
    decorations: [],
    editorView: editorfocused,
    getPos: () => 1,
    node: {attrs: {align: 'left', fitToParent: 'fit'}} as unknown as Node,
    dom: document.createElement('img'),
    selected: true,
    focused: true,
  };
  imageviewbody._inlineEditor = {
    close: () => undefined,
  } as unknown as PopUpHandle;
  it('should be defined', () => {
    expect(imageviewbody).toBeDefined();
  });

  it('should handle componentWillUnmount', () => {
    imageviewbody._inlineEditor =
      imageviewbody._inlineEditor ?? ({} as unknown as PopUpHandle);
    const spy = jest.spyOn(imageviewbody._inlineEditor, 'close');
    imageviewbody.componentWillUnmount();
    expect(spy).toHaveBeenCalled();
  });
  it('should handle componentDidUpdate', () => {
    const spy = jest.spyOn(imageviewbody, '_resolveOriginalSize');
    imageviewbody.componentDidUpdate({
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {attrs: {src: 'test'}} as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    });
    expect(spy).toHaveBeenCalled();
  });
  it('should handle render', () => {
    imageviewbody.state = {
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
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
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
    expect(imageviewbody.render()).toBeDefined();
  });
  it('should handle render', () => {
    imageviewbody.state = {
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
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
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
    expect(imageviewbody.render()).toBeDefined();
  });

  it('should handle isUnaltered when !crop and !rotate', () => {
    expect(imageviewbody.isUnaltered(true, null, null)).toBeTruthy();
  });

  it('should handle calcWidthAndHeight when !height', () => {
    expect(
      imageviewbody.calcWidthAndHeight(10, 0, 5, {
        width: 2,
        height: 2,
        src: 'mock.com',
      })
    ).toStrictEqual({width: 10, height: 2});
  });
  it('should handle calcWidthAndHeight when !height', () => {
    expect(
      imageviewbody.calcWidthAndHeight(0, 10, 5, {
        width: 2,
        height: 2,
        src: 'mock.com',
      })
    ).toStrictEqual({width: 50, height: 10});
  });

  it('should handle _renderInlineEditor', () => {
    const elem = document.createElement('div');
    const spy = jest.spyOn(document, 'getElementById').mockReturnValue(elem);

    expect(imageviewbody._renderInlineEditor()).toBeUndefined();
    spy.mockRestore();
  });
  it('should handle _renderInlineEditor', () => {
    const elem = document.createElement('div');
    elem.setAttribute('data-active', 'true');
    const spy = jest.spyOn(document, 'getElementById').mockReturnValue(elem);

    expect(imageviewbody._renderInlineEditor()).toBeUndefined();
    expect(spy).toBeCalled();
  });
  it('should handle _renderInlineEditor else statement', () => {
    imageviewbody._inlineEditor = {
      update: () => undefined,
    } as unknown as PopUpHandle;
    const elem = document.createElement('div');
    elem.setAttribute('data-active', 'true');
    const spy = jest.spyOn(document, 'getElementById').mockReturnValue(elem);

    expect(imageviewbody._renderInlineEditor()).toBeUndefined();
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
    }) as unknown as NodeViewProps;
    const imageviewbody = new ImageViewBody(mockImageNode);
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {attrs: {align: 'left', fitToParent: 'fit'}} as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    imageviewbody._inlineEditor = mockPopupHandle;
    expect(imageviewbody._onResizeEnd(10, 20)).toBeUndefined();
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
    }) as unknown as NodeViewProps;
    const imageviewbody = new ImageViewBody(mockImageNode);
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {attrs: {align: 'left', fitToParent: 'fit'}} as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    imageviewbody._inlineEditor = mockPopupHandle;
    expect(imageviewbody._onChange({align: 'left'})).toBeUndefined();
    imageviewbody._mounted = true;
    expect(imageviewbody._onChange({align: 'left'})).toBeUndefined();
    expect(imageviewbody._onChange()).toBeUndefined();
  });

  it('should handle _onBodyRef ', () => {
    imageviewbody._body = document.createElement('div');
    const spy = jest.spyOn(ResizeObserver, 'unobserve');
    imageviewbody._onBodyRef();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle _onBodyResize  ', () => {
    imageviewbody._body = document.createElement('div');

    const ivb = imageviewbody._onBodyResize({
      target: document.createElement('div'),
      contentRect: {
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        top: 5,
        right: 6,
        bottom: 7,
        left: 8,
      },
    });
    expect(ivb).toBeUndefined();
  });
  it('should handle _onBodyResize  ', () => {
    imageviewbody._body = document.createElement('div');

    const ivb = imageviewbody._onBodyResize({
      target: document.createElement('div'),
      contentRect: {
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        top: 5,
        right: 6,
        bottom: 7,
        left: 8,
      },
    });
    expect(ivb).toBeUndefined();
  });
  it('should handle _onBodyResize branch coverage', () => {
    imageviewbody._body = undefined;

    const ivb = imageviewbody._onBodyResize({
      target: document.createElement('div'),
      contentRect: {
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        top: 5,
        right: 6,
        bottom: 7,
        left: 8,
      },
    });
    expect(ivb).toBeUndefined();
  });
  it('should handle _onBodyRef ', () => {
    const mockElement = document.createElement('div');
    expect(
      imageviewbody._onBodyRef(mockElement as unknown as React.ReactInstance)
    ).toBeUndefined();
  });
  it('should handle _resolveOriginalSize  ', () => {
    imageviewbody._mounted = true;
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {
        attrs: {align: 'left', fitToParent: 'fit', src: 'test'},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    imageviewbody.state = {
      maxSize: {
        width: 1,
        height: 2,
        complete: true,
      },
      originalSize: {
        src: 'test',
        complete: true,
        height: 1,
        width: 2,
      },
    };
    expect(imageviewbody._resolveOriginalSize()).toBeDefined();
  });
  it('should handle _resolveOriginalSize lazy', () => {
    editorfocused.runtime = {
      canProxyImageSrc: () => true,
      getProxyImageSrc: (src: string) => Promise.resolve(src),
    };
    imageviewbody._mounted = true;
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {
        attrs: {align: 'left', fitToParent: 'fit', src: 'test'},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    imageviewbody.state = {
      maxSize: {
        width: 1,
        height: 2,
        complete: true,
      },
      originalSize: {
        src: 'tes',
        complete: true,
        height: 1,
        width: 2,
      },
    };
    expect(imageviewbody._resolveOriginalSize()).toBeDefined();
    editorfocused.runtime = {};
  });
  it('should handle _resolveOriginalSize not lazy', () => {
    document.body.classList.add('export-pdf-mode');
    editorfocused.runtime = {
      canProxyImageSrc: () => true,
      getProxyImageSrc: (src: string) => Promise.resolve(src),
    };
    imageviewbody._mounted = true;
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      getPos: () => 1,
      node: {
        attrs: {align: 'left', fitToParent: 'fit', src: 'test'},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };
    imageviewbody.state = {
      maxSize: {
        width: 1,
        height: 2,
        complete: true,
      },
      originalSize: {
        src: 'tes',
        complete: true,
        height: 1,
        width: 2,
      },
    };
    expect(imageviewbody._resolveOriginalSize()).toBeDefined();
    editorfocused.runtime = {};
    document.body.classList.remove('export-pdf-mode');
  });
  it('should handle calcWidthAndHeight', () => {
    expect(
      imageviewbody.calcWidthAndHeight(
        null as unknown as number,
        null as unknown as number,
        1,
        {width: 1, height: 1, src: ''}
      )
    ).toBeDefined();
  });
  it('should handle calcWidthAndHeight', () => {
    expect(
      imageviewbody.calcWidthAndHeight(
        null as unknown as number,
        null as unknown as number,
        1,
        {
          width: null as unknown as number,
          height: null as unknown as number,
          src: '',
        }
      )
    ).toBeDefined();
  });
});
