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
      value: (value: unknown): unknown =>
        JSON.parse(JSON.stringify(value)) as unknown,
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

  it('should normalize table header, row, and rule types', () => {
    const inputDoc: LicitDocument = blankDocument(
      {
        ...blankNode('table_header'),
        attrs: {background: 'red', colwidth: [null]},
        content: [],
      },
      {
        ...blankNode('table_row'),
        content: [],
      },
      blankNode('hard_break'),
      blankNode('horizontal_rule')
    );

    const result = repairDoc(inputDoc);
    const [header, row, hardBreak, horizontalRule] = result.content;

    expect(header.type).toBe('tableHeader');
    expect(header.attrs?.backgroundColor).toBe('red');
    expect(header.attrs?.background).toBeUndefined();
    expect(header.attrs?.colwidth).toBeNull();
    expect(header.content?.length).toBe(1);

    expect(row.type).toBe('tableRow');
    expect(hardBreak.type).toBe('hardBreak');
    expect(horizontalRule.type).toBe('horizontalRule');
  });

  it('keeps existing cell content and respects existing backgroundColor', () => {
    const inputDoc: LicitDocument = blankDocument(
      {
        ...blankNode('table_cell'),
        attrs: {
          colwidth: [120],
          background: 'blue',
          backgroundColor: 'green',
        },
        content: [{...blankNode('paragraph'), content: [textNode('x')]}],
      }
    );

    const result = repairDoc(inputDoc);
    const cell = result.content[0];

    expect(cell.type).toBe('tableCell');
    expect(cell.attrs?.colwidth).toEqual([120]);
    expect(cell.attrs?.backgroundColor).toBe('green');
    expect(cell.attrs?.background).toBeUndefined();
    expect(cell.content?.length).toBe(1);
  });

  it('wraps a legacy direct EIC image in a paragraph', () => {
    const image = {
      ...blankNode('image'),
      attrs: {
        alt: 'Imported figure',
        height: 180,
        src: '/figure.png',
        width: 320,
      },
    };
    const inputDoc = blankDocument(
      {
        ...blankNode('enhanced_table_figure'),
        content: [
          {
            ...blankNode('enhanced_table_figure_body'),
            content: [image],
          },
          blankNode('enhanced_table_figure_capco', textNode(' ')),
        ],
      },
      blankNode('paragraph', textNode('Following content'))
    );

    const result = repairDoc(inputDoc);
    const body = result.content[0].content?.[0];

    expect(body?.content).toEqual([blankNode('paragraph', image)]);
    expect(result.content[1]).toEqual(
      blankNode('paragraph', textNode('Following content'))
    );
    expect(inputDoc.content[0].content?.[0].content).toEqual([image]);
  });

  it('does not wrap an EIC image paragraph twice', () => {
    const image = blankNode('image');
    const inputDoc = blankDocument(
      blankNode(
        'enhanced_table_figure',
        blankNode(
          'enhanced_table_figure_body',
          blankNode('paragraph', image)
        ),
        blankNode('enhanced_table_figure_capco', textNode(' '))
      )
    );

    const result = repairDoc(inputDoc);
    const body = result.content[0].content?.[0];

    expect(body?.content).toEqual([blankNode('paragraph', image)]);
  });
});
