/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node, mergeAttributes} from '@tiptap/core';
import toCSSLineSpacing from '../toCSSLineSpacing';
import convertToCSSPTValue from '../convertToCSSPTValue';
import { DOMOutputSpec } from 'prosemirror-model';

// This assumes that every 36pt maps to one indent level.
export const INDENT_MARGIN_PT_SIZE = 36;
export const MIN_INDENT_LEVEL = 0;
export const MAX_INDENT_LEVEL = 7;
export const ATTRIBUTE_INDENT = 'data-indent';
export const ATTRIBUTE_STYLE_LEVEL = 'data-style-level';
export const RESERVED_STYLE_NONE = 'None';
export const RESERVED_STYLE_NONE_NUMBERING = RESERVED_STYLE_NONE + '-@#$-';
const cssVal = new Set<string>(['', '0%', '0pt', '0px']);

export const EMPTY_CSS_VALUE = cssVal;

export type AttrType = {
  align?;
  lineSpacing?;
  marginTop?;
  marginBottom?;
  marginLeft?;
  marginRight?;
  paddingTop?;
  paddingBottom?;
  pageBreak?: boolean;
  style?: string;
  id?;
  level?;
  type?;
  visible?;
  indent?;
  listStyleType?;
  class?;
  latex?;
  name?;
  size?;
};

const ALIGN_PATTERN = /(left|right|center|justify)/;
type ParagraphStyleAttrs = Pick<
  AttrType,
  | 'align'
  | 'lineSpacing'
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'paddingTop'
  | 'paddingBottom'
>;

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
  const regexp = new RegExp(String.raw`(?:^|;)\s*${escapedProperty}\s*:\s*([^;]+)`, 'i');
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

  const attrNameMap: Record<string, string> = {
    'margin-top': 'marginTop',
    'margin-bottom': 'marginBottom',
    'margin-left': 'marginLeft',
    'margin-right': 'marginRight',
  };
  const attrName = attrNameMap[cssProperty] ?? cssProperty;

  if (fromStyle) {
    return fromStyle;
  }

  return (
    getInlineStyleProperty(dom, cssProperty) ??
    dom.getAttribute(cssProperty) ??
    dom.getAttribute(attrName) ??
    null
  );
}

function getAttrs(dom: HTMLElement): Record<string, unknown> {
  const {
    lineHeight,
    textAlign,
    marginLeft,
    paddingTop,
    paddingBottom,
  } =
    dom.style;

  let align = dom.getAttribute('align') || textAlign || 'left';
  align = ALIGN_PATTERN.test(align) ? align : null;

  let indent = Number.parseInt(dom.getAttribute(ATTRIBUTE_INDENT), 10);

  if (!indent && marginLeft) {
    indent = convertMarginLeftToIndentValue(marginLeft);
  }

  indent = indent || MIN_INDENT_LEVEL;

  const lineSpacing = lineHeight ? toCSSLineSpacing(lineHeight) : null;

  const id = dom.getAttribute('id') || '';
  const reset = dom.getAttribute('reset') || '';
  const overriddenAlign = dom.getAttribute('overriddenAlign') || '';
  const overriddenAlignValue = dom.getAttribute('overriddenAlignValue') || '';
  const overriddenLineSpacing = dom.getAttribute('overriddenLineSpacing') || '';
  const overriddenLineSpacingValue =
    dom.getAttribute('overriddenLineSpacingValue') || '';
  const overriddenIndent = dom.getAttribute('overriddenIndent') || '';
  const overriddenIndentValue = dom.getAttribute('overriddenIndentValue') || '';
  const selectionId = dom.getAttribute('selectionId') || '';
  const objectId = dom.getAttribute('objectId') || '';
  const marginTop = resolveMarginValue(dom, 'margin-top');
  const marginBottom = resolveMarginValue(dom, 'margin-bottom');
  const marginLeftValue = resolveMarginValue(dom, 'margin-left');
  const marginRight = resolveMarginValue(dom, 'margin-right');
  return {
    align,
    indent,
    lineSpacing,
    marginTop,
    marginBottom,
    marginLeft: marginLeftValue,
    marginRight,
    paddingTop,
    paddingBottom,
    reset,
    id,
    overriddenAlign,
    overriddenAlignValue,
    overriddenLineSpacing,
    overriddenLineSpacingValue,
    overriddenIndent,
    overriddenIndentValue,
    selectionId,
    objectId,
  };
}

