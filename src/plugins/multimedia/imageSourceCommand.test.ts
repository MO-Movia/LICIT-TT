import {
  ImageSourceCommand,
  insertImage,
  getImageSize,
} from './ImageSourceCommand';
import {Transform} from 'prosemirror-transform';
import {Schema} from 'prosemirror-model';
import {MultimediaPlugin} from './index';
import {createEditor, doc, p} from 'jest-prosemirror';
import {EditorView} from 'prosemirror-view';
import {TextSelection, Plugin, PluginKey} from 'prosemirror-state';

class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}

describe('insert image', () => {
  const mockSchema = new Schema({
    nodes: {
      doc: {content: 'image'},
      text: {},
      image: {
        inline: true,
        attrs: {
          src: {default: ''},
          alt: {default: null},
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
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt'),
              };
            },
          },
        ],
        toDOM(node) {
          return ['img', {src: node.attrs.src, alt: node.attrs.alt || ''}];
        },
      },
    },
  });
  const mockTransaction = {
    // Define any properties or methods that your function requires.
    selection: {from: 0, to: 1},
    tr: {
      selection: {},
    },
    insert: () => true,
  } as unknown as Transform;

  const src = 'new_src';
  it('should handle insertimage', () => {
    expect(insertImage(mockTransaction, mockSchema, src)).toBeDefined();
  });

  it('should handle !selection', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: {content: 'image'},
        text: {},
        image: {
          inline: true,
          attrs: {
            src: {default: ''},
            alt: {default: null},
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
                  src: dom.getAttribute('src'),
                  alt: dom.getAttribute('alt'),
                };
              },
            },
          ],
          toDOM(node) {
            return ['img', {src: node.attrs.src, alt: node.attrs.alt || ''}];
          },
        },
      },
    });
    const mockTransaction = {
      // Define any properties or methods that your function requires.

      tr: {
        selection: {},
      },
      insert: () => true,
    } as unknown as Transform;

    const src = 'new_src';
    expect(insertImage(mockTransaction, mockSchema, src)).toBeDefined();
  });

  it('should handle !image', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        text: {},
        paragraph: {
          content: 'text*',
        },
      },
      marks: {
        bold: {},
        italic: {},
      },
    });
    const mockTransaction = {
      // Define any properties or methods that your function requires.
      selection: {},
      tr: {
        selection: {},
      },
      insert: () => true,
    } as unknown as Transform;

    const src = 'new_src';
    expect(insertImage(mockTransaction, mockSchema, src)).toBeDefined();
  });
});

describe('ImageSourceCommand ', () => {
  const plugin = new MultimediaPlugin();
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [plugin],
  });
  const view = editor.view as unknown as EditorView;
  const selection = TextSelection.create(view.state.doc, 0, 0);
  const tr = view.state.tr.setSelection(selection);
  view.updateState(
    view.state.reconfigure({plugins: [plugin, new TestPlugin()]})
  );
  view.dispatch(tr);
  const imagesourcecommand = new ImageSourceCommand();
  it('should handle ImageSourceCommand', () => {
    expect(imagesourcecommand).toBeDefined();
  });
  it('should render label', () => {
    expect(imagesourcecommand.renderLabel()).toBeNull();
  });
  it('should be active', () => {
    expect(imagesourcecommand.isActive()).toBeTruthy();
  });
  it('should noop executeCustom', () => {
    const tr = {} as Transform;
    expect(imagesourcecommand.executeCustom(null!, tr)).toBe(tr);
  });
  it('should noop executeCustomStyleForTable', () => {
    const tr = {} as Transform;
    expect(imagesourcecommand.executeCustomStyleForTable(null!, tr)).toBe(tr);
  });
});
describe('inserimage', () => {
  it('should handle inserimage when src null', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: {content: 'image'},
        text: {},
        image: {
          inline: true,
          attrs: {
            src: {default: ''},
            alt: {default: null},
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
                  src: dom.getAttribute('src'),
                  alt: dom.getAttribute('alt'),
                };
              },
            },
          ],
          toDOM(node) {
            return ['img', {src: node.attrs.src, alt: node.attrs.alt || ''}];
          },
        },
      },
    });
    const mockTransaction = {
      // Define any properties or methods that your function requires.
      selection: {},
      tr: {
        selection: {},
      },
      insert: () => true,
    } as unknown as Transform;

    const src = '';
    expect(insertImage(mockTransaction, mockSchema, src)).toBeTruthy();
  });
});

describe('getImageSize', () => {
  const originalImage = global.Image;

  interface MockImage {
    width: number;
    height: number;
    onload: (() => void) | null;
    onerror: ((event?: Event) => void) | null;
    src: string;
  }

  beforeEach(() => {
    global.Image = class implements MockImage {
      width = 100;
      height = 200;
      onload: (() => void) | null = null;
      onerror: ((event?: Event) => void) | null = null;
      _src = '';
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
      }
      constructor() {}
    } as unknown as typeof Image;
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  it('should resolve with width and height on load', async () => {
    const mockWidth = 640;
    const mockHeight = 480;

    global.Image = class implements MockImage {
      width = mockWidth;
      height = mockHeight;
      onload: (() => void) | null = null;
      onerror: ((event?: Event) => void) | null = null;
      _src = '';
      get src() {
        return this._src;
      }
      set src(_src: string) {
        setTimeout(() => this.onload && this.onload());
        this._src = _src;
      }
      constructor() {}
    } as unknown as typeof Image;

    const size = await getImageSize('dummy-src');
    expect(size).toEqual({width: mockWidth, height: mockHeight});
  });

  it('should reject on error', async () => {
    global.Image = class implements MockImage {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: ((event?: Event | Error) => void) | null = null;
      _src = '';
      get src() {
        return this._src;
      }
      set src(_src: string) {
        // Reject with an actual Error to match test expectation
        setTimeout(
          () => this.onerror && this.onerror(new Error('load failed'))
        );
        this._src = _src;
      }
      constructor() {}
    } as unknown as typeof Image;

    await expect(getImageSize('dummy-src')).rejects.toBeInstanceOf(Error);
  });
});
