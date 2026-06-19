/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node, DOMOutputSpec } from 'prosemirror-model';
import type { KeyValuePair } from './Constants';
import { toCSSLineSpacing } from '../../commands';
import {
  RESERVED_STYLE_NONE_NUMBERING,
} from './customStyleConstants';
export {
  RESERVED_STYLE_NONE,
  RESERVED_STYLE_NONE_NUMBERING,
} from './customStyleConstants';

import { getCustomStyleByName, getHidenumberingFlag } from './customStyle';

// This assumes that every 36pt maps to one indent level.
export const ATTRIBUTE_PREFIX = 'prefix';
export const ATTRIBUTE_TOT = 'tot';
export const ATTRIBUTE_TOF = 'tof';
export const ATTRIBUTE_HIDENUMBERING = 'hideNumbering';
export const INDENT_MARGIN_PT_SIZE = 36;
export const MIN_INDENT_LEVEL = 0;
export const MAX_INDENT_LEVEL = 7;
export const ATTRIBUTE_INDENT = 'data-indent';
export const ATTRIBUTE_STYLE_LEVEL = 'data-style-level';
export const ATTRIBUTE_LIST_STYLE_LEVEL = 'list-style-level';
export const HIDE_STYLE_LEVEL = 'hide-style-level';
export const ATTRIBUTE_BULLET_SYMBOL = 'data-bullet-symbol';
export const ATTRIBUTE_SHOW_SYMBOL = 'data-show-bullet';
export const ATTRIBUTE_BULLET_COLOR = 'data-bullet-color';
const cssVal = new Set(['', '0%', '0pt', '0px']);
/*
Symbols are grabbed from
https://en.wikipedia.org/wiki/List_of_Unicode_characters
https://en.wikipedia.org/wiki/List_of_Unicode_characters#Number_Forms
*/
export const BULLET_POINTS = [
  { key: '25CF', symbol: '● ', color: '#000000' },
  { key: '25CB', symbol: '○ ', color: '#000000' },
  { key: '2B9A', symbol: '⮚ ', color: '#000000' },
  { key: '2713', symbol: '✓ ', color: '#000000' },
  { key: '272A', symbol: '✪ ', color: '#0000FF' },
  { key: '272A272A', symbol: '✪✪ ', color: '#0000FF' },
];

export const EMPTY_CSS_VALUE = cssVal;

// Always append to base calls.
const STYLENAME = 'styleName';

type toDOMFn = (node: Node) => DOMOutputSpec;
type getAttrsFn = (p: Node | string | HTMLElement) => KeyValuePair;

function getInlineStyleProperty(
  dom: HTMLElement,
  propertyName: string
): string | null {
  const inlineStyle = dom.getAttribute('style') || '';
  if (!inlineStyle) {
    return null;
  }

  const escapedProperty = propertyName.replaceAll(
    /[.*+?^${}()|[\]\\]/g,
    String.raw`\$&`
  );
  const regexp = new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, 'i');
  const match = regexp.exec(inlineStyle);
  if (!match?.[1]) {
    return null;
  }

  const value = match[1].trim();
  return value || null;
}

function resolveMarginValue(dom: HTMLElement, cssProperty: string): string | null {
  const fromStyleMap: Record<string, string> = {
    'margin-top': dom.style.marginTop,
    'margin-bottom': dom.style.marginBottom,
    'margin-left': dom.style.marginLeft,
    'margin-right': dom.style.marginRight,
  };
  const fromStyle = fromStyleMap[cssProperty] ?? '';
  if (fromStyle) {
    return fromStyle;
  }

  const attrNameMap: Record<string, string> = {
    'margin-top': 'marginTop',
    'margin-bottom': 'marginBottom',
    'margin-left': 'marginLeft',
    'margin-right': 'marginRight',
  };
  const attrName = attrNameMap[cssProperty] ?? cssProperty;

  const value =
    getInlineStyleProperty(dom, cssProperty) ??
    dom.getAttribute(cssProperty) ??
    dom.getAttribute(attrName) ??
    null;

  return normalizeMarginValue(value);
}

