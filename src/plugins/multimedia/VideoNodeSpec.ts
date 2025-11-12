import {NodeSpec} from 'prosemirror-model';

const CSS_ROTATE_PATTERN = /rotate\(([0-9.]+)rad\)/i;
const EMPTY_CSS_VALUE = new Set(['0%', '0pt', '0px']);

export function getCropRotate(
  dom: HTMLElement,
  marginLeft: string,
  marginTop: string
): {
  crop: {width: number; height: number; left: number; top: number} | null;
  rotate: number | null;
} {
  let crop = null;
  let rotate = null;
  const {parentElement} = dom;
  if (parentElement instanceof HTMLElement) {
    // Special case for Google doc's image.
    const ps = parentElement.style;
    if (
      ps.display === 'inline-block' &&
      ps.overflow === 'hidden' &&
      ps.width &&
      ps.height &&
      marginLeft &&
      !EMPTY_CSS_VALUE.has(marginLeft) &&
      marginTop &&
      !EMPTY_CSS_VALUE.has(marginTop)
    ) {
      crop = {
        width: Number.parseInt(ps.width, 10) || 0,
        height: Number.parseInt(ps.height, 10) || 0,
        left: Number.parseInt(marginLeft, 10) || 0,
        top: Number.parseInt(marginTop, 10) || 0,
      };
    }
    if (ps.transform) {
      // example: `rotate(1.57rad) translateZ(0px)`;
      const mm = CSS_ROTATE_PATTERN.exec(ps.transform);
      if (mm?.[1]) {
        rotate = Number.parseFloat(mm[1]) || null;
      }
    }
  }
  return {crop, rotate};
}

export function getAlign(
  dom: HTMLElement,
  cssFloat: string,
  display: string
): string | null {
  let align = dom.getAttribute('data-align') ?? dom.getAttribute('align');
  if (align) {
    align = /(left|right|center)/.test(align) ? align : null;
  } else if (cssFloat === 'left' && !display) {
    align = 'left';
  } else if (cssFloat === 'right' && !display) {
    align = 'right';
  } else if (!cssFloat && display === 'block') {
    align = 'block';
  }

  return align;
}

export function getAttrs(dom: string | HTMLElement) {
  if (typeof dom === 'string') {
    return false;
  }
  const {cssFloat, display} = dom.style;
  let {marginTop, marginLeft} = dom.style;
  let {width, height} = dom.style;
  const align = getAlign(dom, cssFloat, display);

  width = width || dom.getAttribute('width');
  height = height || dom.getAttribute('height');
  marginLeft = marginLeft || dom.getAttribute('marginLeft');
  marginTop = marginTop || dom.getAttribute('marginTop');

  const {crop, rotate} = getCropRotate(dom, marginLeft, marginTop);

  return {
    align,
    alt: dom.getAttribute('alt'),
    crop,
    height: Number.parseInt(height, 10) || null,
    rotate,
    src: dom.getAttribute('src'),
    title: dom.getAttribute('title'),
    width: Number.parseInt(width, 10) || null,
    marginLeft: Number.parseInt(marginLeft, 10) || null,
    marginTop: Number.parseInt(marginTop, 10) || null,
    id: dom.getAttribute('id'),
  };
}

// https://github.com/ProseMirror/prosemirror-schema-basic/blob/master/src/schema-basic.ts
export const VideoNodeSpec: NodeSpec = {
  inline: true,
  attrs: {
    id: {default: null},
    align: {default: null},
    alt: {default: ''},
    crop: {default: null},
    height: {default: null},
    rotate: {default: null},
    src: {default: null},
    title: {default: ''},
    width: {default: null},
  },
  group: 'inline',
  draggable: true,
  parseDOM: [{tag: 'iframe[src]', getAttrs}],
  toDOM(node) {
    const newAttrs = {...node.attrs};
    newAttrs.allow = 'autoplay';
    newAttrs.frameBorder = '0';
    newAttrs.allowFullScreen = true;
    return ['iframe', newAttrs];
  },
};
