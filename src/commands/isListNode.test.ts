import {isListNode} from './isListNode';
import {Node, Schema} from 'prosemirror-model';
describe('isListNode', () => {
  it('should return true if the node is bullet_list', () => {
    const blockNodeType = {
      group: 'block',
      name: 'bullet_list',
    };
    const schema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        text: {},
        bullet_list: {
          type: blockNodeType,
        },
      },
    });
    const customNode = schema.nodes.bullet_list.create();
    const result = isListNode(customNode);
    expect(result).toBe(true);
  });

  it('should return true if the node is ordered_list', () => {
    const blockNodeType = {
      group: 'block',
      name: 'bullet_list',
    };
    const schema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        text: {},
        ordered_list: {
          type: blockNodeType,
        },
      },
    });
    const customNode = schema.nodes.ordered_list.create();
    const result = isListNode(customNode);
    expect(result).toBe(true);
  });

  it('should return false if the node is not an instance of Node', () => {
    const node = {};
    const result = isListNode(node as Node);
    expect(result).toBe(false);
  });
});
