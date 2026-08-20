/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { TableCellNodeSpec } from './TableCellNodeSpec';
import { schema } from 'prosemirror-test-builder';
import { Schema } from 'prosemirror-model';

describe('TableCellNodeSpec', () => {
    const extendedSchema = new Schema({
        nodes: schema.spec.nodes.addToEnd('table_cell', {
            attrs: {
                colspan: { default: 1 },
                rowspan: { default: 1 },
                style: {},
                vAlign: {},
                fullSize: {}

            },
            content: 'inline*',
            tableRole: 'cell',
            isolating: true,
            parseDOM: [{
                tag: 'td', getAttrs(): false {
                    return false;
                },
            }],
            toDOM: (node) => {
                return ['td', { colspan: node.attrs.colspan, rowspan: node.attrs.rowspan, style: {}, fullSize: 1, vAlign: 'top' }, 0];
            },

        }),
        marks: schema.spec.marks
    });
    const tableCellNodeSpec = TableCellNodeSpec(extendedSchema.nodes.table_cell.spec);

    it('adds fullSize attribute to table cell', () => {
        const { attrs } = tableCellNodeSpec;
        expect(attrs.fullSize).toBeDefined();
        expect(attrs.fullSize.default).toBe(0);
    });

    it('parses fullSize attribute from DOM', () => {
        const { parseDOM } = tableCellNodeSpec;
        const dom = document.createElement('td');
        dom.setAttribute('fullSize', '1');
        const attrs = parseDOM[0].getAttrs(dom);
        expect(attrs).toEqual({ fullSize: 1, vAlign: 'top' });
    });

    it('parses vAlign attribute from DOM', () => {
        const { parseDOM } = tableCellNodeSpec;
        const dom = document.createElement('td');
        dom.setAttribute('fullSize', '1');
        dom.setAttribute('vAlign', 'bottom');
        const attrs = parseDOM[0].getAttrs(dom);
        expect(attrs).toEqual({ fullSize: 1, vAlign: 'bottom' });
    });

    it('parses vertical-align style from DOM when vAlign attr is missing', () => {
        const { parseDOM } = tableCellNodeSpec;
        const dom = document.createElement('td');
        dom.setAttribute('style', 'vertical-align: bottom;');
        const attrs = parseDOM[0].getAttrs(dom);
        expect(attrs).toEqual({ fullSize: 0, vAlign: 'bottom' });
    });
    it('serializes fullSize attribute to DOM', () => {
        const { toDOM } = tableCellNodeSpec;
        const node = extendedSchema.nodes.table_cell.create({ fullSize: 1, style: {}, vAlign: '' });
        const dom = toDOM(node);
        expect(dom).toEqual(['td', { 'colspan': 1, 'fullSize': 1, 'rowspan': 1, 'style': 'padding:0;margin:0;', 'vAlign': 'top', 'valign': 'top' }, 0]);
    });

    it('set vertical align to Top', () => {
        const { toDOM } = tableCellNodeSpec;
        const node = extendedSchema.nodes.table_cell.create({ fullSize: 1, style: {}, vAlign: 'top' });
        const dom = toDOM(node);
        expect(dom).toEqual(['td', { 'colspan': 1, 'fullSize': 1, 'rowspan': 1, 'style': 'padding:0;margin:0;', 'vAlign': 'top', 'valign': 'top' }, 0]);
    });

    it('set vertical align to Middle', () => {
        const { toDOM } = tableCellNodeSpec;
        const node = extendedSchema.nodes.table_cell.create({ fullSize: 1, style: {}, vAlign: 'middle' });
        const dom = toDOM(node);
        expect(dom).toEqual(['td', { 'colspan': 1, 'fullSize': 1, 'rowspan': 1, 'style': 'padding:0;margin:0;', 'vAlign': 'middle', 'valign': 'middle' }, 0]);
    });

    it('set vertical align to Bottom', () => {
        const { toDOM } = tableCellNodeSpec;
        const node = extendedSchema.nodes.table_cell.create({ fullSize: 1, style: {}, vAlign: 'bottom' });
        const dom = toDOM(node);
        expect(dom).toEqual(['td', { 'colspan': 1, 'fullSize': 1, 'rowspan': 1, 'style': 'padding:0;margin:0;', 'vAlign': 'bottom', 'valign': 'bottom' }, 0]);
    });

    it('set vertical align to top in default case', () => {
        const { toDOM } = tableCellNodeSpec;
        const node = extendedSchema.nodes.table_cell.create({ fullSize: 1, style: {}, vAlign: 'any' });
        const dom = toDOM(node);
        expect(dom).toEqual(['td', { 'colspan': 1, 'fullSize': 1, 'rowspan': 1, 'style': 'padding:0;margin:0;', 'vAlign': 'top', 'valign': 'top' }, 0]);
    });
});