function normalizeMarginValue(value: string | null): string | null {
  if (!value) {
    return value;
  }

  const normalized = /^(-?\d+)\.00(pt|px|%)$/i.exec(value);
  return normalized ? `${normalized[1]}${normalized[2]}` : value;
}

function getAttrs(base: getAttrsFn | undefined, dom: HTMLElement) {
  const attrs = base(dom);
  if (!attrs) {
    return attrs;
  }
  attrs[STYLENAME] = dom.getAttribute(STYLENAME);
  const domMarginTop = resolveMarginValue(dom, 'margin-top');
  if (
    (attrs.marginTop === undefined ||
      attrs.marginTop === null ||
      attrs.marginTop === '') &&
    domMarginTop
  ) {
    attrs.marginTop = domMarginTop;
  }
  const domMarginBottom = resolveMarginValue(dom, 'margin-bottom');
  if (
    (attrs.marginBottom === undefined ||
      attrs.marginBottom === null ||
      attrs.marginBottom === '') &&
    domMarginBottom
  ) {
    attrs.marginBottom = domMarginBottom;
  }
  const domMarginLeft = resolveMarginValue(dom, 'margin-left');
  if (
    (attrs.marginLeft === undefined ||
      attrs.marginLeft === null ||
      attrs.marginLeft === '') &&
    domMarginLeft
  ) {
    attrs.marginLeft = domMarginLeft;
  }
  const domMarginRight = resolveMarginValue(dom, 'margin-right');
  if (
    (attrs.marginRight === undefined ||
      attrs.marginRight === null ||
      attrs.marginRight === '') &&
    domMarginRight
  ) {
    attrs.marginRight = domMarginRight;
  }
  return attrs;
}

function toDOM(base: toDOMFn | undefined, node: Node) {
  const output = base(node);
  output[1][STYLENAME] = node.attrs[STYLENAME];
  const {
    style,
    styleLevel,
    indentOverriden,
    indentPosition,
    bulletDetails,
    isListStyle,
    prefix,
    hideNumbering,
    tot,
    tof,
  } = getStyle(node.attrs);
  applyStyleDOMAttrs(output, style);
  applyStyleLevelDOMAttrs(output, node, styleLevel, isListStyle);
  applyIndentDOMAttrs(output, node, indentPosition, indentOverriden);
  applyNumberingDOMAttrs(output, prefix, tot, tof, hideNumbering);
  applyBulletDOMAttrs(output, bulletDetails);

  return output;
}

function applyStyleDOMAttrs(output: DOMOutputSpec, style: string) {
  if (style) {
    output[1].style = style;
  }
}

function applyStyleLevelDOMAttrs(
  output: DOMOutputSpec,
  node: Node,
  styleLevel: number,
  isListStyle: boolean
) {
  if (!styleLevel) {
    return;
  }

  if (isListStyle) {
    output[1][ATTRIBUTE_LIST_STYLE_LEVEL] =
      node.attrs.indent === null ? styleLevel : node.attrs.indent + 1;
    return;
  }

  output[1][ATTRIBUTE_STYLE_LEVEL] = String(styleLevel);
  output[1][HIDE_STYLE_LEVEL] = getHidenumberingFlag();
}

function applyIndentDOMAttrs(
  output: DOMOutputSpec,
  node: Node,
  indentPosition: string,
  indentOverriden: string
) {
  if (indentPosition) {
    output[1]['indentPosition'] = indentPosition;
  }

  if (node.attrs.overriddenIndent) {
    output[1][ATTRIBUTE_INDENT] = String(node.attrs.overriddenIndentValue);
    return;
  }

  if ('' !== indentOverriden) {
    output[1][ATTRIBUTE_INDENT] = String(indentOverriden);
  }
}

function applyNumberingDOMAttrs(
  output: DOMOutputSpec,
  prefix: string,
  tot: boolean,
  tof: boolean,
  hideNumbering: boolean
) {
  if (prefix) {
    output[1][ATTRIBUTE_PREFIX] = prefix;
  }
  if (tot) {
    output[1][ATTRIBUTE_TOT] = tot;
  }
  if (tof) {
    output[1][ATTRIBUTE_TOF] = tof;
  }
  if (hideNumbering) {
    output[1][ATTRIBUTE_HIDENUMBERING] = hideNumbering;
  }
}

