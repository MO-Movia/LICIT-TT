/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { getNode } from './Constants';
import { Transform } from 'prosemirror-transform';

const createMockTransform = (nodes) => ({
  doc: {
    nodesBetween: jest.fn((_from, _to, callback) => {
      nodes.forEach((node, index) => callback(node, index) as unknown);
    }),
  },
});

describe('getNode', () => {
  test('should return the selected node when it exists', () => {
    const from = 0;
    const to = 10;
    const paragraphNode = { type: { name: 'paragraph' } };
    const nodes = [
      { type: { name: 'heading' } },
      paragraphNode,
      { type: { name: 'blockquote' } },
    ];

    const mockTransform = createMockTransform(nodes) as unknown as Transform;

    const result = getNode(from, to, mockTransform);
    expect(result).toBe(paragraphNode);
  });

  test('should return null when no paragraph node is found', () => {
    const from = 0;
    const to = 10;
    const nodes = [
      { type: { name: 'heading' } },
      { type: { name: 'blockquote' } },
    ];

    const mockTransform = createMockTransform(nodes) as unknown as Transform;

    const result = getNode(from, to, mockTransform);
    expect(result).toBeUndefined();
  });

  it('should update selectedNode when it is null', () => {
    const from = 0;
    const to = 10;

    const paragraphNode = { type: { name: 'paragraph' } } as unknown as Node;

    const nodesBetweenMock = jest.fn((_from, _to, callback) => {
      callback(paragraphNode, 0);
    });

    const tr = {
      doc: {
        nodesBetween: nodesBetweenMock,
      },
    } as unknown as Transform;

    const result = getNode(from, to, tr);

    expect(result).toBe(paragraphNode);
  });

  it('should not update selectedNode when it is not null', () => {
    const from = 0;
    const to = 10;

    const paragraphNode = { type: { name: 'paragraph' } } as unknown as Node;

    const nodesBetweenMock = jest.fn((_from, _to, callback) => {
      callback(paragraphNode, 0);
    });

    const tr = {
      doc: {
        nodesBetween: nodesBetweenMock,
      },
    } as unknown as Transform;

    const result = getNode(from, to, tr);

    expect(result).toBeDefined();
  });

  it('should update selectedNode when it is null 2', () => {
    const from = 0;
    const to = 10;

    const paragraphNode = { type: { name: 'paragraph' } } as unknown as Node;

    const nodesBetweenMock = jest.fn((_from, _to, callback) => {
      callback(paragraphNode, 0);
    });

    const tr = {
      doc: {
        nodesBetween: nodesBetweenMock,
      },
    } as unknown as Transform;

    const result = getNode(from, to, tr);

    expect(result).toBe(paragraphNode);
  });

  it('should not update selectedNode when it is not null 3', () => {
    const from = 0;
    const to = 10;

    const nonParagraphNode = {
      type: { name: 'other_node_type' },
    } as unknown as Node;

    const nodesBetweenMock = jest.fn((_from, _to, callback) => {
      callback(nonParagraphNode, 0);
    });

    const tr = {
      doc: {
        nodesBetween: nodesBetweenMock,
      },
    } as unknown as Transform;

    const result = getNode(from, to, tr);

    expect(result).toBeUndefined();
  });
});
