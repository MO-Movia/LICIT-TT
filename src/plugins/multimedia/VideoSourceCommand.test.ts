import {Transform} from 'prosemirror-transform';
import {Schema} from 'prosemirror-model';
import {insertIFrame} from './VideoSourceCommand';
import {ImageUploadCommand} from './ImageUploadCommand';

describe('ImageUploadCommand', () => {
  it('should noop executeCustom', () => {
    const tr = {} as Transform;
    const command = new ImageUploadCommand();
    expect(command.executeCustom(null!, tr)).toBe(tr);
  });
  it('should noop executeCustomStyleForTable', () => {
    const tr = {} as Transform;
    const command = new ImageUploadCommand();
    expect(command.executeCustomStyleForTable(null!, tr)).toBe(tr);
  });
});

describe('insertIFrame', () => {
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

    expect(insertIFrame(mockTransaction, mockSchema)).toBeDefined();
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

    expect(insertIFrame(mockTransaction, mockSchema)).toBeDefined();
  });
  it('should handle insertIFrame when from!=to', () => {
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
      selection: {from: 1, to: 2},
      tr: {
        selection: {},
      },
      insert: () => true,
    } as unknown as Transform;

    expect(insertIFrame(mockTransaction, mockSchema)).toBeDefined();
  });
});
