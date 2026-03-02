/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { RichCopyEmbedImagePlugin } from './index';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { createEditor, p, schema } from 'jest-prosemirror';
import { EditorRuntime } from './Types';

describe('RichCopyEmbedImagePlugin', () => {
  beforeEach(() => {
    const createElement = document.createElement.bind(document);
    (document.createElement as unknown) = (tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => ({}),
          measureText: () => ({}),
        };
      }
      return createElement(tagName) as unknown;
    };
  });
  const plugin = new RichCopyEmbedImagePlugin();

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
});
