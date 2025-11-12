import {
  enhancedTableFigureBodyNodeSpec,
  enhancedTableFigureNotesNodeSpec,
  enhancedTableFigureCapcoNodeSpec,
  enhancedTableFigureNodeSpec,
} from './EnhancedTableNodeSpec';

const mockNode = { attrs: {} } as any;

describe('Enhanced Table Figure Node Specs', () => {
  describe('enhancedTableFigureBodyNodeSpec', () => {
    it('returns correct DOM output', () => {
      const result = enhancedTableFigureBodyNodeSpec.toDOM!(mockNode);
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
      expect(enhancedTableFigureBodyNodeSpec.parseDOM![0].tag).toBe(
        "div[data-type='enhanced-table-figure-body']"
      );
    });

    it('has correct content expression', () => {
      expect(enhancedTableFigureBodyNodeSpec.content).toBe('block+');
    });
  });

    it('returns correct DOM output with attrs', () => {
      const mockNode = {attrs: {form: 'short'}};
      const result = enhancedTableFigureCapcoNodeSpec.toDOM!(mockNode as any);
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
      const result = enhancedTableFigureNotesNodeSpec.toDOM!({
        attrs: { styleName: 'CustomStyle' },
      } as any);
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
      const tag = enhancedTableFigureNotesNodeSpec.parseDOM![0];
      expect(tag.getAttrs!(dom)).toEqual({ styleName: 'Normal' });
    });

    it('getAttrs reads styleName when provided', () => {
      const dom = document.createElement('div');
      dom.setAttribute('data-styleName', 'Heading1');
      const tag = enhancedTableFigureNotesNodeSpec.parseDOM![0];
      expect(tag.getAttrs!(dom)).toEqual({ styleName: 'Heading1' });
    });
  });

  describe('enhancedTableFigureCapcoNodeSpec', () => {
    it('returns correct DOM output with attrs', () => {
      const mockNode = { attrs: { form: 'short', capco: 'SECRET' } };
      const result = enhancedTableFigureCapcoNodeSpec.toDOM!(mockNode as any);
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
      const tag = enhancedTableFigureCapcoNodeSpec.parseDOM![0];
      const dom = document.createElement('div');
      dom.setAttribute('data-form', 'long');
      dom.setAttribute('data-capco', 'CONFIDENTIAL');
      expect(tag.getAttrs!(dom)).toEqual({
        form: 'long',
        capco: 'CONFIDENTIAL',
      });
    });

    it('getAttrs falls back to defaults', () => {
      const tag = enhancedTableFigureCapcoNodeSpec.parseDOM![0];
      const dom = document.createElement('div');
      expect(tag.getAttrs!(dom)).toEqual({ form: 'long', capco: null });
    });
  });

  describe('enhancedTableFigureNodeSpec', () => {
    it('returns correct DOM output with all attrs set', () => {
      const mockNode = {
        attrs: {
          id: 'id123',
          figureType: 'figure',
          orientation: 'landscape',
          maximized: true,
        },
      };
      const result = enhancedTableFigureNodeSpec.toDOM!(mockNode as any);
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
      const result = enhancedTableFigureNodeSpec.toDOM!(mockNode as any);
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
      const tag = enhancedTableFigureNodeSpec.parseDOM![0];
      const dom = document.createElement('div');
      dom.setAttribute('data-id', 'id123');
      dom.setAttribute('data-figure-type', 'figure');
      dom.setAttribute('data-orientation', 'landscape');
      dom.setAttribute('data-maximized', 'true');

      const attrs = tag.getAttrs!(dom);
      expect(attrs).toEqual({
        id: 'id123',
        figureType: 'figure',
        orientation: 'landscape',
        maximized: true,
      });
    });

    it('getAttrs falls back to defaults', () => {
      const tag = enhancedTableFigureNodeSpec.parseDOM![0];
      const dom = document.createElement('div');

      const attrs = tag.getAttrs!(dom);
      expect(attrs).toEqual({
        id: '',
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