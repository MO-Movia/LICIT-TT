/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { NodeSpec } from 'prosemirror-model';

// Dedicated EIC image payload. The multimedia plugin still owns the nested
// image node and its attributes/NodeView; this wrapper only supplies a block
// boundary without introducing a paragraph and its inline baseline.
export const enhancedTableFigureImageNodeSpec: NodeSpec = {
  group: 'block',
  content: 'inline?',
  isolating: true,
  selectable: false,
  parseDOM: [{ tag: "div[data-type='enhanced-table-figure-image']" }],
  toDOM() {
    return [
      'div',
      {
        'data-type': 'enhanced-table-figure-image',
        class: 'enhanced-table-figure-image',
      },
      0,
    ];
  },
};

// Dedicated EIC table payload. The core table remains the child so the
// existing table extensions continue to own editing and rendering.
export const enhancedTableFigureTableNodeSpec: NodeSpec = {
  group: 'block',
  content: 'table',
  isolating: true,
  selectable: false,
  parseDOM: [{ tag: "div[data-type='enhanced-table-figure-table']" }],
  toDOM() {
    return [
      'div',
      {
        'data-type': 'enhanced-table-figure-table',
        class: 'enhanced-table-figure-table',
      },
      0,
    ];
  },
};
// Body spec – where the table (or multimedia) is inserted.
export const enhancedTableFigureBodyNodeSpec: NodeSpec = {
  group: 'block',
  selectable: false,
  content: '(enhanced_table_figure_table | enhanced_table_figure_image)',
  parseDOM: [{ tag: "div[data-type='enhanced-table-figure-body']" }],
  toDOM() {
    return [
      'div',
      {
        'data-type': 'enhanced-table-figure-body',
        class: 'enhanced-table-figure-body',
      },
      0,
    ];
  },
};

// Optional Notes spec.
export const enhancedTableFigureNotesNodeSpec: NodeSpec = {
  group: 'block',
  content: 'paragraph+',
  attrs: {
    styleName: { default: 'Normal' },
  },
  parseDOM: [{ tag: "div[data-type='enhanced-table-figure-notes']",
      getAttrs: (dom: HTMLElement) => ({
        styleName: dom.dataset['stylename'] || 'Normal',
      }),
   }],
  toDOM(node) {
    return [
      'div',
      {
        'data-type': 'enhanced-table-figure-notes',
        'data-styleName': node.attrs.styleName,
        class: 'enhanced-table-figure-notes',
      },
      0,
    ];
  },
};

// CAPCO spec – for the bottom CAPCO marking.
export const enhancedTableFigureCapcoNodeSpec: NodeSpec = {
  group: 'block',
  content: 'inline*',
  attrs: {
    form: { default: 'long' },
    capco: { default: null },
    style: { default: '' },
  },
  parseDOM: [
    {
      tag: "div[data-type='enhanced-table-figure-capco']",
      getAttrs(dom) {
        return {
          form: dom.dataset.form || 'long',
          capco: dom.dataset.capco || null,
        };
      },
    },
  ],
  toDOM(node) {
    return [
      'div',
      {
        'data-type': 'enhanced-table-figure-capco',
        'data-form': node.attrs?.form,
        'data-capco': node.attrs?.capco,
        class: 'enhanced-table-figure-capco',
      },
      0,
    ];
  },
};

// The unified Enhanced Table/Figure node spec.
// Note: The header is not part of the composite.
// Also, a new attribute "maximized" is added.
export const enhancedTableFigureNodeSpec: NodeSpec = {
  group: 'block',
  selectable: true,
  allowGapCursor: false,
  content:
    'enhanced_table_figure_body enhanced_table_figure_notes? enhanced_table_figure_capco',
  isolating: true,
  attrs: {
    id: { default: '' },
    figureType: { default: 'table' },
    orientation: { default: 'portrait' },
    maximized: { default: false },
    width: { default: 600 },
    height: { default: 300 },
    dirty: { default: false },

  },
  parseDOM: [
    {
      tag: "div[data-type='enhanced-table-figure']",
      getAttrs(dom) {
        return {
          id: dom.dataset.id || '',
          figureType: dom.dataset.figureType || 'table',
          orientation: dom.dataset.orientation || 'portrait',
          maximized: dom.dataset.maximized === 'true',
          dirty: dom.dataset.dirty === 'true',
        };
      },
    },
  ],
  toDOM(node) {
    return [
      'div',
      {
        'data-type': 'enhanced-table-figure',
        'data-id': node.attrs.id,
        'data-figure-type': node.attrs.figureType,
        'data-orientation': node.attrs.orientation,
        'data-maximized': node.attrs.maximized ? 'true' : 'false',
        class: `enhanced-table-figure ${node.attrs.orientation === 'landscape' ? 'landscape' : ''} ${node.attrs.maximized ? 'maximized' : ''}`,
      },
      0,
    ];
  },
};
