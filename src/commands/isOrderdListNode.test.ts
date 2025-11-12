import {schema} from 'prosemirror-schema-basic';
import {isOrderedListNode} from './isOrderedListNode';

describe('isOrderedListNode', () => {
  it('should return false if the node type is not "ordered_list"', () => {
    const node = schema.nodes.paragraph.create();
    const result = isOrderedListNode(node);
    expect(result).toBe(false);
  });
});
