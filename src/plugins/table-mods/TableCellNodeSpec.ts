/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {DOMOutputSpec, Node, NodeSpec} from 'prosemirror-model';

export const TableCellNodeSpec = (nodespec: NodeSpec) => ({
  ...nodespec,
  attrs: {...nodespec.attrs, fullSize: {default: 0}, vAlign: {default: 'top'}},
  parseDOM: [
    {
      tag: 'td',
      getAttrs: (dom: HTMLElement) => {
        const attrFS = dom.getAttribute('fullSize');
        const attrsVAlign = dom.getAttribute('vAlign');
        let fullSize = 0;
        let vAlign = 'top';
        if (attrFS) {
          fullSize = Number.parseInt(attrFS, 10);
        }
        if (attrsVAlign) {
          vAlign = attrsVAlign;
        }
        return {
          ...nodespec.parseDOM[0].getAttrs(dom),
          fullSize: fullSize,
          vAlign: vAlign,
        };
      },
    },
  ],
  toDOM(node: Node): DOMOutputSpec {
    const base = nodespec.toDOM(node);
    let style = '';
    if (Array.isArray(base) && 1 < base.length && base[1].style) {
      style = base[1].style;
    }

    if (node.attrs.fullSize && node.attrs.fullSize === 1) {
      base[1].style = style + 'padding:0;margin:0;';
    }
    if (node.attrs.vAlign) {
      switch (node.attrs.vAlign) {
        case 'top':
          base[1].style = base[1].style + 'vertical-align: top;';
          break;
        case 'middle':
          base[1].style = base[1].style + 'vertical-align: middle;';
          break;
        case 'bottom':
          base[1].style = base[1].style + 'vertical-align: bottom;';
          break;
        default:
          base[1].style = base[1].style + 'vertical-align: top;';
          break;
      }
    }

    base[1].fullSize = node.attrs.fullSize;
    base[1].vAlign = node.attrs.vAlign;

    return base;
  },
});

export default TableCellNodeSpec;
