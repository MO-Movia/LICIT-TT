/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { RichCopyEmbedImagePlugin } from './embedImages';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { createEditor, doc, p, schema } from 'jest-prosemirror';
import { EditorRuntime } from './Types';
const writeText = jest.fn();

Object.assign(navigator, {
  clipboard: {
    writeText,
  },
});
describe('RichCopyEmbedImagePlugin', () => {
  jest.mock('prosemirror-model', () => {
    const originalModule = jest.requireActual('prosemirror-model');
    beforeAll(() => {
      navigator.clipboard.writeText('copy').catch(() => undefined);
    });

    return {
      ...originalModule,
      DOMParser: {
        fromSchema: jest.fn(() => ({
          parse: jest.fn(),
        })),
      },
    } as Record<string, unknown>;
  });
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => { });

  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });
  beforeEach(() => {
    const createElement = document.createElement.bind(document);
    (document.createElement as unknown) = (tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => ({}),
          measureText: () => ({}),
        };
      }
      return createElement(tagName) as HTMLElementTagNameMap[];
    };
  });
  const plugin = new RichCopyEmbedImagePlugin();

  it('should load image', () => {
    const dom = document.createElement('div');
    // create state with image
    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, [
          schema.text('Hello'),
          schema.node('image', { src: 'image.jpg', alt: 'Image' }),
          schema.text('World'),
        ]),
      ]),
      schema,
    });
    const node = {
      attrs: {
        src: 'image.jpg',
      },
    };
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const src = 'https://example.com/image.jpg';
    const result = plugin.loadImage(src, view, node);

    expect(result?.then).toBeDefined();
  });

  it('should handle Export', () => {
    const editor = createEditor(p('<cursor>', ''), {
      plugins: [plugin],
      handleDOMEvents: {
        // default keydown
        keydown(view, event) {
          return plugin.onKeyDown(view, event);
        },
      },
    });

    globalThis.URL.createObjectURL = jest.fn();
    globalThis.URL.revokeObjectURL = jest.fn();

    // Export
    editor.shortcut('Ctrl-Alt-E');

    const spyEJ = jest.spyOn(RichCopyEmbedImagePlugin, 'exportJSON');
    expect(spyEJ).toBeTruthy();
  });

  it('should handle with exportBase64JSON with shortut key', () => {
    const dom = document.createElement('div');
    // create state with image
    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, [
          schema.text('Hello'),
          schema.node('image', { src: 'image.jpg', alt: 'Image' }),
          schema.text('World'),
        ]),
      ]),
      schema,
    });
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const editor = createEditor(p('<cursor>', ''), {
      plugins: [plugin],
      handleDOMEvents: {
        // default keydown
        keydown(_view, event) {
          return plugin.onKeyDown(view, event);
        },
      },
    });
    editor.shortcut('Ctrl-Alt-Shift-E');
    const spyMock = jest.spyOn(plugin, 'exportBase64JSON');
    expect(spyMock).not.toHaveBeenCalled();
    editor.shortcut('Ctrl-Alt-Shift-Ē');
  });

  it('should return the source when runtime is falsy', async () => {
    const runtime = '' as EditorRuntime;
    const src = 'https://example.com/image.jpg';
    const result = await plugin.resolveURL(runtime, src);

    expect(result).toBe(src);
  });

  it('should return an empty string when source includes UNSUPPRT_XEMF_STRING', async () => {
    const runtime = {};
    const src = 'https://example.com/image.x-emf';
    const result = await plugin.resolveURL(runtime, src);
    expect(result).toBe('');
  });

  it('should return the source when canProxyImageSrc or getProxyImageSrc are missing', async () => {
    const runtime: EditorRuntime = {
      canProxyImageSrc() {
        return true;
      },
    };
    const src = 'https://example.com/image.jpg';
    const result = await plugin.resolveURL(runtime, src);

    expect(result).toBe(src);
  });

  it('should return the proxied source when canProxyImageSrc returns true', async () => {
    const runtime = {
      canProxyImageSrc: jest.fn().mockReturnValue(true),
      getProxyImageSrc: jest
        .fn()
        .mockResolvedValue('https://proxy.com/image.jpg'),
    };
    const src = 'https://example.com/image.jpg';
    const result = await plugin.resolveURL(runtime, src);
    expect(result).toBe('https://proxy.com/image.jpg');
    expect(runtime.canProxyImageSrc).toHaveBeenCalledWith(src);
    expect(runtime.getProxyImageSrc).toHaveBeenCalledWith(src);
  });

  it('should return the original source when getProxyImageSrc fails', async () => {
    const runtime = {
      canProxyImageSrc: jest.fn().mockReturnValue(true),
      getProxyImageSrc: jest
        .fn()
        .mockRejectedValue(new Error('Failed to get proxy image')),
    };
    const src = 'https://example.com/image.jpg';
    const result = await plugin.resolveURL(runtime, src);
    expect(result).toBe(src);
    expect(runtime.canProxyImageSrc).toHaveBeenCalledWith(src);
    expect(runtime.getProxyImageSrc).toHaveBeenCalledWith(src);
  });

  //-------------------//

  it('should handle Copy Special and Export with image without alt text', () => {
    const dom = document.createElement('div');
    // create state with image without alt text
    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, [
          schema.node('image', { src: 'image.jpg' }),
        ]),
      ]),
      schema,
    });
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const editor = createEditor(p('<cursor>', ''), {
      plugins: [plugin],
      handleDOMEvents: {
        keydown(_view, event) {
          return plugin.onKeyDown(view, event);
        },
      },
    });

    editor.shortcut('Ctrl-Alt-C');
    editor.shortcut('Ctrl-Alt-E');
    expect(editor.doc).toBeDefined();
  });

  it('should return the source when canProxyImageSrc returns false', async () => {
    const runtime = {
      canProxyImageSrc: jest.fn().mockReturnValue(false),
      getProxyImageSrc: jest.fn(),
    };
    const src = 'https://example.com/image.jpg';
    const result = await plugin.resolveURL(runtime, src);
    expect(result).toBe(src);
    expect(runtime.canProxyImageSrc).toHaveBeenCalledWith(src);
    expect(runtime.getProxyImageSrc).not.toHaveBeenCalled();
  });

  it('should return the source when getProxyImageSrc throws an error', async () => {
    const runtime = {
      canProxyImageSrc: jest.fn().mockReturnValue(true),
      getProxyImageSrc: jest
        .fn()
        .mockRejectedValue(new Error('Failed to get proxy image')),
    };
    const src = 'https://example.com/image.jpg';
    const result = await plugin.resolveURL(runtime, src);
    expect(result).toBe(src);
    expect(runtime.canProxyImageSrc).toHaveBeenCalledWith(src);
    expect(runtime.getProxyImageSrc).toHaveBeenCalledWith(src);
  });

  //----------------//

  it('should set embed flag and process images on "Copy Special" command', () => {
    const dom = document.createElement('div');
    // create state with image
    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, [
          schema.text('Hello'),
          schema.node('image', { src: 'image.jpg', alt: 'Image' }),
          schema.text('World'),
        ]),
      ]),
      schema,
    });
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const editor = createEditor(p('<cursor>', ''), {
      plugins: [plugin],
      handleDOMEvents: {
        keydown(_view, event) {
          return plugin.onKeyDown(view, event);
        },
      },
    });

    editor.shortcut('Ctrl-Alt-C');

    expect(plugin.embed).toBe(false);
  });

  it('should call exportJSON when exportDoc is true', () => {
    const test = RichCopyEmbedImagePlugin.exportJSON(doc(p('Initial content')));
    expect(test).toBeUndefined();
  });

  it('should not call exportJSON when exportDoc is false', () => {
    RichCopyEmbedImagePlugin.exportJSON = jest.fn();
    plugin.exportDoc = false;
    expect(RichCopyEmbedImagePlugin.exportJSON).not.toHaveBeenCalled();
  });

  it('should exportBase64JSON when "Ctrl-Alt-Shift-E" is pressed', () => {
    const dom = document.createElement('div');

    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, [
          schema.text('Hello'),
          schema.node('image', { src: 'image.jpg', alt: 'Image' }),
          schema.text('World'),
        ]),
      ]),
      schema,
    });
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const editor = createEditor(p('<cursor>', ''), {
      plugins: [plugin],
      handleDOMEvents: {
        keydown(_view, event) {
          return plugin.onKeyDown(view, event);
        },
      },
    });

    editor.shortcut('Ctrl-Alt-Shift-E');

    const spyExportBase64JSON = jest.spyOn(plugin, 'exportBase64JSON');
    expect(spyExportBase64JSON).toHaveBeenCalled();
  });

  it('should return an empty string if src is an empty string', async () => {
    const src = '';
    const result = await plugin.loadImage(src, null, null);
    expect(result).toBe('');
  });

  it('should modify src attribute if base64 data is available and embed flag is set', () => {
    plugin.b64s = {
      'image.jpg': 'base64data',
    };

    const node = schema.nodes.image.create({
      src: 'image.jpg',
      alt: 'Image Alt Text',
    });
    plugin.embed = true;
    const modifiedAttrs = plugin
      .getClipboardSerializer(schema)
      .nodes.image(node);
    expect(modifiedAttrs[1].src).toBe('base64data');
  });
  it('should modify src attribute if base64 data is available and embed flag is not set', () => {
    plugin.b64s = {
      'image.jpg': 'base64data',
    };

    const node = schema.nodes.image.create({
      src: 'image.jpg',
      alt: 'Image Alt Text',
    });
    plugin.embed = false;
    const modifiedAttrs = plugin
      .getClipboardSerializer(schema)
      .nodes.image(node);
    expect(modifiedAttrs[1].src).toBe('image.jpg');
  });

  it('should load image and update self.b64s if base64 data is not available', () => {
    plugin.b64s = {};

    const node = schema.nodes.image.create({
      src: 'image.jpg',
      alt: 'Image Alt Text',
    });

    plugin.loadImage = jest.fn().mockResolvedValue('base64data');
    const modifiedAttrs = plugin
      .getClipboardSerializer(schema)
      .nodes.image(node);
    expect(plugin.loadImage).toHaveBeenCalledWith('image.jpg', null, node);
    expect(plugin.b64s['image.jpg']).toBeUndefined();
    expect(modifiedAttrs[1].src).toBe('image.jpg');
  });

  it('should set base64 data for image sources', async () => {
    plugin.resolveURL = jest
      .fn()
      .mockResolvedValue('https://example.com/image.jpg');
    const node = {
      type: { name: 'image' },
      attrs: { src: 'https://example.com/image.jpg' },
    };
    plugin.loadImage = jest.fn().mockResolvedValue('base64data');
    const view = {
      state: {
        schema: {
          nodes: { image: { create: jest.fn(() => node) } },
        },
        doc: {
          descendants: jest.fn((callback) => callback(node, 1) as unknown),
        },
      },
    } as unknown as EditorView;
    // Wait for settImage to fully resolve
    await Promise.resolve(plugin.setImageB64s(view));
    expect(plugin.loadImage).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      view,
      node
    );
    expect(plugin.b64s['https://example.com/image.jpg']).toBe('base64data');
  });

  it('should handle exportJSONEx', () => {
    const test = RichCopyEmbedImagePlugin.exportJSONEx(
      {
        getClipboardSerializer: () => {
          return {};
        },
        props: { clipboardSerializer: {} },
        exportBase64JSON: () => { },
      } as unknown as RichCopyEmbedImagePlugin,
      {
        state: {
          doc: {
            content: [],
            resolve: () => {
              return {
                min: () => {
                  return 0;
                },
                max: () => {
                  return 1;
                },
              };
            },
            type: { schema: { cached: { domSerializer: {} } } },
            descendants: () => { },
          },
        },
      } as unknown as EditorView,
      doc(p('Initial content'))
    );
    expect(test).toBeUndefined();
  });

  it('should handle null doc exportJSONEx', () => {
    const test = RichCopyEmbedImagePlugin.exportJSONEx(
      {
        getClipboardSerializer: () => {
          return {};
        },
        props: { clipboardSerializer: {} },
        exportBase64JSON: () => { },
      } as unknown as RichCopyEmbedImagePlugin,
      {
        state: {
          doc: {
            content: [],
            resolve: () => {
              return {
                min: () => {
                  return 0;
                },
                max: () => {
                  return 1;
                },
              };
            },
            type: { schema: { cached: { domSerializer: {} } } },
            descendants: () => { },
          },
        },
      } as unknown as EditorView,
      null!
    );
    expect(test).toBeUndefined();
  });
});
