import {findNodesWithSameMark} from './findNodesWithSameMark';
import {schema} from 'prosemirror-schema-basic';
import {Node} from 'prosemirror-model';
describe('findNodesWithSameMark', () => {
  it('should return null if any node within the range is missing marks', () => {
    const textNode = schema.text('Hello, World!');
    const node = schema.nodes.paragraph.create({}, [textNode]);
    const result = findNodesWithSameMark(node, 0, 2, schema.marks.code);

    expect(result).toBeNull();
  });

  it('should return null if nodes within the range have different marks', () => {
    const textNode = schema.text('Hello, World!');
    const node = schema.nodes.paragraph.create({}, [textNode]);
    const result = findNodesWithSameMark(node, 1, 2, schema.marks.code);

    expect(result).toBeNull();
  });

  it('should return the correct result', () => {
    const doc: Node = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{type: 'strong'}],
              text: 'Bold text',
            },
            {
              type: 'text',
              text: ' Regular text',
            },
          ],
        },
      ],
    });
    const from = 2;
    const to = 5;
    const markType = schema.marks.strong;
    const result = findNodesWithSameMark(doc, from, to, markType);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.mark.type.name).toBe('strong');
      expect(result.from.node?.type.name).toBe('text');
      expect(result.to.node?.type.name).toBe('text');
      expect(result.to.pos).toBe(9);
    }
  });
});
