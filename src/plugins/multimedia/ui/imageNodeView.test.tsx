/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock('./Icon', () => ({
  __esModule: true,
  Icon: {
    get: jest.fn(() => null),
  },
}));

import {
  getMaxResizeWidth,
  ImageNodeView,
  ImageViewBody,
} from './ImageNodeView';
import {Schema, Node} from 'prosemirror-model';
import {EditorState, NodeSelection} from 'prosemirror-state';
import {EditorFocused, NodeViewProps} from './CustomNodeView';
import * as ResizeObserver from './ResizeObserver';
import {PopUpHandle} from '../../../commands';

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
  });
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

function hasImageOptionsButton(node): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  if (node.props?.label === 'Image options') {
    return true;
  }

  const children = node.props?.children;
  if (!children) {
    return false;
  }

  return []
    .concat(children)
    .some((child) => hasImageOptionsButton(child));
}

function setNodeAttrs(node: Node, attrs: Record<string, unknown>): void {
  Object.defineProperty(node, 'attrs', {
    configurable: true,
    value: attrs,
  });
}

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
  });

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
  imageviewbody._menu = {
    close: () => undefined,
  } as unknown as PopUpHandle;
  it('should be defined (case 2)', () => {
    expect(imageviewbody).toBeDefined();
  });

  it('should handle componentWillUnmount', () => {
    imageviewbody._menu =
      imageviewbody._menu ?? ({close: () => undefined} as unknown as PopUpHandle);
    const spy = jest.spyOn(imageviewbody._menu, 'close');
    imageviewbody.componentWillUnmount();
    expect(spy).toHaveBeenCalled();
  });
  it('should handle componentDidUpdate', () => {
    const spy = jest.spyOn(imageviewbody, '_resolveOriginalSize');
    imageviewbody.componentDidUpdate(
      {
        decorations: [],
        editorView: editorfocused,
        getPos: () => 1,
        node: {attrs: {src: 'test'}} as unknown as Node,
        dom: document.createElement('img'),
        selected: true,
        focused: true,
      }
    );
    expect(spy).toHaveBeenCalled();
  });

  it('should update image attrs when getPos returns 0', () => {
    const docWithImage = mockSchema.node('doc', null, [
      mockSchema.node('image', {align: 'left', fitToParent: 'fit'}),
    ]);
    const stateWithImage = EditorState.create({
      doc: docWithImage,
      schema: mockSchema,
    });
    const dispatch = jest.fn();
    const imageViewBody = new ImageViewBody(
      mockImageNode as unknown as NodeViewProps,
      editorfocused
    );
    imageViewBody.props = {
      decorations: [],
      editorView: {
        ...editorfocused,
        state: stateWithImage,
        dispatch,
      } as unknown as EditorFocused,
      getPos: () => 0,
      node: {
        attrs: {align: 'left', fitToParent: 'fit'},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };

    imageViewBody._updateImageAttrs({src: 'data:image/png;base64,test'});

    expect(dispatch).toHaveBeenCalled();
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
      originalSizeSource: '',
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
  it('should handle render (case 2)', () => {
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
      originalSizeSource: '',
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
  it('should handle calcWidthAndHeight when !height (case 2)', () => {
    expect(
      imageviewbody.calcWidthAndHeight(0, 10, 5, {
        width: 2,
        height: 2,
        src: 'mock.com',
      })
    ).toStrictEqual({width: 50, height: 10});
  });

  it('should prepare image menu items', () => {
    const items = imageviewbody._getMenuItems();

    expect(items.map((item) => item.id)).toContain('choose-file');
    expect(items.map((item) => item.id)).toContain('paste-clipboard');
  });

  it('should refresh open image menu while the image is active', () => {
    const elem = document.createElement('div');
    elem.setAttribute('data-active', 'true');
    const getElementByIdSpy = jest
      .spyOn(document, 'getElementById')
      .mockReturnValue(elem);
    const update = jest.fn();
    imageviewbody._menu = {
      close: jest.fn(),
      update,
    };

    imageviewbody._renderInlineEditor();

    expect(update).toHaveBeenCalledTimes(1);
    const updateProps = update.mock.calls[0][0] as {
      close: unknown;
      items: Array<{id: string}>;
    };
    expect(updateProps.close).toBe(imageviewbody._closeMenu);
    expect(updateProps.items.map((item) => item.id)).toEqual(
      imageviewbody._getMenuItems().map((item) => item.id)
    );
    getElementByIdSpy.mockRestore();
  });

  it('should close open image menu when the image is inactive', () => {
    const elem = document.createElement('div');
    const getElementByIdSpy = jest
      .spyOn(document, 'getElementById')
      .mockReturnValue(elem);
    const close = jest.fn();
    imageviewbody._menu = {
      close,
      update: jest.fn(),
    };

    imageviewbody._renderInlineEditor();

    expect(close).toHaveBeenCalled();
    expect(imageviewbody._menu).toBeUndefined();
    getElementByIdSpy.mockRestore();
  });

  it('should not render image hamburger inside enhanced table figure', () => {
    const schema = new Schema({
      nodes: {
        doc: {content: 'enhanced_table_figure'},
        text: {group: 'inline'},
        paragraph: {content: 'inline*', group: 'block'},
        image: {
          inline: true,
          attrs: {
            align: {default: null},
            crop: {default: null},
            cropData: {default: null},
            fitToParent: {default: null},
            height: {default: null},
            rotate: {default: null},
            src: {default: null},
            width: {default: null},
          },
          group: 'inline',
        },
        enhanced_table_figure: {
          content: 'enhanced_table_figure_body',
          group: 'block',
        },
        enhanced_table_figure_body: {
          content: 'paragraph',
          group: 'block',
        },
      },
    });
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'enhanced_table_figure',
          content: [
            {
              type: 'enhanced_table_figure_body',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'image',
                      attrs: {src: '/path/to/image.jpg'},
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const state = EditorState.create({doc, schema});
    const imageViewBody = new ImageViewBody(
      mockImageNode as unknown as NodeViewProps
    );
    imageViewBody.state = {
      maxSize: {
        width: 10000,
        height: 10000,
        complete: true,
      },
      originalSize: {
        src: '/path/to/image.jpg',
        complete: true,
        height: 100,
        width: 100,
      },
      originalSizeSource: '/path/to/image.jpg',
    };
    imageViewBody.props = {
      decorations: [],
      editorView: {
        ...editorfocused,
        readOnly: false,
        state,
      } as unknown as EditorFocused,
      getPos: () => 3,
      node: schema.nodes.image.create({src: '/path/to/image.jpg'}),
      dom: document.createElement('span'),
      selected: true,
      focused: true,
    };

    const rendered = imageViewBody.render();

    expect(imageViewBody.isInsideEnhancedTableFigureBody()).toBe(true);
    expect(rendered.props.className).not.toContain('has-hover-handle');
    expect(hasImageOptionsButton(rendered)).toBe(false);
  });

  it('should dispatch image alignment menu actions', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: {content: 'block+'},
        paragraph: {content: 'inline*', group: 'block'},
        text: {group: 'inline'},
        image: {
          inline: true,
          attrs: {align: {default: null}, fitToParent: {default: null}},
          group: 'inline',
        },
      },
      marks: {},
    });
    const stateWithImage = EditorState.create({
      doc: mockSchema.nodeFromJSON({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'image',
                attrs: {
                  align: 'left',
                  fitToParent: null,
                },
              },
            ],
          },
        ],
      }),
      schema: mockSchema,
    });
    const dispatch = jest.fn();
    const imageViewBody = new ImageViewBody(
      mockImageNode as unknown as NodeViewProps,
      editorfocused
    );
    imageViewBody.props = {
      decorations: [],
      editorView: {
        ...editorfocused,
        state: stateWithImage,
        dispatch,
      } as unknown as EditorFocused,
      getPos: () => 1,
      node: {
        attrs: {align: 'left', fitToParent: null},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
      focused: true,
    };

    const alignments = [
      ['align-center', 'center'],
      ['align-right', 'right'],
      ['float-left', 'float-left'],
      ['float-right', 'float-right'],
    ];

    for (const [itemId, align] of alignments) {
      dispatch.mockClear();
      imageViewBody._getMenuItems().find((item) => item.id === itemId)?.action();

      expect(dispatch).toHaveBeenCalled();
      const transaction = dispatch.mock.calls[0][0];
      expect(transaction.doc.nodeAt(1)?.attrs.align).toBe(align);
    }
  });

  it('should store menu button ref', () => {
    const button = document.createElement('button');

    imageviewbody._onMenuButtonRef(button);

    expect(imageviewbody._menuButton).toBe(button);
  });

  it('should handle _onResizeEnd', () => {
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
    imageviewbody._menu = mockPopupHandle;
    expect(imageviewbody._onResizeEnd(10, 20)).toBeUndefined();
  });

  it('normalizes an EIC image paragraph when resizing', () => {
    const schema = new Schema({
      nodes: {
        doc: {content: 'enhanced_table_figure'},
        text: {group: 'inline'},
        enhanced_table_figure: {
          content: 'enhanced_table_figure_body',
          group: 'block',
        },
        enhanced_table_figure_body: {
          content: 'paragraph',
          group: 'block',
        },
        paragraph: {
          attrs: {
            marginBottom: {default: null},
            marginTop: {default: null},
            styleName: {default: 'Normal'},
          },
          content: 'inline*',
          group: 'block',
        },
        image: {
          inline: true,
          attrs: {
            crop: {default: null},
            height: {default: null},
            src: {default: null},
            width: {default: null},
          },
          group: 'inline',
        },
      },
      marks: {
        font_size: {toDOM: () => ['span', 0]},
      },
    });
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'enhanced_table_figure',
          content: [
            {
              type: 'enhanced_table_figure_body',
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    marginBottom: '3pt !important',
                    marginTop: '2pt !important',
                    styleName: 'Normal',
                  },
                  content: [
                    {
                      type: 'image',
                      attrs: {height: 180, src: '/image.png', width: 320},
                      marks: [{type: 'font_size'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const state = EditorState.create({
      doc,
      schema,
      selection: NodeSelection.create(doc, 3),
    });
    const dispatch = jest.fn();
    const imageNode = doc.nodeAt(3);
    const imageViewBody = new ImageViewBody(
      imageNode as unknown as NodeViewProps
    );
    imageViewBody.props = {
      decorations: [],
      editorView: {
        ...editorfocused,
        state,
        dispatch,
      } as unknown as EditorFocused,
      getPos: () => 3,
      node: imageNode,
      dom: document.createElement('span'),
      selected: true,
      focused: true,
    };

    imageViewBody._onResizeEnd(220, 124);

    const transaction = dispatch.mock.calls[0][0];
    const paragraph = transaction.doc.nodeAt(2);
    const resizedImage = transaction.doc.nodeAt(3);
    expect(paragraph.attrs.marginBottom).toBeNull();
    expect(paragraph.attrs.marginTop).toBeNull();
    expect(paragraph.attrs.styleName).toBe('Normal');
    expect(resizedImage.attrs).toEqual(
      expect.objectContaining({height: 124, width: 220})
    );
    expect(resizedImage.marks).toHaveLength(0);
  });

  it('should handle _onChange', () => {
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
    imageviewbody._menu = mockPopupHandle;
    expect(imageviewbody._onChange({align: 'left'})).toBeUndefined();
    imageviewbody._mounted = true;
    expect(imageviewbody._onChange({align: 'left'})).toBeUndefined();
    expect(imageviewbody._onChange()).toBeUndefined();
  });

  it('should handle _onBodyRef', () => {
    imageviewbody._body = document.createElement('div');
    imageviewbody._bodyEl = imageviewbody._body as HTMLElement;
    const spy = jest.spyOn(ResizeObserver, 'unobserve');
    imageviewbody._onBodyRef();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle _onBodyResize', () => {
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
  it('should handle _onBodyResize (case 2)', () => {
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
  it('should handle _onBodyRef (case 2)', () => {
    const mockElement = document.createElement('div');
    expect(imageviewbody._onBodyRef(mockElement)).toBeUndefined();
  });
  it('should handle _resolveOriginalSize', () => {
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
      originalSizeSource: 'test',
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
      originalSizeSource: 'tes',
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
      originalSizeSource: 'tes',
    };
    expect(imageviewbody._resolveOriginalSize()).toBeDefined();
    editorfocused.runtime = {};
    document.body.classList.remove('export-pdf-mode');
  });
  it('should handle calcWidthAndHeight', () => {
    expect(
      imageviewbody.calcWidthAndHeight(
        0,
        0,
        1,
        {width: 1, height: 1, src: ''}
      )
    ).toBeDefined();
  });
  it('should handle calcWidthAndHeight (case 2)', () => {
    expect(
      imageviewbody.calcWidthAndHeight(
        0,
        0,
        1,
        {
          width: 0,
          height: 0,
          src: '',
        }
      )
    ).toBeDefined();
  });

  it('should measure max resize width and restore wrapper margins', () => {
    const offsetParent = document.createElement('div');
    const wrapper = document.createElement('span');
    const body = document.createElement('span');
    offsetParent.style.paddingLeft = '10px';
    offsetParent.style.paddingRight = '5px';
    wrapper.style.setProperty('margin', '8px', 'important');
    offsetParent.appendChild(wrapper);
    wrapper.appendChild(body);
    Object.defineProperty(offsetParent, 'offsetWidth', {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(offsetParent, 'clientWidth', {
      configurable: true,
      value: 260,
    });
    Object.defineProperty(wrapper, 'offsetParent', {
      configurable: true,
      value: offsetParent,
    });

    expect(getMaxResizeWidth(body, true)).toBe(245);
    expect(wrapper.style.getPropertyValue('margin')).toBe('8px');
    expect(wrapper.style.getPropertyPriority('margin')).toBe('important');

    expect(getMaxResizeWidth(document.createElement('span'))).toBe(100000);
  });

  it('should resolve aspect ratio and current size fallbacks', () => {
    imageviewbody.state = {
      maxSize: {complete: true, height: 10000, width: 10000},
      originalSize: {complete: true, height: 200, src: 'src', width: 400},
      originalSizeSource: 'src',
    };
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      focused: true,
      getPos: () => 1,
      node: {
        attrs: {fitToParent: false, height: 50, src: 'src', width: 100},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
    };

    expect(imageviewbody._getCurrentAspectRatio()).toBe(2);
    expect(imageviewbody._getCurrentImageSize()).toEqual({
      height: 50,
      width: 100,
    });

    setNodeAttrs(imageviewbody.props.node, {
      fitToParent: false,
      height: 100,
      src: 'src',
      width: 0,
    });
    expect(imageviewbody._getCurrentImageSize()).toEqual({
      height: 100,
      width: 200,
    });

    setNodeAttrs(imageviewbody.props.node, {
      fitToParent: false,
      height: 0,
      src: 'src',
      width: 300,
    });
    expect(imageviewbody._getCurrentImageSize()).toEqual({
      height: 150,
      width: 300,
    });

    setNodeAttrs(imageviewbody.props.node, {
      fitToParent: false,
      height: 0,
      src: 'other',
      width: 0,
    });
    imageviewbody.state.originalSize = {
      complete: false,
      height: 0,
      src: '',
      width: 0,
    };
    expect(imageviewbody._getCurrentAspectRatio()).toBe(1);
    expect(imageviewbody._getCurrentImageSize()).toEqual({
      height: 24,
      width: 24,
    });
  });

  it('should derive fit width from rendered body or current attrs', () => {
    const body = document.createElement('span');
    Object.defineProperty(body, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({width: 320}),
    });
    imageviewbody._bodyEl = body;
    imageviewbody.props = {
      decorations: [],
      editorView: editorfocused,
      focused: true,
      getPos: () => 1,
      node: {
        attrs: {fitToParent: true, height: 100, src: 'src', width: 100},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
    };
    imageviewbody.state = {
      maxSize: {complete: true, height: 10000, width: 10000},
      originalSize: {complete: true, height: 150, src: 'src', width: 300},
      originalSizeSource: 'src',
    };

    expect(imageviewbody._getCurrentImageSize()).toEqual({
      height: 100,
      width: 320,
    });

    imageviewbody._bodyEl = null;
    setNodeAttrs(imageviewbody.props.node, {
      fitToParent: false,
      height: 100,
      src: 'src',
      width: 275,
    });
    expect(imageviewbody._getFitWidth()).toBe(275);
  });

  it('should apply bounded image sizes and ignore invalid dimensions', () => {
    const setNodeMarkup = jest.fn().mockReturnValue('tr');
    const dispatch = jest.fn();
    imageviewbody.props = {
      decorations: [],
      editorView: {
        ...editorfocused,
        dispatch,
        focus: jest.fn(),
        state: {tr: {setNodeMarkup}},
      } as unknown as EditorFocused,
      focused: true,
      getPos: () => 4,
      node: {
        attrs: {fitToParent: true, height: 10, src: 'src', width: 10},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
    };

    imageviewbody._applyImageSize(Number.NaN, 100);
    expect(dispatch).not.toHaveBeenCalled();

    imageviewbody._applyImageSize(20000, 10000);

    expect(setNodeMarkup).toHaveBeenCalledWith(4, null, {
      fitToParent: 0,
      height: 5000,
      src: 'src',
      width: 10000,
    });
    expect(dispatch).toHaveBeenCalledWith('tr');
  });

  it('should skip opening an existing size-fit editor and close it', () => {
    const focus = jest.fn();
    const popupHandle = {close: jest.fn()};
    imageviewbody.state = {
      maxSize: {complete: true, height: 10000, width: 10000},
      originalSize: {complete: true, height: 200, src: 'src', width: 400},
      originalSizeSource: 'src',
    };
    imageviewbody.props = {
      decorations: [],
      editorView: {...editorfocused, focus} as unknown as EditorFocused,
      focused: true,
      getPos: () => 1,
      node: {
        attrs: {fitToParent: false, height: 200, src: 'src', width: 400},
      } as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
    };
    imageviewbody._sizeEditor = popupHandle as unknown as PopUpHandle;

    imageviewbody._onSizeFit();
    expect(popupHandle.close).not.toHaveBeenCalled();

    imageviewbody._closeSizeEditor();

    expect(popupHandle.close).toHaveBeenCalledWith(undefined);
    expect(focus).toHaveBeenCalled();
    expect(imageviewbody._sizeEditor).toBeUndefined();
  });

  it('should cover crop and menu early-return paths', () => {
    const dispatch = jest.fn();
    imageviewbody.props = {
      decorations: [],
      editorView: {
        ...editorfocused,
        dispatch,
        state: {tr: {delete: jest.fn()}},
      } as unknown as EditorFocused,
      focused: true,
      getPos: () => undefined,
      node: {attrs: {src: ''}, nodeSize: 2} as unknown as Node,
      dom: document.createElement('img'),
      selected: true,
    };

    imageviewbody._insertParagraph('above');
    imageviewbody._onRemove();
    imageviewbody._onCrop();
    imageviewbody._updateImageAttrs({src: 'ignored'});
    imageviewbody._onMenuClick({
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
