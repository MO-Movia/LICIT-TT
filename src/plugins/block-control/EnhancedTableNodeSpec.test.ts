/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {
  enhancedTableFigureBodyNodeSpec,
  enhancedTableFigureImageNodeSpec,
  enhancedTableFigureTableNodeSpec,
  enhancedTableFigureNotesNodeSpec,
  enhancedTableFigureCapcoNodeSpec,
  enhancedTableFigureNodeSpec,
} from './EnhancedTableNodeSpec';
import {
  DOMParser as ProseMirrorDOMParser,
  Fragment,
  Node as ProseMirrorNode,
  Schema,
} from 'prosemirror-model';

const mockNode: ProseMirrorNode = { attrs: {} } as unknown as ProseMirrorNode;

describe('Enhanced Table Figure Node Specs', () => {
  describe('enhancedTableFigureBodyNodeSpec', () => {
    it('returns correct DOM output', () => {
      const result = enhancedTableFigureBodyNodeSpec.toDOM(mockNode);
      expect(result).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure-body',
          class: 'enhanced-table-figure-body',
        },
        0,
      ]);
    });

    it('has correct parseDOM tag', () => {
      expect(enhancedTableFigureBodyNodeSpec.parseDOM[0].tag).toBe(
        "div[data-type='enhanced-table-figure-body']"
      );
    });

    it('has correct content expression', () => {
      expect(enhancedTableFigureBodyNodeSpec.content).toBe(
        '(enhanced_table_figure_table | enhanced_table_figure_image)'
      );
    });
  });

  describe('dedicated EIC payload specs', () => {
    it('defines an isolated image payload without a paragraph', () => {
      expect(enhancedTableFigureImageNodeSpec).toEqual(
        expect.objectContaining({
          content: 'inline?',
          group: 'block',
          isolating: true,
          selectable: false,
        })
      );
      expect(enhancedTableFigureImageNodeSpec.toDOM(mockNode)).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure-image',
          class: 'enhanced-table-figure-image',
        },
        0,
      ]);
    });

    it('defines an isolated table payload', () => {
      expect(enhancedTableFigureTableNodeSpec).toEqual(
        expect.objectContaining({
          content: 'table',
          group: 'block',
          isolating: true,
          selectable: false,
        })
      );
      expect(enhancedTableFigureTableNodeSpec.toDOM(mockNode)).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure-table',
          class: 'enhanced-table-figure-table',
        },
        0,
      ]);
    });
  });

    it('returns correct DOM output with attrs', () => {
      const mockNode = {attrs: {form: 'short'}} as unknown as ProseMirrorNode;
      const result = enhancedTableFigureCapcoNodeSpec.toDOM(mockNode);
      expect(result).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure-capco',
          'data-form': 'short',
          class: 'enhanced-table-figure-capco',
        },
        0,
      ]);
    });

    it('returns correct DOM output with custom styleName', () => {
      const result = enhancedTableFigureNotesNodeSpec.toDOM(
        { attrs: { styleName: 'CustomStyle' } } as unknown as ProseMirrorNode
      );
      expect(result).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure-notes',
          'data-styleName': 'CustomStyle',
          class: 'enhanced-table-figure-notes',
        },
        0,
      ]);
    });

    it('getAttrs falls back to Normal when no styleName', () => {
      const dom = document.createElement('div');
      const tag = enhancedTableFigureNotesNodeSpec.parseDOM[0];
      expect(tag.getAttrs(dom)).toEqual({ styleName: 'Normal' });
    });

    it('getAttrs reads styleName when provided', () => {
      const dom = document.createElement('div');
      dom.setAttribute('data-styleName', 'Heading1');
      const tag = enhancedTableFigureNotesNodeSpec.parseDOM[0];
      expect(tag.getAttrs(dom)).toEqual({ styleName: 'Heading1' });
    });
  });

  describe('enhancedTableFigureCapcoNodeSpec', () => {
    it('returns correct DOM output with attrs (case 2)', () => {
      const mockNode = { attrs: { form: 'short', capco: 'SECRET' } } as unknown as ProseMirrorNode;
      const result = enhancedTableFigureCapcoNodeSpec.toDOM(mockNode);
      expect(result).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure-capco',
          'data-form': 'short',
          'data-capco': 'SECRET',
          class: 'enhanced-table-figure-capco',
        },
        0,
      ]);
    });

    it('getAttrs returns correct capco', () => {
      const tag = enhancedTableFigureCapcoNodeSpec.parseDOM[0];
      const dom = document.createElement('div');
      dom.setAttribute('data-form', 'long');
      dom.setAttribute('data-capco', 'CONFIDENTIAL');
      expect(tag.getAttrs(dom)).toEqual({
        form: 'long',
        capco: 'CONFIDENTIAL',
      });
    });

    it('getAttrs falls back to defaults', () => {
      const tag = enhancedTableFigureCapcoNodeSpec.parseDOM[0];
      const dom = document.createElement('div');
      expect(tag.getAttrs(dom)).toEqual({ form: 'long', capco: null });
    });
  });

  describe('enhancedTableFigureNodeSpec', () => {
    it('disables gap cursors at internal EIC boundaries', () => {
      expect(enhancedTableFigureNodeSpec.allowGapCursor).toBe(false);
    });
    it('returns correct DOM output with all attrs set', () => {
      const mockNode = {
        attrs: {
          id: 'id123',
          figureType: 'figure',
          orientation: 'landscape',
          maximized: true,
        },
      };
      const result = enhancedTableFigureNodeSpec.toDOM(mockNode as unknown as ProseMirrorNode);
      expect(result).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure',
          'data-id': 'id123',
          'data-figure-type': 'figure',
          'data-orientation': 'landscape',
          'data-maximized': 'true',
          class: 'enhanced-table-figure landscape maximized',
        },
        0,
      ]);
    });

    it('returns correct DOM output with defaults', () => {
      const mockNode = {
        attrs: {
          id: '',
          figureType: 'table',
          orientation: 'portrait',
          maximized: false,
        },
      };
      const result = enhancedTableFigureNodeSpec.toDOM(mockNode as unknown as ProseMirrorNode);
      expect(result).toEqual([
        'div',
        {
          'data-type': 'enhanced-table-figure',
          'data-id': '',
          'data-figure-type': 'table',
          'data-orientation': 'portrait',
          'data-maximized': 'false',
          class: 'enhanced-table-figure  ',
        },
        0,
      ]);
    });

  it('getAttrs parses all attributes correctly', () => {
    const tag = enhancedTableFigureNodeSpec.parseDOM[0];
    const dom = document.createElement('div');
    dom.setAttribute('data-id', 'id123');
    dom.setAttribute('data-figure-type', 'figure');
    dom.setAttribute('data-orientation', 'landscape');
    dom.setAttribute('data-maximized', 'true');

    const attrs = tag.getAttrs(dom);
    expect(attrs).toEqual({
      id: 'id123',
      dirty: false,
      figureType: 'figure',
      orientation: 'landscape',
      maximized: true,
    });
  });

  it('getAttrs falls back to defaults (case 2)', () => {
    const tag = enhancedTableFigureNodeSpec.parseDOM[0];
    const dom = document.createElement('div');

    const attrs = tag.getAttrs(dom);
    expect(attrs).toEqual({
      id: '',
      dirty: false,
      figureType: 'table',
      orientation: 'portrait',
      maximized: false,
    });
  });

  it('includes content expression', () => {
    expect(enhancedTableFigureNodeSpec.content).toBe(
      'enhanced_table_figure_body enhanced_table_figure_notes? enhanced_table_figure_capco'
    );
  });
});

