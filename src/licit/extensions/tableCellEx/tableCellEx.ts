/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { TableCell } from '@tiptap/extension-table-cell';
import { normalizeCssSize, normalizeValue } from '../table.utils';

const DEFAULT_LINE_HEIGHT = 'normal';
const DEFAULT_BORDER_WIDTH = '1px';

export const TableCellEx = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontName: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.fontName) {
            return {};
          }

          const fontName = normalizeCssSize(
            attributes.fontName
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
            element.style.fontFamily
          );
        },
      },
      paddingTop: {
        default: null,
        renderHTML: (attributes) => {
          const paddingTop = normalizeCssSize(
            attributes.paddingTop
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
            element.style.paddingTop
          );
        },
      },
      paddingBottom: {
        default: null,
        renderHTML: (attributes) => {
          const paddingBottom = normalizeCssSize(
            attributes.paddingBottom
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
            element.style.paddingBottom
          );
        },
      },
      paddingRight: {
        default: null,
        renderHTML: (attributes) => {
          const paddingRight = normalizeCssSize(
            attributes.paddingRight
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
            element.style.paddingRight
          );
        },
      },

      paddingLeft: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.paddingLeft
            ? { style: `padding-left: ${attributes.paddingLeft}` }
            : {};
        },
        parseHTML: (element) => {
          return (
            element.style.paddingLeft || null
          );
        },
      },
      lineHeight: {
        default: DEFAULT_LINE_HEIGHT,
        renderHTML: (attributes) => {
          const lineHeight = normalizeCssSize(
            attributes.lineHeight
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
            element.style.lineHeight
          );
        },
      },
      borderWidth: {
        default: DEFAULT_BORDER_WIDTH,
        renderHTML: (attributes) => {
          const borderWidth = normalizeCssSize(
            attributes.borderWidth
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
            element.style.borderWidth
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
          return element.style.backgroundColor.replaceAll(/['"]+/g, '');
        },
      },
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
          return element.style.borderColor.replaceAll(/['"]+/g, '');
        },
      },
      cellStyle: {
        default: null,
        renderHTML: (attributes) => {
          const cellStyle = normalizeValue(attributes.cellStyle);
          if (!cellStyle) {
            return {};
          }

          return {
            'data-cell-style': cellStyle,
            style: cellStyle,
          };
        },
        parseHTML: (element) => {
          return normalizeValue(element.dataset.cellStyle);
        },
      },
      cellWidth: {
        default: null,
        renderHTML: (attributes) => {
          const cellWidth = normalizeCssSize(attributes.cellWidth);
          if (!cellWidth) {
            return {};
          }

          return {
            'data-cell-width': cellWidth,
            style: `width: ${cellWidth}; min-width: ${cellWidth};`,
          };
        },
        parseHTML: (element) => {
          return (
            normalizeValue(element.dataset.cellWidth) ||
            normalizeValue(element.style.width)
          );
        },
      },
      fontSize: {
        default: null,
        renderHTML: (attributes) => {
          const fontSize = normalizeCssSize(attributes.fontSize);
          if (!fontSize) {
            return {};
          }

          return {
            'data-cell-font-size': fontSize,
            style: `font-size: ${fontSize}; --czi-cell-font-size: ${fontSize};`,
          };
        },
        parseHTML: (element) => {
          return (
            normalizeValue(element.dataset.cellFontSize) ||
            normalizeValue(element.style.fontSize)
          );
        },
      },
      letterSpacing: {
        default: null,
        renderHTML: (attributes) => {
          const letterSpacing = normalizeCssSize(attributes.letterSpacing);
          if (!letterSpacing) {
            return {};
          }

          return {
            style: `letter-spacing: ${letterSpacing};`,
          };
        },
        parseHTML: (element) => {
          return normalizeValue(element.style.letterSpacing);
        },
      },
      marginTop: {
        default: null,
        renderHTML: (attributes) => {
          const marginTop = normalizeCssSize(attributes.marginTop);
          if (!marginTop) {
            return {};
          }

          return {
            'data-cell-margin-top': marginTop,
            style: `margin-top: ${marginTop}; padding-top: ${marginTop}; --czi-cell-margin-top: ${marginTop};`,
          };
        },
        parseHTML: (element) => {
          return (
            normalizeValue(element.dataset.cellMarginTop) ||
            normalizeValue(element.style.marginTop) ||
            normalizeValue(element.style.paddingTop)
          );
        },
      },
      marginBottom: {
        default: null,
        renderHTML: (attributes) => {
          const marginBottom = normalizeCssSize(attributes.marginBottom);
          if (!marginBottom) {
            return {};
          }

          return {
            'data-cell-margin-bottom': marginBottom,
            style: `margin-bottom: ${marginBottom}; padding-bottom: ${marginBottom}; --czi-cell-margin-bottom: ${marginBottom};`,
          };
        },
        parseHTML: (element) => {
          return (
            normalizeValue(element.dataset.cellMarginBottom) ||
            normalizeValue(element.style.marginBottom) ||
            normalizeValue(element.style.paddingBottom)
          );
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
    };
  },
});
