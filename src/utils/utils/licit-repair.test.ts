/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import type { LicitDocument } from '../models/licit-document';
import { blankDocument, blankNode, textNode } from './licit-gen-json';
import { repairDoc } from './licit-repair';

describe('Doc Repair', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'structuredClone', {
      value: (value: unknown) => JSON.parse(JSON.stringify(value)),
      writable: true,
    });
  });
  it('should clone the input document and modify it', () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
          content: [textNode()],
        },
      ],
    };

    const expectedDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
          content: [textNode()],
        },
      ],
    };

    const result = repairDoc(inputDoc);
    expect(result).toEqual(expectedDoc);
    expect(result).not.toBe(inputDoc);
  });

  it('should handle nested content correctly', () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
          content: [
            {
              ...blankNode('nested'),
              content: [textNode(null!), textNode('hello')],
            },
            {
              ...blankNode('table_cell'),
              attrs: {
                colwidth: [null!],
              },
              content: [],
            },
            {
              ...blankNode('noContent'),
              content: undefined,
            },
          ],
        },
      ],
    };

    const expectedDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
          content: [
            {
              ...blankNode('nested'),
              content: [textNode(' '), textNode('hello')],
            },
            {
              ...blankNode('table_cell'),
              attrs: {
                colwidth: null,
              },
              content: [{ ...blankNode('paragraph'), content: [textNode()] }],
              type: 'tableCell',
            },
            {
              type: 'noContent',
              attrs: {},
            },
          ],
        },
      ],
    };

    const result = repairDoc(inputDoc);
    expect(result).toEqual(expectedDoc);
  });

  it('should return the original document if there is no content', () => {
    const inputDoc: LicitDocument = blankDocument();

    const result = repairDoc(inputDoc);
    expect(result).toEqual(inputDoc);
  });
});
