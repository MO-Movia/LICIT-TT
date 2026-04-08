/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

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
    if (!result) {
      throw new Error('Expected result to be defined');
    }
    expect(result.mark.type.name).toBe('strong');
    expect(result.from.node?.type.name).toBe('text');
    expect(result.to.node?.type.name).toBe('text');
    expect(result.to.pos).toBe(9);
  });

  it('should handle reversed range (from > to)', () => {
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
          ],
        },
      ],
    });

    const result = findNodesWithSameMark(doc, 5, 2, schema.marks.strong);
    expect(result).not.toBeNull();
    expect(result?.mark.type.name).toBe('strong');
  });

  it('should stop at trailing node that starts with space', () => {
    const doc: Node = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{type: 'strong'}],
              text: 'Bold',
            },
            {
              type: 'text',
              text: ' text',
            },
          ],
        },
      ],
    });

    const textPositions: number[] = [];
    doc.descendants((node, pos) => {
      if (node.isText) {
        textPositions.push(pos);
      }
      return true;
    });

    const result = findNodesWithSameMark(
      doc,
      textPositions[0],
      textPositions[1],
      schema.marks.strong
    );
    expect(result).not.toBeNull();
    expect(result?.from.node?.text).toBe('Bold');
    expect(result?.to.node?.text).toBe('Bold');
  });
});
