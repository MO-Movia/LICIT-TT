/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { TableHeader } from '@tiptap/extension-table-header';

const DEFAULT_CELL_WIDTH = '25px';
const DEFAULT_FONT_SIZE = '16px';
const DEFAULT_LETTER_SPACING = '0px';
const DEFAULT_LINE_HEIGHT = 'normal';
const DEFAULT_BORDER_WIDTH = '1px';
const DEFAULT_CELL_STYLE = '';

const normalizeCssSize = (value: unknown, fallback: string): string => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return `${value}px`;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (/^\d{1,10000}(\.\d{1,10000})?$/.test(trimmed)) {
    return `${trimmed}px`;
  }

  return trimmed;
};

function createOverrideAttribute(attributeName: string, datasetName: string) {
  return {
    default: null,
    renderHTML: (attributes) => {
      return attributes[attributeName]
        ? {[`data-cell-${datasetName}`]: 'true'}
        : {};
    },
    parseHTML: (element) => {
      return (
        element.getAttribute(attributeName) === 'true' ||
        element.getAttribute(`data-cell-${datasetName}`) === 'true' ||
        null
      );
    },
  };
}

export const TableHeaderEx = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      cellWidth: {
        default: DEFAULT_CELL_WIDTH,
        renderHTML: (attributes) => {
          const cellWidth = normalizeCssSize(
            attributes.cellWidth,
            DEFAULT_CELL_WIDTH
          );
          return {
            cellWidth,
            style: `width: ${cellWidth}; min-width: ${cellWidth};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('cellWidth') ??
            element.dataset.cellWidth ??
            element.style.width,
            DEFAULT_CELL_WIDTH
          );
        },
      },
      cellStyle: {
        default: DEFAULT_CELL_STYLE,
        renderHTML: (attributes) => {
          const cellStyle =
            typeof attributes.cellStyle === 'string'
              ? attributes.cellStyle.trim()
              : DEFAULT_CELL_STYLE;

          if (!cellStyle) {
            return {};
          }

          return {
            cellStyle,
            style: cellStyle,
          };
        },
        parseHTML: (element) => {
          return (
            element.getAttribute('cellStyle') ??
            element.dataset.cellStyle ??
            DEFAULT_CELL_STYLE
          );
        },
      },
      fontSize: {
        default: DEFAULT_FONT_SIZE,
        renderHTML: (attributes) => {
          const fontSize = normalizeCssSize(
            attributes.fontSize,
            DEFAULT_FONT_SIZE
          );
          return {
            fontSize,
            style: `font-size: ${fontSize};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('fontSize') ??
            element.dataset.fontSize ??
            element.style.fontSize,
            DEFAULT_FONT_SIZE
          );
        },
      },
      fontSizeOverridden: createOverrideAttribute(
        'fontSizeOverridden',
        'font-size-overridden'
      ),
      fontName: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.fontName) {
            return {};
          }

          const fontName = normalizeCssSize(
            attributes.fontName,
            null
          );

          return {
            fontName,
            style: `font-family: ${fontName};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('fontName') ??
            element.dataset.fontName ??
            element.style.fontFamily,
            null
          );
        },
      },
      fontNameOverridden: createOverrideAttribute(
        'fontNameOverridden',
        'font-name-overridden'
      ),
      fontWeight: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.fontWeight
            ? { style: `font-weight: ${attributes.fontWeight};` }
            : {};
        },
        parseHTML: (element) => element.style.fontWeight || null,
      },
      fontWeightOverridden: createOverrideAttribute(
        'fontWeightOverridden',
        'font-weight-overridden'
      ),
      fontStyle: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.fontStyle
            ? { style: `font-style: ${attributes.fontStyle};` }
            : {};
        },
        parseHTML: (element) => element.style.fontStyle || null,
      },
      fontStyleOverridden: createOverrideAttribute(
        'fontStyleOverridden',
        'font-style-overridden'
      ),
      textDecoration: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.textDecoration
            ? { style: `text-decoration: ${attributes.textDecoration};` }
            : {};
        },
        parseHTML: (element) => element.style.textDecoration || null,
      },
      textDecorationOverridden: createOverrideAttribute(
        'textDecorationOverridden',
        'text-decoration-overridden'
      ),
      textColor: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.textColor
            ? { style: `color: ${attributes.textColor};` }
            : {};
        },
        parseHTML: (element) => element.style.color || null,
      },
      textColorOverridden: createOverrideAttribute(
        'textColorOverridden',
        'text-color-overridden'
      ),
      textAlign: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.textAlign
            ? { style: `text-align: ${attributes.textAlign};` }
            : {};
        },
        parseHTML: (element) => element.style.textAlign || null,
      },
      textAlignOverridden: createOverrideAttribute(
        'textAlignOverridden',
        'text-align-overridden'
      ),
      letterSpacing: {
        default: DEFAULT_LETTER_SPACING,
        renderHTML: (attributes) => {
          const letterSpacing = normalizeCssSize(
            attributes.letterSpacing,
            DEFAULT_LETTER_SPACING
          );
          return {
            letterSpacing,
            style: `letter-spacing: ${letterSpacing};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('letterSpacing') ??
            element.dataset.letterSpacing ??
            element.style.letterSpacing,
            DEFAULT_LETTER_SPACING
          );
        },
      },
      letterSpacingOverridden: createOverrideAttribute(
        'letterSpacingOverridden',
        'letter-spacing-overridden'
      ),
      marginTop: {
        default: null,
        renderHTML: (attributes) => {
          const marginTop = normalizeCssSize(
            attributes.marginTop,
            null
          );
          return {
            marginTop,
            style: `margin-top: ${marginTop};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('marginTop') ??
            element.dataset.marginTop ??
            element.style.marginTop,
            null
          );
        },
      },
      marginBottom: {
        default: null,
        renderHTML: (attributes) => {
          const marginBottom = normalizeCssSize(
            attributes.marginBottom,
            null
          );
          return {
            marginBottom,
            style: `margin-bottom: ${marginBottom};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('marginBottom') ??
            element.getAttribute('MarginBottom') ??
            element.dataset.marginBottom ??
            element.style.marginBottom,
            null
          );
        },
      },
      marginLeft: {
        default: null,
        renderHTML: (attributes) => {
          const marginLeft = normalizeCssSize(
            attributes.marginLeft,
            null
          );
          return {
            marginLeft,
            style: `margin-left: ${marginLeft};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('marginLeft') ??
            element.dataset.marginLeft ??
            element.style.marginLeft,
            null
          );
        },
      },
      marginRight: {
        default: null,
        renderHTML: (attributes) => {
          const marginRight = normalizeCssSize(
            attributes.marginRight,
            null
          );
          return {
            marginRight,
            style: `margin-right: ${marginRight};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('marginRight') ??
            element.getAttribute('MarginRight') ??
            element.dataset.marginRight ??
            element.style.marginRight,
            null
          );
        },
      },
      paddingTop: {
        default: null,
        renderHTML: (attributes) => {
          const paddingTop = normalizeCssSize(
            attributes.paddingTop,
            null
          );
          return {
            paddingTop: paddingTop,
            style: `padding-top: ${paddingTop};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('PaddingTop') ??
            element.getAttribute('paddingTop') ??
            element.dataset.paddingTop ??
            element.style.paddingTop,
            null
          );
        },
      },
      paddingBottom: {
        default: null,
        renderHTML: (attributes) => {
          const paddingBottom = normalizeCssSize(
            attributes.paddingBottom,
            null
          );
          return {
            paddingBottom: paddingBottom,
            style: `padding-bottom: ${paddingBottom};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('paddingBottom') ??
            element.dataset.paddingBottom ??
            element.style.paddingBottom,
            null
          );
        },
      },

      paddingRight: {
        default: null,
        renderHTML: (attributes) => {
          const paddingRight = normalizeCssSize(
            attributes.paddingRight,
            null
          );
          return {
            paddingRight: paddingRight,
            style: `padding-right: ${paddingRight};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('paddingRight') ??
            element.getAttribute('paddingRight') ??
            element.dataset.paddingRight ??
            element.style.paddingRight,
            null
          );
        },
      },

      paddingLeft: {
        default: null,
        renderHTML: (attributes) => {
          const paddingLeft = normalizeCssSize(
            attributes.paddingLeft,
            null
          );
          return {
            paddingLeft: paddingLeft,
            style: `padding-left: ${paddingLeft};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('paddingLeft') ??
            element.getAttribute('paddingLeft') ??
            element.dataset.paddingLeft ??
            element.style.paddingLeft,
            null
          );
        },
      },

      lineHeight: {
        default: DEFAULT_LINE_HEIGHT,
        renderHTML: (attributes) => {
          const lineHeight = normalizeCssSize(
            attributes.lineHeight,
            DEFAULT_LINE_HEIGHT
          );
          return {
            lineHeight: lineHeight,
            style: `line-height: ${lineHeight};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('lineHeight') ??
            element.dataset.lineHeight ??
            element.style.lineHeight,
            DEFAULT_LINE_HEIGHT
          );
        },
      },
      lineHeightOverridden: createOverrideAttribute(
        'lineHeightOverridden',
        'line-height-overridden'
      ),
      borderWidth: {
        default: DEFAULT_BORDER_WIDTH,
        renderHTML: (attributes) => {
          const borderWidth = normalizeCssSize(
            attributes.borderWidth,
            DEFAULT_BORDER_WIDTH
          );
          return {
            borderWidth: borderWidth,
            style: `border-width: ${borderWidth};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('borderWidth') ??
            element.getAttribute('borderWidth') ??
            element.dataset.borderWidth ??
            element.style.borderWidth,
            DEFAULT_BORDER_WIDTH
          );
        },
      },
      backgroundColor: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color:  ${attributes.backgroundColor?.color || attributes.backgroundColor};`,
          };
        },
        parseHTML: (element) => {
          return element.style.backgroundColor.replaceAll(/['"]/g, '');
        },
      },
      backgroundColorOverridden: createOverrideAttribute(
        'backgroundColorOverridden',
        'background-color-overridden'
      ),
      borderLeft: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderLeft
            ? { style: `border-left: ${attributes.borderLeft}` }
            : {};
        },
        parseHTML: (element) => element.style.borderLeft || null,
      },
      borderRight: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderRight
            ? { style: `border-right: ${attributes.borderRight}` }
            : {};
        },
        parseHTML: (element) => element.style.borderRight || null,
      },
      borderTop: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderTop
            ? { style: `border-top: ${attributes.borderTop}` }
            : {};
        },
        parseHTML: (element) => element.style.borderTop || null,
      },
      borderBottom: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderBottom
            ? { style: `border-bottom: ${attributes.borderBottom}` }
            : {};
        },
        parseHTML: (element) => element.style.borderBottom || null,
      },
      borderColor: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.borderColor) {
            return {};
          }

          return {
            style: `border-color: ${attributes.borderColor}`,
          };
        },
        parseHTML: (element) => {
          return element.style.borderColor.replaceAll(/['"]/g, '');
        },
      },
      borderLeftWidth: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderLeftWidth
            ? { style: `border-left-width: ${attributes.borderLeftWidth}` }
            : {};
        },
        parseHTML: (element) => element.style.borderLeftWidth || null,
      },
      borderRightWidth: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderRightWidth
            ? { style: `border-right-width: ${attributes.borderRightWidth}` }
            : {};
        },
        parseHTML: (element) => element.style.borderRightWidth || null,
      },
      borderTopWidth: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderTopWidth
            ? { style: `border-top-width: ${attributes.borderTopWidth}` }
            : {};
        },
        parseHTML: (element) => element.style.borderTopWidth || null,
      },
      borderBottomWidth: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderBottomWidth
            ? { style: `border-bottom-width: ${attributes.borderBottomWidth}` }
            : {};
        },
        parseHTML: (element) => element.style.borderBottomWidth || null,
      },
      borderLeftColor: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderLeftColor
            ? { style: `border-left-color: ${attributes.borderLeftColor}` }
            : {};
        },
        parseHTML: (element) => element.style.borderLeftColor || null,
      },
      borderRightColor: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderRightColor
            ? { style: `border-right-color: ${attributes.borderRightColor}` }
            : {};
        },
        parseHTML: (element) => element.style.borderRightColor || null,
      },
      borderTopColor: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderTopColor
            ? { style: `border-top-color: ${attributes.borderTopColor}` }
            : {};
        },
        parseHTML: (element) => element.style.borderTopColor || null,
      },
      borderBottomColor: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderBottomColor
            ? { style: `border-bottom-color: ${attributes.borderBottomColor}` }
            : {};
        },
        parseHTML: (element) => element.style.borderBottomColor || null,
      },
      borderBottomStyle: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderBottomStyle
            ? { style: `border-bottom-style: ${attributes.borderBottomStyle}` }
            : {};
        },
        parseHTML: (element) => element.style.borderBottomStyle || null,
      },
      borderTopStyle: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderTopStyle
            ? { style: `border-top-style: ${attributes.borderTopStyle}` }
            : {};
        },
        parseHTML: (element) => element.style.borderTopStyle || null,
      },
      borderLeftStyle: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderLeftStyle
            ? { style: `border-left-style: ${attributes.borderLeftStyle}` }
            : {};
        },
        parseHTML: (element) => element.style.borderLeftStyle || null,
      },
      borderRightStyle: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderRightStyle
            ? { style: `border-right-style: ${attributes.borderRightStyle}` }
            : {};
        },
        parseHTML: (element) => element.style.borderRightStyle || null,
      },
      verticalAlign: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.verticalAlign
            ? {
              verticalAlign: attributes.verticalAlign,
              valign: attributes.verticalAlign,
              style: `vertical-align: ${attributes.verticalAlign}`,
            }
            : {};
        },
        parseHTML: (element) =>
          element.style.verticalAlign ||
          element.getAttribute('valign') ||
          element.getAttribute('vAlign') ||
          null,
      },
      verticalAlignOverridden: createOverrideAttribute(
        'verticalAlignOverridden',
        'vertical-align-overridden'
      ),
    };
  },
});