function getStyle(attrs: {[key: string]: unknown}): string {
  return getStyleEx(attrs);
}

function getStyleEx({
  align,
  lineSpacing,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  paddingTop,
  paddingBottom,
}: ParagraphStyleAttrs): string {
  let style = '';
  if (align && align !== 'left') {
    style += `text-align: ${align};`;
  }

  if (lineSpacing) {
    const cssLineSpacing = toCSSLineSpacing(lineSpacing);
    style +=
      `line-height: ${cssLineSpacing};` +
      // This creates the local css variable `--czi-content-line-height`
      // that its children may apply.
      `--czi-content-line-height: ${cssLineSpacing};`;
  }

  if (marginTop !== null && marginTop !== undefined && marginTop !== '') {
    style += `margin-top: ${marginTop};`;
  }

  if (
    marginBottom !== null &&
    marginBottom !== undefined &&
    marginBottom !== ''
  ) {
    style += `margin-bottom: ${marginBottom};`;
  }
  if (marginLeft !== null && marginLeft !== undefined && marginLeft !== '') {
    style += `margin-left: ${marginLeft};`;
  }
  if (marginRight !== null && marginRight !== undefined && marginRight !== '') {
    style += `margin-right: ${marginRight};`;
  }

  if (paddingTop && !EMPTY_CSS_VALUE.has(paddingTop)) {
    style += `padding-top: ${paddingTop};`;
  }
  if (paddingBottom && !EMPTY_CSS_VALUE.has(paddingBottom)) {
    style += `padding-bottom: ${paddingBottom};`;
  }
  return style;
}

function toDOM(node):DOMOutputSpec  {
  const {
    indent,
    id,
    reset,
    overriddenAlign,
    overriddenAlignValue,
    overriddenLineSpacing,
    overriddenLineSpacingValue,
    overriddenIndent,
    overriddenIndentValue,
    selectionId,
  } = node.attrs;
  const attrs = {...node.attrs};
  const style = getStyle(node.attrs);

  if (style) {
    attrs.style = style;
  }

  if (indent) {
    attrs[ATTRIBUTE_INDENT] = String(indent);
  }
  if (id) {
    attrs.id = id;
  }
  attrs.reset = reset;
  attrs.overriddenAlign = overriddenAlign;
  attrs.overriddenLineSpacing = overriddenLineSpacing;
  attrs.overriddenIndent = overriddenIndent;
  attrs.overriddenAlignValue = overriddenAlignValue;
  attrs.overriddenLineSpacingValue = overriddenLineSpacingValue;
  attrs.overriddenIndentValue = overriddenIndentValue;

  if (selectionId) {
    attrs.selectionId = selectionId;
  }

  return ['p', attrs, 0];
}

export const toParagraphDOM = toDOM;
export const getParagraphNodeAttrs = getAttrs;
export const getParagraphStyle = getStyle;

export function convertMarginLeftToIndentValue(marginLeft: string): number {
  const ptValue = convertToCSSPTValue(marginLeft);
  return Math.min(
    Math.max(Math.floor(ptValue / INDENT_MARGIN_PT_SIZE), MIN_INDENT_LEVEL),
    MAX_INDENT_LEVEL
  );
}

