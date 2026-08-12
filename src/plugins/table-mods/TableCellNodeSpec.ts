/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { DOMOutputSpec, Node, NodeSpec } from 'prosemirror-model';

const VALID_VERTICAL_ALIGNMENTS = new Set(['top', 'middle', 'bottom']);

const normalizeVerticalAlignment = (
  value: unknown,
  fallback = 'top'
): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return fallback;
  }

  return VALID_VERTICAL_ALIGNMENTS.has(normalizedValue)
    ? normalizedValue
    : fallback;
};

const appendInlineStyle = (style: unknown, declaration: string): string => {
  const currentStyle = typeof style === 'string' ? style.trim() : '';
  if (!currentStyle) {
    return declaration;
  }

  return `${currentStyle}${currentStyle.endsWith(';') ? '' : ';'}${declaration}`;
};

export const TableCellNodeSpec = (nodespec: NodeSpec) => ({
  ...nodespec,
  attrs: { ...nodespec.attrs, fullSize: { default: 0 }, vAlign: { default: 'top' } },
  parseDOM: [
    {
      tag: 'td',
      getAttrs: (dom: HTMLElement) => {
        const baseAttrs = nodespec.parseDOM[0].getAttrs(dom) as Record<
          string,
          unknown
        >;
        const attrFS = dom.getAttribute('fullSize');
        const attrsVAlign =
          dom.getAttribute('vAlign') ??
          dom.getAttribute('valign') ??
          dom.style.verticalAlign;
        let fullSize = 0;
        const vAlign = normalizeVerticalAlignment(
          attrsVAlign ?? baseAttrs?.verticalAlign ?? baseAttrs?.vAlign,
          'top'
        );
        if (attrFS) {
          fullSize = Number.parseInt(attrFS, 10);
        }
        return {
          ...baseAttrs,
          fullSize: fullSize,
          vAlign: vAlign,
        };
      },
    },
  ],
  toDOM(node: Node): DOMOutputSpec {
    const base = nodespec.toDOM(node);
    if (node.attrs.fullSize && node.attrs.fullSize === 1) {
      base[1].style = appendInlineStyle(
        base[1].style,
        'padding:0;margin:0;'
      );
    }
    const verticalAlignment = normalizeVerticalAlignment(
      node.attrs.vAlign ?? node.attrs.verticalAlign,
      'top'
    );

    const currentStyle = String(base[1].style ?? '');
    if (!/vertical-align\s*:/i.test(currentStyle)) {
      base[1].style = appendInlineStyle(
        currentStyle,
        ''
      );
    }

    base[1].fullSize = node.attrs.fullSize;
    base[1].vAlign = verticalAlignment;
    base[1].valign = verticalAlignment;

    return base;
  },
});

export default TableCellNodeSpec;
