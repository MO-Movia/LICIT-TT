import type {NodeSpec} from 'prosemirror-model';

const CSS_ROTATE_PATTERN = /rotate\(([0-9.]+)rad\)/i;
const EMPTY_CSS_VALUE = new Set(['0%', '0pt', '0px']);

function getAlignment(dom: HTMLElement) {
  const align = dom.getAttribute('data-align') ?? dom.getAttribute('align');
  const {cssFloat, display} = dom.style;
  if (align) {
    return /(left|right|center)/.test(align) ? align : null;
  } else if (cssFloat === 'left' && !display) {
    return 'left';
  } else if (cssFloat === 'right' && !display) {
    return 'right';
  } else if (!cssFloat && display === 'block') {
    return 'block';
  }
  return null;
}

export function getAttrs(dom: string | HTMLElement) {
  if (typeof dom === 'string') {
    return false;
  }
  const {marginTop, marginLeft} = dom.style;
  let {width, height} = dom.style;
  const align = getAlignment(dom);
  const capco = dom.getAttribute('capco');
  width = width || (dom.getAttribute('width') ?? '');
  height = height || (dom.getAttribute('height') ?? '');

  const attrfitToParent = dom.getAttribute('fitToParent');
  let fitToParent = 0;
  if (attrfitToParent) {
    fitToParent = Number.parseInt(attrfitToParent);
  }

  let crop = null;
  let rotate = null;
  let cropData = null;
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
      crop = makeCrop(ps, marginLeft, marginTop);
    }
    rotate = getRotation(ps, rotate);
    const cropDataAttr = dom.getAttribute('data-cropdata');
    if (cropDataAttr) {
      try {
        cropData = JSON.parse(cropDataAttr);
      } catch (error) {
        console.warn('Invalid cropDataAttr:', error);
      }
    }
  }

  return {
    align,
    capco,
    alt: dom.getAttribute('alt'),
    crop,
    cropData,
    height: Number.parseInt(height, 10),
    rotate,
    src: dom.getAttribute('src'),
    title: dom.getAttribute('title'),
    width: Number.parseInt(width, 10),
    fitToParent: fitToParent,
  };
}

// https://github.com/ProseMirror/prosemirror-schema-basic/blob/master/src/schema-basic.js
export const ImageNodeSpec: NodeSpec = {
  inline: true,
  attrs: {
    align: {default: null},
    capco: {default: null},
    alt: {default: ''},
    crop: {default: null},
    cropData: {default: null},
    height: {default: null},
    rotate: {default: null},
    src: {default: null},
    title: {default: ''},
    width: {default: null},
    fitToParent: {default: 0},
  },
  group: 'inline',
  draggable: true,
  parseDOM: [{tag: 'img[src]', getAttrs}],
  toDOM(node) {
    return ['img', node.attrs];
  },
};

function getRotation(ps: CSSStyleDeclaration, rotate: number) {
  if (ps.transform) {
    // example: `rotate(1.57rad) translateZ(0px)`;
    const mm = CSS_ROTATE_PATTERN.exec(ps.transform);
    if (mm?.[1]) {
      rotate = Number.parseFloat(mm[1]);
    }
  }
  return rotate;
}

function makeCrop(
  ps: CSSStyleDeclaration,
  marginLeft: string,
  marginTop: string
) {
  return {
    width: (ps.width, 10) || 0,
    height: Number.parseInt(ps.height, 10) || 0,
    left: Number.parseInt(marginLeft, 10) || 0,
    top: Number.parseInt(marginTop, 10) || 0,
  };
}