// TipTap Node Definition
const ParagraphNode = Node.create({
  name: 'paragraph',

  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  content: 'inline*',

  defining: true,

  addAttributes() {
    return {
      align: {
        default: null,
        parseHTML: (element) => 
          getAttrs(element).align,
        renderHTML: (attributes) => {
          if (!attributes.align) return {};
          return {align: String(attributes.align)};
        },
      },
      color: {
        default: null,
      },
      id: {
        default: null,
        parseHTML: (element) => getAttrs(element).id,
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return {id: attributes.id};
        },
      },
      indent: {
        default: null,
        parseHTML: (element) => getAttrs(element).indent,
        renderHTML: (attributes) => {
          if (!attributes.indent) return {};
          return {[ATTRIBUTE_INDENT]: String(attributes.indent)};
        },
      },
      lineSpacing: {
        default: null,
        parseHTML: (element) => getAttrs(element).lineSpacing,
        renderHTML: (attributes) => {
          if (!attributes.lineSpacing) return {};
          return {};
        },
      },
      marginTop: {
        default: null,
        parseHTML: (element) => getAttrs(element).marginTop,
        renderHTML: (attributes) => {
          if (attributes.marginTop === null || attributes.marginTop === undefined)
            return {};
          return {};
        },
      },
      marginBottom: {
        default: null,
        parseHTML: (element) => getAttrs(element).marginBottom,
        renderHTML: (attributes) => {
          if (
            attributes.marginBottom === null ||
            attributes.marginBottom === undefined
          )
            return {};
          return {};
        },
      },
      marginLeft: {
        default: null,
        parseHTML: (element) => getAttrs(element).marginLeft,
        renderHTML: (attributes) => {
          if (
            attributes.marginLeft === null ||
            attributes.marginLeft === undefined
          )
            return {};
          return {};
        },
      },
      marginRight: {
        default: null,
        parseHTML: (element) => getAttrs(element).marginRight,
        renderHTML: (attributes) => {
          if (
            attributes.marginRight === null ||
            attributes.marginRight === undefined
          )
            return {};
          return {};
        },
      },
      paddingBottom: {
        default: null,
        parseHTML: (element) => getAttrs(element).paddingBottom,
        renderHTML: (attributes) => {
          if (!attributes.paddingBottom) return {};
          return {};
        },
      },
      paddingTop: {
        default: null,
        parseHTML: (element) => getAttrs(element).paddingTop,
        renderHTML: (attributes) => {
          if (!attributes.paddingTop) return {};
          return {};
        },
      },
      reset: {
        default: null,
        parseHTML: (element) => getAttrs(element).reset,
        renderHTML: (attributes) => {
          return {reset: attributes.reset || ''};
        },
      },
      overriddenAlign: {
        default: null,
        parseHTML: (element) => getAttrs(element).overriddenAlign,
        renderHTML: (attributes) => {
          return {overriddenAlign: attributes.overriddenAlign || ''};
        },
      },
      overriddenLineSpacing: {
        default: null,
        parseHTML: (element) => getAttrs(element).overriddenLineSpacing,
        renderHTML: (attributes) => {
          return {
            overriddenLineSpacing: attributes.overriddenLineSpacing || '',
          };
        },
      },
      overriddenIndent: {
        default: null,
        parseHTML: (element) => getAttrs(element).overriddenIndent,
        renderHTML: (attributes) => {
          return {overriddenIndent: attributes.overriddenIndent || ''};
        },
      },
      overriddenAlignValue: {
        default: null,
        parseHTML: (element) => getAttrs(element).overriddenAlignValue,
        renderHTML: (attributes) => {
          return {
            overriddenAlignValue: attributes.overriddenAlignValue || '',
          };
        },
      },
      overriddenLineSpacingValue: {
        default: null,
        parseHTML: (element) => getAttrs(element).overriddenLineSpacingValue,
        renderHTML: (attributes) => {
          return {
            overriddenLineSpacingValue:
              attributes.overriddenLineSpacingValue || '',
          };
        },
      },
      overriddenIndentValue: {
        default: null,
        parseHTML: (element) => getAttrs(element).overriddenIndentValue,
        renderHTML: (attributes) => {
          return {
            overriddenIndentValue: attributes.overriddenIndentValue || '',
          };
        },
      },
      selectionId: {
        default: null,
        parseHTML: (element) => getAttrs(element).selectionId,
        renderHTML: (attributes) => {
          if (!attributes.selectionId) return {};
          return {selectionId: attributes.selectionId};
        },
      },
      objectId: {
        default: null,
        parseHTML: (element) => getAttrs(element).objectId,
        renderHTML: (attributes) => {
          if (!attributes.objectId) return {};
          return {objectId: attributes.objectId};
        },
      },
    };
  },

  parseHTML() {
    return [{tag: 'p'}];
  },

  renderHTML({HTMLAttributes}) {
    const style = getStyle(HTMLAttributes);
    const attrs = {...HTMLAttributes};

    if (style) {
      attrs.style = style;
    }

    return ['p', mergeAttributes(this.options.HTMLAttributes, attrs), 0];
  },
});

export default ParagraphNode;
