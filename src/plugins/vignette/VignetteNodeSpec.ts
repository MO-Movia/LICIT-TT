import {Node, NodeSpec,TagParseRule} from 'prosemirror-model';
import {TABLE, VIGNETTE} from './Constants';

// Override the default table node spec to support custom attributes.
export const VignetteTableNodeSpec = (nodespec: NodeSpec): NodeSpec => (
  {
  ...nodespec,
  attrs: {
    marginLeft: { default: null },
    vignette: { default: false },
  },
  parseDOM: [
    {
      tag: TABLE,
      getAttrs(dom: HTMLElement): unknown {
        const { marginLeft } = dom.style;
        const vignette = dom.getAttribute(VIGNETTE) === 'true' || false;
        const marginAmount = parseFloat(marginLeft);
        if (
          marginLeft &&
          !Number.isNaN(marginAmount) &&
          marginLeft.includes('px')
        ) {
          return { marginLeft: marginAmount, vignette };
        }
        return { vignette };
      },
      style: 'border',
    } as TagParseRule,
  ],
  toDOM(node: Node) {
    // Normally, the DOM structure of the table node is rendered by
    // `TableNodeView`. This method is only called when user selects a
    // table node and copies it, which triggers the "serialize to HTML" flow
    //  that calles this method.
    const { marginLeft, vignette } = node.attrs;
    const domAttrs = { vignette };
    let style = 'border: none';
    if (marginLeft) {
      style += `margin-left: ${marginLeft}px`;
    }
    domAttrs['style'] = style;
    return [TABLE, domAttrs, 0];
  },
});

export const VignetteTableCellNodeSpec = (nodespec: NodeSpec): NodeSpec => ({
  ...nodespec,
  attrs: { ...nodespec?.attrs, vignette: { default: false } },
  parseDOM: [
    {
      tag: 'td',
      getAttrs: (dom: HTMLElement) => {
        return {
          ...nodespec.parseDOM[0].getAttrs(dom),
          vignette: dom.getAttribute(VIGNETTE) === 'true' || false,
        };
      },
    },
  ],
  toDOM(node: Node) {
    const base = nodespec.toDOM(node);
    if (
      node.attrs.vignette &&
      Array.isArray(base) &&
      1 < base.length &&
      base[1].style
    ) {
      base[1].style +=
      '; border-radius: 10px; border:none!important; box-shadow: inset 0 0 0 1px #36598d;';
    }

    base[1].vignette = node.attrs.vignette;

    return base;
  },
});