describe('Enhanced Table Figure schema integration', () => {
  const baseSchema = new Schema({
    nodes: {
      doc: {content: 'block+'},
      paragraph: {content: 'inline*', group: 'block'},
      text: {group: 'inline'},
      image: {
        attrs: {src: {default: ''}},
        group: 'inline',
        inline: true,
      },
      table: {
        group: 'block',
        parseDOM: [{tag: 'table'}],
        tableRole: 'table',
        toDOM: () => ['table'],
      },
    },
  });
  const schema = new Schema({
    marks: baseSchema.spec.marks,
    nodes: baseSchema.spec.nodes.append({
      enhanced_table_figure: enhancedTableFigureNodeSpec,
      enhanced_table_figure_body: enhancedTableFigureBodyNodeSpec,
      enhanced_table_figure_image: enhancedTableFigureImageNodeSpec,
      enhanced_table_figure_table: enhancedTableFigureTableNodeSpec,
      enhanced_table_figure_notes: enhancedTableFigureNotesNodeSpec,
      enhanced_table_figure_capco: enhancedTableFigureCapcoNodeSpec,
    }),
  });

  it('accepts only dedicated EIC payload wrappers in the body', () => {
    const image = schema.nodes.image.create({src: 'figure.png'});
    const imagePayload = schema.nodes.enhanced_table_figure_image.create(
      {},
      image
    );
    const table = schema.nodes.table.create();
    const tablePayload = schema.nodes.enhanced_table_figure_table.create(
      {},
      table
    );
    const bodyType = schema.nodes.enhanced_table_figure_body;

    expect(bodyType.validContent(Fragment.from(imagePayload))).toBe(true);
    expect(bodyType.validContent(Fragment.from(tablePayload))).toBe(true);
    expect(bodyType.validContent(Fragment.from(table))).toBe(false);
    expect(
      bodyType.validContent(Fragment.from(schema.nodes.paragraph.create()))
    ).toBe(false);
  });

  it('parses a legacy direct EIC table into its dedicated payload', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div data-type="enhanced-table-figure">
        <div data-type="enhanced-table-figure-body"><table></table></div>
        <div data-type="enhanced-table-figure-capco">CAPCO</div>
      </div>
    `;

    const parsed = ProseMirrorDOMParser.fromSchema(schema).parse(container);
    const payload = parsed.firstChild?.firstChild?.firstChild;

    expect(payload?.type.name).toBe('enhanced_table_figure_table');
    expect(payload?.firstChild?.type.name).toBe('table');
  });
});
