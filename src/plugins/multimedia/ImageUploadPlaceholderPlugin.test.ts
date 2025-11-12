import {ImageUploadPlaceholderPlugin, customEditorView, findImageUploadPlaceholder, uploadImageFiles } from './ImageUploadPlaceholderPlugin';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { createEditor, doc, p } from 'jest-prosemirror';

import { EditorView } from 'prosemirror-view';
import { MultimediaPlugin } from './index';
import { schema } from 'prosemirror-test-builder';


describe('image upload place holder plugin', () => {
  const plugin = new MultimediaPlugin();
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [plugin],
  });


  it('should handle uploadImageFiles', () => {

    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new MultimediaPlugin()],
    });
    const view1 = new EditorView(document.querySelector('#editor'), {
      state,
    });
    const cusEdtView = {
      ...view1, runtime: {},
      readOnly: true,
      disabled: true
    };
    const view: customEditorView = cusEdtView as customEditorView;
    const filex: File = new File([], 'NEW FILE');
    expect(uploadImageFiles(view, [filex], { x: 1, y: 2 })).toBeDefined();


  });
  it('should handle uploadImageFiles', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });
    const state: EditorState = EditorState.create({
      schema: mockSchema,
      selection: editor.selection,
      plugins: [new MultimediaPlugin(), new ImageUploadPlaceholderPlugin()],
    });
    const view1 = new EditorView(document.querySelector('#editor'), {
      state,
    });
    const cusEdtView = {
      ...view1,
      readOnly: false,
      disabled: false,
      runtime: {
        uploadImage: () => Promise.resolve(true),
        canUploadImage: () => true,
      },
      posAtCoords: () => undefined,
    };
    const view: customEditorView = cusEdtView as unknown as customEditorView;
    const filex: File = new File([], 'NEW FILE', { type: 'image/png'});
    jest.useFakeTimers();
    expect(uploadImageFiles(view, [filex, filex], { x: 1, y: 2 })).toBeDefined();
    jest.runAllTimers();
    // expect defered task not to fail
  });
  it('should handle uploadImageFiles', () => {

    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });

    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin(), new ImageUploadPlaceholderPlugin()]
    });

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
    };
    const customeditorView = {
      runtime: { canUploadImage: true, uploadImage: true },
      readOnly: false,
      disabled: false,

      ...mockEditorView
    } as unknown as customEditorView;
    const mockFiles = [
      new File(['file1 content'], 'file1.jpeg', { type: 'image/jpeg' }),
      new File(['file2 content'], 'file2.gif', { type: 'image/gif' }),
      new File(['file3 content'], 'file3.png', { type: 'image/png' })
    ];

    expect(uploadImageFiles(customeditorView, mockFiles, { x: 1, y: 2 })).toBeDefined();


  });



  it('should handle uploadImageFiles if !imageType', () => {

    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        text: {},
        paragraph: {
          content: 'text*'
        }
      },
      marks: {
        bold: {},
        italic: {}
      }
    });

    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin(), new ImageUploadPlaceholderPlugin()]
    });

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
    };
    const customeditorView = {
      runtime: { canUploadImage: true, uploadImage: true },
      readOnly: false,
      disabled: false,

      ...mockEditorView
    } as unknown as customEditorView;
    const mockFiles = [
      new File(['file1 content'], 'file1.jpeg', { type: 'image/jpeg' }),
      new File(['file2 content'], 'file2.gif', { type: 'image/gif' }),
      new File(['file3 content'], 'file3.png', { type: 'image/png' })
    ];

    expect(uploadImageFiles(customeditorView, mockFiles, { x: 1, y: 2 })).toBeFalsy();


  });

  it('should handle uploadImageFiles if files does not contain image filetype', () => {

    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });

    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin(), new ImageUploadPlaceholderPlugin()]
    });

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
    };
    const customeditorView = {
      runtime: { canUploadImage: true, uploadImage: true },
      readOnly: false,
      disabled: false,

      ...mockEditorView
    } as unknown as customEditorView;
    const mockFiles = [
      new File(['file1 content'], 'file1.txt', { type: 'image/txt' }),
      new File(['file2 content'], 'file2.txt', { type: 'image/txt' })

    ];

    expect(uploadImageFiles(customeditorView, mockFiles, { x: 1, y: 2 })).toBeFalsy();


  });

  it('should handle uploadImageFiles if plugins does not contain imageUploadPlaceholderPlugin', () => {

    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });

    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin()]
    });

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
    };
    const customeditorView = {
      runtime: { canUploadImage: true, uploadImage: true },
      readOnly: false,
      disabled: false,

      ...mockEditorView
    } as unknown as customEditorView;
    const mockFiles = [
      new File(['file1 content'], 'file1.jpeg', { type: 'image/jpeg' }),
      new File(['file2 content'], 'file2.gif', { type: 'image/gif' }),
      new File(['file3 content'], 'file3.png', { type: 'image/png' })
    ];

    expect(uploadImageFiles(customeditorView, mockFiles, { x: 1, y: 2 })).toBeFalsy();


  });

  it('should handle uploadImageFiles if poseAtCoords is null', () => {

    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });

    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin(), new ImageUploadPlaceholderPlugin()]
    });

    const mockEditorView = {
      state: editorState,
      dispatch: jest.fn(),
      posAtCoords: () => null,
      destroy: jest.fn(),
    };
    const customeditorView = {
      runtime: { canUploadImage: true, uploadImage: true },
      readOnly: false,
      disabled: false,

      ...mockEditorView
    } as unknown as customEditorView;
    const mockFiles = [
      new File(['file1 content'], 'file1.jpeg', { type: 'image/jpeg' }),
      new File(['file2 content'], 'file2.gif', { type: 'image/gif' }),
      new File(['file3 content'], 'file3.png', { type: 'image/png' })
    ];

    expect(uploadImageFiles(customeditorView, mockFiles, { x: 1, y: 2 })).toBeFalsy();


  });

  it('should handle uploadImageFiles if coords is null', () => {

    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });

    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin(), new ImageUploadPlaceholderPlugin()]
    });

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
    };
    const customeditorView = {
      runtime: { canUploadImage: true, uploadImage: true },
      readOnly: false,
      disabled: false,

      ...mockEditorView
    } as unknown as customEditorView;
    const mockFiles = [
      new File(['file1 content'], 'file1.jpeg', { type: 'image/jpeg' }),
      new File(['file2 content'], 'file2.gif', { type: 'image/gif' }),
      new File(['file3 content'], 'file3.png', { type: 'image/png' })
    ];

    expect(uploadImageFiles(customeditorView, mockFiles, undefined as unknown as { x: number; y: number; })).toBeDefined();


  });

  it('should handle uploadImageFiles', () => {

    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });

    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin(), new ImageUploadPlaceholderPlugin()]
    });

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
    };
    const customeditorView = {
      runtime: { canUploadImage: true, uploadImage: true },
      readOnly: false,
      disabled: false,

      ...mockEditorView
    } as unknown as customEditorView;
    const mockFiles = [
      new File(['file1 content'], 'file1.jpeg', { type: 'image/jpeg' }),
      new File(['file2 content'], 'file2.gif', { type: 'image/gif' }),
      new File(['file3 content'], 'file3.png', { type: 'image/png' })
    ];

    expect(uploadImageFiles(customeditorView, mockFiles, { x: 1, y: 2 })).toBeDefined();
  });

  it('should not find Image Upload Placeholder', () => {
    const placeholder = {
      getState: () => undefined,
    } as unknown as ImageUploadPlaceholderPlugin;
    expect(findImageUploadPlaceholder(placeholder, {} as EditorState,
      {} as Record<string, unknown>)).toBeFalsy();
  });

  it('should handle apply', () => {
    const mockSchema = new Schema({
      nodes: {
        doc: { content: 'image' },
        text: {},
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: null }
          },
          group: 'inline',
          draggable: true,
          parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom: string | HTMLElement) {
              if (typeof dom === 'string') {
                return false;
              }
              return {
                src: dom.getAttribute('src'),
                alt: dom.getAttribute('alt')
              };
            }
          }],
          toDOM(node) {
            return ['img', { src: node.attrs.src, alt: node.attrs.alt || '' }];
          }
        }
      }
    });

    const plugin = new ImageUploadPlaceholderPlugin();
    const editorState = EditorState.create({
      schema: mockSchema,
      plugins: [new MultimediaPlugin(), plugin]
    });
    expect(() => editorState.apply(editorState.tr.insert(0, p()))).not.toThrow();
    expect(() => editorState.apply(editorState.tr.setMeta(plugin, { add: { pos: 0 } }))).not.toThrow();
    expect(() => editorState.apply(editorState.tr.setMeta(plugin, { remove: { id: 0 } }))).not.toThrow();
  });

});
