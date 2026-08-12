/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {TableHeader} from '@tiptap/extension-table-header';

const DEFAULT_CELL_WIDTH = '25px';
const DEFAULT_FONT_SIZE = '16px';
const DEFAULT_LETTER_SPACING = '0px';
const DEFAULT_LINE_HEIGHT = 'normal';
const DEFAULT_BORDER_WIDTH = '1px';
const DEFAULT_CELL_STYLE = '';

type AttributeSet = Record<string, unknown>;
type AttributeConfig = {
  default: unknown;
  renderHTML: (attributes: AttributeSet) => AttributeSet;
  parseHTML: (element: HTMLElement) => unknown;
};

type SizeAttributeOptions = {
  attributeName: string;
  cssProperty: string;
  defaultValue: string | null;
  styleProperty: keyof CSSStyleDeclaration;
  attributeNames?: string[];
  datasetNames?: string[];
  styleTemplate?: (value: string | null) => string;
};

const normalizeCssSize = (
  value: unknown,
  fallback: string | null
): string | null => {
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

const readFirstValue = (...values: unknown[]): unknown => {
  return values.find((value) => value !== null && value !== undefined);
};

const readDatasetValue = (
  element: HTMLElement,
  datasetNames: string[]
): string | undefined => {
  for (const datasetName of datasetNames) {
    const value = element.dataset[datasetName];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

function createOverrideAttribute(
  attributeName: string,
  datasetName: string
): AttributeConfig {
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

function createSizeStyleAttribute(
  options: SizeAttributeOptions
): AttributeConfig {
  const {
    attributeName,
    cssProperty,
    defaultValue,
    styleProperty,
    attributeNames = [attributeName],
    datasetNames = [attributeName],
    styleTemplate = (value) => `${cssProperty}: ${value};`,
  } = options;

  return {
    default: defaultValue,
    renderHTML: (attributes) => {
      const value = normalizeCssSize(attributes[attributeName], defaultValue);
      return {
        [attributeName]: value,
        style: styleTemplate(value),
      };
    },
    parseHTML: (element) => {
      const attributeValue = readFirstValue(
        ...attributeNames.map((name) => element.getAttribute(name)),
        readDatasetValue(element, datasetNames),
        element.style[styleProperty]
      );
      return normalizeCssSize(attributeValue, defaultValue);
    },
  };
}

function createInlineStyleAttribute(
  attributeName: string,
  cssProperty: string,
  styleProperty: keyof CSSStyleDeclaration,
  suffix = ';'
): AttributeConfig {
  return {
    default: null,
    renderHTML: (attributes) => {
      const value = attributes[attributeName];
      if (typeof value !== 'string' && typeof value !== 'number') {
        return {};
      }

      return {style: `${cssProperty}: ${value}${suffix}`};
    },
    parseHTML: (element) => element.style[styleProperty] || null,
  };
}

function createBorderAttributes(): Record<string, AttributeConfig> {
  const borderAttributes = {};
  const sides = ['Left', 'Right', 'Top', 'Bottom'];
  const parts = [
    ['', 'border'],
    ['Width', 'border-width'],
    ['Color', 'border-color'],
    ['Style', 'border-style'],
  ];

  for (const side of sides) {
    for (const [suffix, cssBase] of parts) {
      const attributeName = `border${side}${suffix}`;
      const cssProperty = `${cssBase.replace('border', 'border-' + side.toLowerCase())}`;
      const styleProperty = attributeName as keyof CSSStyleDeclaration;
      borderAttributes[attributeName] = createInlineStyleAttribute(
        attributeName,
        cssProperty,
        styleProperty
      );
    }
  }

  return borderAttributes;
}

const cellWidthAttribute = createSizeStyleAttribute({
  attributeName: 'cellWidth',
  cssProperty: 'width',
  defaultValue: DEFAULT_CELL_WIDTH,
  styleProperty: 'width',
  styleTemplate: (value) => `width: ${value}; min-width: ${value};`,
});

const fontSizeAttribute = createSizeStyleAttribute({
  attributeName: 'fontSize',
  cssProperty: 'font-size',
  defaultValue: DEFAULT_FONT_SIZE,
  styleProperty: 'fontSize',
});

const letterSpacingAttribute = createSizeStyleAttribute({
  attributeName: 'letterSpacing',
  cssProperty: 'letter-spacing',
  defaultValue: DEFAULT_LETTER_SPACING,
  styleProperty: 'letterSpacing',
});

const lineHeightAttribute = createSizeStyleAttribute({
  attributeName: 'lineHeight',
  cssProperty: 'line-height',
  defaultValue: DEFAULT_LINE_HEIGHT,
  styleProperty: 'lineHeight',
});

const borderWidthAttribute = createSizeStyleAttribute({
  attributeName: 'borderWidth',
  cssProperty: 'border-width',
  defaultValue: DEFAULT_BORDER_WIDTH,
  styleProperty: 'borderWidth',
});

const spacingAttributes = {
  marginTop: createSizeStyleAttribute({
    attributeName: 'marginTop',
    cssProperty: 'margin-top',
    defaultValue: null,
    styleProperty: 'marginTop',
  }),
  marginBottom: createSizeStyleAttribute({
    attributeName: 'marginBottom',
    cssProperty: 'margin-bottom',
    defaultValue: null,
    styleProperty: 'marginBottom',
    attributeNames: ['marginBottom', 'MarginBottom'],
  }),
  marginLeft: createSizeStyleAttribute({
    attributeName: 'marginLeft',
    cssProperty: 'margin-left',
    defaultValue: null,
    styleProperty: 'marginLeft',
  }),
  marginRight: createSizeStyleAttribute({
    attributeName: 'marginRight',
    cssProperty: 'margin-right',
    defaultValue: null,
    styleProperty: 'marginRight',
    attributeNames: ['marginRight', 'MarginRight'],
  }),
  paddingTop: createSizeStyleAttribute({
    attributeName: 'paddingTop',
    cssProperty: 'padding-top',
    defaultValue: null,
    styleProperty: 'paddingTop',
    attributeNames: ['PaddingTop', 'paddingTop'],
  }),
  paddingBottom: createSizeStyleAttribute({
    attributeName: 'paddingBottom',
    cssProperty: 'padding-bottom',
    defaultValue: null,
    styleProperty: 'paddingBottom',
  }),
  paddingRight: createSizeStyleAttribute({
    attributeName: 'paddingRight',
    cssProperty: 'padding-right',
    defaultValue: null,
    styleProperty: 'paddingRight',
  }),
  paddingLeft: createSizeStyleAttribute({
    attributeName: 'paddingLeft',
    cssProperty: 'padding-left',
    defaultValue: null,
    styleProperty: 'paddingLeft',
  }),
};

const overrideAttributes = {
  fontSizeOverridden: createOverrideAttribute(
    'fontSizeOverridden',
    'font-size-overridden'
  ),
  fontNameOverridden: createOverrideAttribute(
    'fontNameOverridden',
    'font-name-overridden'
  ),
  fontWeightOverridden: createOverrideAttribute(
    'fontWeightOverridden',
    'font-weight-overridden'
  ),
  fontStyleOverridden: createOverrideAttribute(
    'fontStyleOverridden',
    'font-style-overridden'
  ),
  textDecorationOverridden: createOverrideAttribute(
    'textDecorationOverridden',
    'text-decoration-overridden'
  ),
  textColorOverridden: createOverrideAttribute(
    'textColorOverridden',
    'text-color-overridden'
  ),
  textAlignOverridden: createOverrideAttribute(
    'textAlignOverridden',
    'text-align-overridden'
  ),
  letterSpacingOverridden: createOverrideAttribute(
    'letterSpacingOverridden',
    'letter-spacing-overridden'
  ),
  lineHeightOverridden: createOverrideAttribute(
    'lineHeightOverridden',
    'line-height-overridden'
  ),
  backgroundColorOverridden: createOverrideAttribute(
    'backgroundColorOverridden',
    'background-color-overridden'
  ),
  verticalAlignOverridden: createOverrideAttribute(
    'verticalAlignOverridden',
    'vertical-align-overridden'
  ),
};

export const TableHeaderEx = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      cellWidth: cellWidthAttribute,
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
      fontSize: fontSizeAttribute,
      fontName: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.fontName) {
            return {};
          }

          const fontName = normalizeCssSize(attributes.fontName, null);
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
      fontWeight: createInlineStyleAttribute(
        'fontWeight',
        'font-weight',
        'fontWeight'
      ),
      fontStyle: createInlineStyleAttribute(
        'fontStyle',
        'font-style',
        'fontStyle'
      ),
      textDecoration: createInlineStyleAttribute(
        'textDecoration',
        'text-decoration',
        'textDecoration'
      ),
      textColor: createInlineStyleAttribute('textColor', 'color', 'color'),
      textAlign: createInlineStyleAttribute(
        'textAlign',
        'text-align',
        'textAlign'
      ),
      letterSpacing: letterSpacingAttribute,
      ...spacingAttributes,
      lineHeight: lineHeightAttribute,
      borderWidth: borderWidthAttribute,
      backgroundColor: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color:  ${
              attributes.backgroundColor?.color || attributes.backgroundColor
            };`,
          };
        },
        parseHTML: (element) => {
          return element.style.backgroundColor.replaceAll(/['"]/g, '');
        },
      },
      ...createBorderAttributes(),
      borderColor: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.borderColor) {
            return {};
          }

          return {
            style: `border-color: ${attributes.borderColor};`,
          };
        },
        parseHTML: (element) => {
          return element.style.borderColor.replaceAll(/['"]/g, '');
        },
      },
      verticalAlign: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.verticalAlign
            ? {
              verticalAlign: attributes.verticalAlign,
              valign: attributes.verticalAlign,
              style: `vertical-align: ${attributes.verticalAlign};`,
            }
            : {};
        },
        parseHTML: (element) =>
          element.style.verticalAlign ||
          element.getAttribute('valign') ||
          element.getAttribute('vAlign') ||
          null,
      },
      ...overrideAttributes,
    };
  },
});