function applyBulletDOMAttrs(
  output: DOMOutputSpec,
  bulletDetails?: { symbol: string; color: string }
) {
  if (!bulletDetails?.symbol?.length) {
    return;
  }

  output[1][ATTRIBUTE_BULLET_SYMBOL] = bulletDetails.symbol;
  output[1][ATTRIBUTE_SHOW_SYMBOL] = bulletDetails.symbol.length > 0;
  output[1][ATTRIBUTE_BULLET_COLOR] = bulletDetails.color || '#000000';
}

function getStyle(attrs) {
  return getStyleEx(
    attrs.align,
    attrs.lineSpacing,
    attrs.styleName,
    attrs.marginTop,
    attrs.marginBottom,
    attrs.marginLeft,
    attrs.marginRight
    // attrs.indent
  );
}

// [FS] IRAD-1202 2021-02-15
function refreshCounters(styleLevel, isListStyle) {
  let latestCounters = '';
  let cssCounterReset = '';
  let setCounterReset = false;
  if (isListStyle) {
    // set style counters in window variables,
    // so that it is remapped later to add to document attribute via transaction.
    for (let index = 1; index <= styleLevel; index++) {
      const counterVar = 'set-cust-list-style-counter-' + index;
      const setCounterVal = window[counterVar];
      if (!setCounterVal) {
        cssCounterReset += `L${index} `;
        setCounterReset = true;
      }
      window[counterVar] = true;
    }
  } else {
    // set style counters in window variables,
    // so that it is remapped later to add to document attribute via transaction.
    for (let index = 1; index <= styleLevel; index++) {
      const counterVar = 'set-cust-style-counter-' + index;
      const setCounterVal = window[counterVar];
      if (!setCounterVal) {
        cssCounterReset += `C${index} `;
        setCounterReset = true;
      }
      window[counterVar] = true;
    }
  }
  if (setCounterReset) {
    latestCounters = `counter-increment: ${cssCounterReset};`;
  }
  return latestCounters;
}

function getBulletDetails(code) {
  const bulletData = {
    symbol: '',
    color: '',
  };
  for (const bullet of BULLET_POINTS) {
    if (bullet.key === code) {
      bulletData.symbol = bullet.symbol;
      bulletData.color = bullet.color;
    }
  };
  return bulletData;
}

function appendBaseStyle(style: string, align, lineSpacing) {
  let nextStyle = style;
  if (align && align !== 'left') {
    nextStyle += `text-align: ${align};`;
  }

  if (lineSpacing) {
    const cssLineSpacing = toCSSLineSpacing(lineSpacing);
    nextStyle +=
      `line-height: ${cssLineSpacing};` +
      `--czi-content-line-height: ${cssLineSpacing};`;
  }

  return nextStyle;
}

function applyIndentPositionStyle(style: string, indentPosition: string): string {
  if (!indentPosition) {
    return style;
  }

  const hIndentpx = Number(indentPosition) * 96;
  return `${style}--hangingIndentMargin: ${hIndentpx}px;`;
}

function applyParagraphSpacingStyle(style: string, styles): string {
  let nextStyle = style;
  if (styles.paragraphSpacingAfter) {
    nextStyle += `margin-bottom: ${styles.paragraphSpacingAfter}pt !important;`;
  }
  if (styles.paragraphSpacingBefore) {
    nextStyle += `margin-top: ${styles.paragraphSpacingBefore}pt !important;`;
  }
  return nextStyle;
}

function applyExplicitMarginStyle(
  style: string,
  margins: {
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
  }
): string {
  let nextStyle = style;
  if (margins.marginTop) {
    nextStyle += `margin-top: ${margins.marginTop} !important;`;
  }
  if (margins.marginBottom) {
    nextStyle += `margin-bottom: ${margins.marginBottom} !important;`;
  }
  if (margins.marginLeft) {
    nextStyle += `margin-left: ${margins.marginLeft} !important;`;
  }
  if (margins.marginRight) {
    nextStyle += `margin-right: ${margins.marginRight} !important;`;
  }
  return nextStyle;
}

