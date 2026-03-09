/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node, NodeSpec, TagParseRule} from 'prosemirror-model';
import {TABLE, VIGNETTE} from './Constants';

// Override the default table node spec to support custom attributes.
export const VignetteTableNodeSpec = (nodespec: NodeSpec): NodeSpec => ({
  ...nodespec,
  attrs: {
    marginLeft: {default: null},
    vignette: {default: false},
  },
  parseDOM: [
    {
      tag: TABLE,
      getAttrs(dom: HTMLElement): unknown {
        const {marginLeft} = dom.style;
        const vignette = dom.getAttribute(VIGNETTE) === 'true' || false;
        const marginAmount = Number.parseFloat(marginLeft);
        if (
          marginLeft &&
          !Number.isNaN(marginAmount) &&
          marginLeft.includes('px')
        ) {
          return {marginLeft: marginAmount, vignette};
        }
        return {vignette};
      },
      style: 'border',
    } as TagParseRule,
  ],
  toDOM(node: Node) {
    // Normally, the DOM structure of the table node is rendered by
    // `TableNodeView`. This method is only called when user selects a
    // table node and copies it, which triggers the "serialize to HTML" flow
    //  that calles this method.
    const {marginLeft, vignette} = node.attrs;
    const domAttrs = {vignette};
    let style;
    if(vignette){
    style = 'border: none ';}
    if (marginLeft) {
      style += `margin-left: ${marginLeft}px`;
    }
    domAttrs['style'] = style;
    return [TABLE, domAttrs, 0];
  },
});

export const VignetteTableCellNodeSpec = (nodespec: NodeSpec): NodeSpec => ({
  ...nodespec,
  attrs: {...nodespec?.attrs, vignette: {default: false}},
  parseDOM: [
    {
      tag: 'td',
      getAttrs: (dom: HTMLElement) => {
        const inlineStyle = dom.getAttribute('style') || '';

        let boxShadow: string | null = null;
        const key = 'box-shadow:';
        const start = inlineStyle.indexOf(key);

        if (start !== -1) {
          const from = start + key.length;
          const end = inlineStyle.indexOf(';', from);

          boxShadow =
            end >= 0
              ? inlineStyle.substring(from, end).trim()
              : inlineStyle.substring(from).trim();
        }
        let rgbValue: string | null = null;
        if (boxShadow) {
          const rgbStart = boxShadow.indexOf('rgb');
          if (rgbStart >= 0) {
            const rgbEnd = boxShadow.indexOf(')', rgbStart) + 1;
            rgbValue = boxShadow.substring(rgbStart, rgbEnd);
          }
        }
        return {
          ...nodespec.parseDOM[0].getAttrs(dom),
          vignette: dom.getAttribute(VIGNETTE) === 'true' || false,
          borderColor: rgbValue,
        };
      },
    },
  ],
  toDOM(node: Node) {
    const base = nodespec.toDOM(node);
    const borderColor = node.attrs.borderColor ?? '#36598d';
    if (
      node.attrs.vignette &&
      Array.isArray(base) &&
      1 < base.length &&
      base[1].style
    ) {
      base[1].style += `; border-radius: 10px; border:none!important; box-shadow: inset 0 0 0 1px ${borderColor};`;
    }

    base[1].vignette = node.attrs.vignette;

    return base;
  },
});
