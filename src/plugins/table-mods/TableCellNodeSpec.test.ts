/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Schema} from 'prosemirror-model';
import {schema} from 'prosemirror-test-builder';
import {TableCellNodeSpec} from './TableCellNodeSpec';

describe('TableCellNodeSpec', () => {
  const extendedSchema = new Schema({
    nodes: schema.spec.nodes.addToEnd('table_cell', {
      attrs: {
        colspan: {default: 1},
        rowspan: {default: 1},
        style: {default: ''},
        vAlign: {default: 'top'},
        fullSize: {default: 0},
      },
      content: 'inline*',
      tableRole: 'cell',
      isolating: true,
      parseDOM: [
        {
          tag: 'td',
          getAttrs: () => ({}),
        },
      ],
      toDOM: (node) => [
        'td',
        {
          colspan: node.attrs.colspan,
          rowspan: node.attrs.rowspan,
          style: node.attrs.style,
        },
        0,
      ],
    }),
    marks: schema.spec.marks,
  });
  const tableCellNodeSpec = TableCellNodeSpec(
    extendedSchema.nodes.table_cell.spec
  );

  const serializeCell = (attrs: Record<string, unknown>) => {
    const node = extendedSchema.nodes.table_cell.create(attrs);
    return tableCellNodeSpec.toDOM(node) as [
      string,
      Record<string, unknown>,
      number,
    ];
  };

  it('adds fullSize and vAlign attributes to table cells', () => {
    expect(tableCellNodeSpec.attrs.fullSize).toEqual({default: 0});
    expect(tableCellNodeSpec.attrs.vAlign).toEqual({default: 'top'});
  });

  it('parses fullSize and vAlign attributes from DOM', () => {
    const dom = document.createElement('td');
    dom.setAttribute('fullSize', '1');
    dom.setAttribute('vAlign', 'bottom');

    expect(tableCellNodeSpec.parseDOM[0].getAttrs(dom)).toEqual({
      fullSize: 1,
      vAlign: 'bottom',
    });
  });

  it('parses vertical-align style when vAlign is missing', () => {
    const dom = document.createElement('td');
    dom.setAttribute('style', 'vertical-align: bottom;');

    expect(tableCellNodeSpec.parseDOM[0].getAttrs(dom)).toEqual({
      fullSize: 0,
      vAlign: 'bottom',
    });
  });

  it.each([
    'border-left-color: #ff0000',
    'border-right-color: #ff0000',
    'border-top-color: #ff0000',
    'border-bottom-color: #ff0000',
  ])('separates vertical-align from an unterminated %s style', (style) => {
    const dom = serializeCell({style, vAlign: 'top'});

    expect(dom[1].style).toBe(`${style};vertical-align: top;`);
  });

  it('does not add an extra separator to a terminated style', () => {
    const dom = serializeCell({
      style: 'border-top-color: #ff0000;',
      vAlign: 'middle',
    });

    expect(dom[1].style).toBe(
      'border-top-color: #ff0000;vertical-align: middle;'
    );
  });

  it('does not duplicate an existing vertical-align declaration', () => {
    const dom = serializeCell({
      style: 'border-top-color: #ff0000; vertical-align: bottom;',
      vAlign: 'top',
    });

    expect(dom[1].style).toBe(
      'border-top-color: #ff0000; vertical-align: bottom;'
    );
  });

  it('serializes fullSize without corrupting surrounding styles', () => {
    const dom = serializeCell({
      fullSize: 1,
      style: 'border-top-color: #ff0000',
      vAlign: 'middle',
    });

    expect(dom).toEqual([
      'td',
      {
        colspan: 1,
        rowspan: 1,
        style:
          'border-top-color: #ff0000;padding:0;margin:0;vertical-align: middle;',
        fullSize: 1,
        vAlign: 'middle',
        valign: 'middle',
      },
      0,
    ]);
  });

  it('falls back to top for an unsupported vertical alignment', () => {
    const dom = serializeCell({vAlign: 'any'});

    expect(dom[1]).toMatchObject({
      style: 'vertical-align: top;',
      vAlign: 'top',
      valign: 'top',
    });
  });
});
