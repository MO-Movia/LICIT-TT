/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {TableHeader} from '@tiptap/extension-table-header';

const DEFAULT_CELL_WIDTH = '25px';
const DEFAULT_FONT_SIZE = '16px';
const DEFAULT_LETTER_SPACING = '0px';
const DEFAULT_MARGIN_TOP = '0px';
const DEFAULT_MARGIN_BOTTOM = '0px';
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
      marginTop: {
        default: DEFAULT_MARGIN_TOP,
        renderHTML: (attributes) => {
          const marginTop = normalizeCssSize(
            attributes.marginTop,
            DEFAULT_MARGIN_TOP
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
            DEFAULT_MARGIN_TOP
          );
        },
      },
      MarginBottom: {
        default: DEFAULT_MARGIN_BOTTOM,
        renderHTML: (attributes) => {
          const marginBottom = normalizeCssSize(
            attributes.MarginBottom,
            DEFAULT_MARGIN_BOTTOM
          );
          return {
            MarginBottom: marginBottom,
            style: `margin-bottom: ${marginBottom};`,
          };
        },
        parseHTML: (element) => {
          return normalizeCssSize(
            element.getAttribute('MarginBottom') ??
              element.getAttribute('marginBottom') ??
              element.dataset.marginBottom ??
              element.style.marginBottom,
            DEFAULT_MARGIN_BOTTOM
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
          return element.style.backgroundColor.replace(/['"]{1,10000}/g, '');
        },
      },
      borderLeft: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderLeft
            ? {style: `border-left: ${attributes.borderLeft}`}
            : {};
        },
        parseHTML: (element) => element.style.borderLeft || null,
      },
      borderRight: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderRight
            ? {style: `border-right: ${attributes.borderRight}`}
            : {};
        },
        parseHTML: (element) => element.style.borderRight || null,
      },
      borderTop: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderTop
            ? {style: `border-top: ${attributes.borderTop}`}
            : {};
        },
        parseHTML: (element) => element.style.borderTop || null,
      },
      borderBottom: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.borderBottom
            ? {style: `border-bottom: ${attributes.borderBottom}`}
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
          return element.style.borderColor.replace(/['"]{1,10000}/g, '');
        },
      },
    };
  },
});