function applyTextFormattingStyle(style: string, styles): string {
  let nextStyle = style;
  if (styles.strong) {
    nextStyle += 'font-weight: bold;';
  }
  if (styles.boldNumbering) {
    nextStyle += ' --czi-counter-bold: bold;';
  }
  if (styles.em) {
    nextStyle += 'font-style: italic;';
  }
  if (styles.color) {
    nextStyle += `color: ${styles.color};`;
  }
  if (styles.fontSize) {
    nextStyle += `font-size: ${styles.fontSize}pt;`;
  }
  if (styles.fontName) {
    nextStyle += `font-family: ${styles.fontName};`;
  }
  return nextStyle;
}

function getReservedStyleLevel(styleName: string): number {
  const indices = styleName.split(RESERVED_STYLE_NONE_NUMBERING);
  const styleLevel = 0;
  if (indices && 2 === indices.length) {
    const styleLevel = Number.parseInt(indices[1], 10);
    return Number.isNaN(styleLevel) ? 0 : styleLevel;
  }
  return styleLevel;
}

function createStyleData(align, lineSpacing) {
  return {
    style: appendBaseStyle('', align, lineSpacing),
    styleLevel: 0,
    indentOverriden: '',
    indentPosition: '',
    bulletDetails: undefined,
    isListStyle: false,
    prefix: '',
    tot: false,
    tof: false,
    hideNumbering: false,
  };
}

function applyBulletStyleData(styleData, styles) {
  if (!styles.hasBullet) {
    return;
  }

  styleData.bulletDetails = getBulletDetails(styles.bulletLevel);
  styleData.styleLevel = styles.styleLevel;
}

function applyCounterStyleData(styleData, styles) {
  if (!styles.styleLevel) {
    return;
  }

  styleData.style = applyTextFormattingStyle(styleData.style, styles);
  styleData.indentOverriden = styles.indent || '';
  styleData.styleLevel =
    styles.hasNumbering || styles.isList ? styles.styleLevel : 0;
  styleData.isListStyle = styles.isList;
  styleData.tot = styles.tot;
  styleData.tof = styles.tof;
  styleData.prefix = styles.prefixValue;
  styleData.hideNumbering = styles.hideNumbering;
  styleData.style += refreshCounters(styleData.styleLevel, styleData.isListStyle);
}

function applyCustomStyleData(styleData, align, styleProps) {
  const { styles } = styleProps;
  applyBulletStyleData(styleData, styles);

  styleData.indentPosition = styles.indentPosition || '';
  styleData.style = applyIndentPositionStyle(
    styleData.style,
    styleData.indentPosition
  );

  if (null === align && styles.align) {
    styleData.style += `text-align: ${styles.align};`;
  }

  styleData.style = applyParagraphSpacingStyle(styleData.style, styles);
  applyCounterStyleData(styleData, styles);
}

function applyReservedStyleData(styleData, styleName: string) {
  styleData.styleLevel = getReservedStyleLevel(styleName);
  if (!styleData.styleLevel) {
    return;
  }

  styleData.style += refreshCounters(
    styleData.styleLevel,
    styleData.isListStyle
  );
}

function getStyleEx(
  align,
  lineSpacing,
  styleName,
  marginTop?,
  marginBottom?,
  marginLeft?,
  marginRight?
) {
  const styleData = createStyleData(align, lineSpacing);
  if (null === styleName || 'None' === styleName) {
    return styleData;
  }

  const styleProps = getCustomStyleByName(styleName);
  if (styleProps?.styles) {
    applyCustomStyleData(styleData, align, styleProps);
    styleData.style = applyExplicitMarginStyle(styleData.style, {
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
    });
    return styleData;
  }

  if (styleName?.includes(RESERVED_STYLE_NONE_NUMBERING)) {
    applyReservedStyleData(styleData, styleName);
  }

  return styleData;
}

export const toCustomStyleDOM = toDOM;
export const getCustomStyleAttrs = getAttrs;
export const getDetailsBullet = getBulletDetails;
export const countersRefresh = refreshCounters;
