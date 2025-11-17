import { Node, DOMOutputSpec } from '@tiptap/pm/model';
import { isTransparent, toCSSColor } from './toCSSColor';

// Always append to base calls.
const HASCITATION = 'hasCitation';
const MARKFROM = 'markFrom';
const APPLIEDHIGHLIGHT = 'appliedHighlight';

export type toDOMFn = (node: Node) => DOMOutputSpec;
export type getAttrsFromNodeFn = (p: Node | string) => { [k: string]: string };
export type Attrs = {
  highlightColor: string;
  hasCitation: boolean;
  markFrom: string;
  appliedHighlight: string;
};
export type getAttrsFromDomFn = (
  base: getAttrsFromNodeFn,
  dom: HTMLElement
) => Attrs;
export function getAttrs(base: getAttrsFromNodeFn, dom: HTMLElement): Attrs {
  const attrs = base(dom as unknown as Node | string);
  attrs[HASCITATION] = dom.getAttribute(HASCITATION);
  attrs[MARKFROM] = dom.getAttribute(MARKFROM);
  attrs[APPLIEDHIGHLIGHT] = dom.getAttribute(APPLIEDHIGHLIGHT);

  const { backgroundColor, zIndex, opacity } = dom.style;
  const color = toCSSColor(backgroundColor);
  return {
    highlightColor: isTransparent(color) ? '' : color,
    hasCitation: zIndex === '1',
    markFrom: opacity,
    appliedHighlight: zIndex === '1' ? color : 'transparent',
  };
}

function toDOM(base: toDOMFn, node: Node): DOMOutputSpec {
  const output = base(node);
  output[1][HASCITATION] = node.attrs[HASCITATION];
  output[1][MARKFROM] = node.attrs[MARKFROM];
  output[1][APPLIEDHIGHLIGHT] = node.attrs[APPLIEDHIGHLIGHT];
  const { highlightColor, hasCitation, markFrom, appliedHighlight } =
    node.attrs;
  let style = '';
  if (highlightColor && !hasCitation) {
    style += `background-color: ${highlightColor};`;
  }
  if (hasCitation) {
    style += `background-color: ${appliedHighlight};z-index: 1;opacity :${markFrom}`;
  }
  output[1].style = style;

  return output;
}

export const toMarkDOM = toDOM;
export const getMarkAttrs = getAttrs;
