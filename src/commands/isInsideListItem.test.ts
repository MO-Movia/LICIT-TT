import {Schema} from 'prosemirror-model';
import {isInsideListItem} from './isInsideListItem';

describe('isInsideListItem', () => {
  it('should return true if the position is inside a list item', () => {
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block*',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
        },
        listItem: {
          content: 'paragraph',
          group: 'block',
        },
        text: {},
      },
    });

    const doc = schema.nodes.doc.create(null, [
      schema.nodes.listItem.create(null, [
        schema.nodes.paragraph.create(null, [schema.text('Sample text')]),
      ]),
    ]);
    const result = isInsideListItem(doc, 4);

    expect(result).toBe(false);
  });

  it('should return false if the position is lessthan 2', () => {
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block*',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
        },
        listItem: {
          content: 'paragraph',
          group: 'block',
        },
        text: {},
      },
    });

    const doc = schema.nodes.doc.create(null, [
      schema.nodes.listItem.create(null, [
        schema.nodes.paragraph.create(null, [schema.text('Sample text')]),
      ]),
    ]);
    const result = isInsideListItem(doc, 1);

    expect(result).toBe(false);
  });

  it('should return false if the position is not inside a list item', () => {
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block*',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
        },
        listItem: {
          content: 'paragraph',
          group: 'block',
        },
        text: {},
      },
    });

    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [schema.text('Sample text')]),
    ]);
    const result = isInsideListItem(doc, 2);

    expect(result).toBe(false);
  });
});
