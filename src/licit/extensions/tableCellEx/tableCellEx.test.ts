/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCellEx } from './tableCellEx';
import type { Node as PMNode } from 'prosemirror-model';

type AttributeConfig = {
  renderHTML?: (attributes: Record<string, unknown>) => Record<string, unknown>;
};

function getTableCellExtensionAttributes(): Record<string, AttributeConfig> {
  const extension = TableCellEx as unknown as {
    config: {
      addAttributes: (this: {
        parent?: () => Record<string, AttributeConfig>;
      }) => Record<string, AttributeConfig>;
    };
  };

  const context = {
    parent: () => ({}),
    addAttributes: extension.config.addAttributes,
  };
  return context.addAttributes();
}

describe('TableCellEx Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, Table, TableRow, TableHeader, TableCellEx],
      content: '<table><tr><td>Cell</td></tr></table>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });


  test('should have backgroundColor attribute', () => {
    const schema = editor.schema;
    const tableCellNode = schema.nodes.tableCell;

    expect(tableCellNode.spec.attrs).toHaveProperty('backgroundColor');
    expect(tableCellNode.spec.attrs?.backgroundColor.default).toBeNull();
  });

  test('should have borderColor & border side attributes', () => {
    const schema = editor.schema;
    const node = schema.nodes.tableCell;

    expect(node.spec.attrs).toHaveProperty('borderColor');
    expect(node.spec.attrs).toHaveProperty('borderLeft');
    expect(node.spec.attrs).toHaveProperty('borderRight');
    expect(node.spec.attrs).toHaveProperty('borderTop');
    expect(node.spec.attrs).toHaveProperty('borderBottom');
  });

  test('should have the additional table cell attributes', () => {
    const schema = editor.schema;
    const node = schema.nodes.tableCell;

    expect(node.spec.attrs).toHaveProperty('cellWidth');
    expect(node.spec.attrs).toHaveProperty('cellStyle');
    expect(node.spec.attrs).toHaveProperty('fontSize');
    expect(node.spec.attrs).toHaveProperty('letterSpacing');
    expect(node.spec.attrs).toHaveProperty('marginTop');
    expect(node.spec.attrs).toHaveProperty('marginBottom');
    expect(node.spec.attrs?.cellWidth.default).toBe(null);
    expect(node.spec.attrs?.cellStyle.default).toBe(null);
    expect(node.spec.attrs?.fontSize.default).toBe(null);
    expect(node.spec.attrs?.letterSpacing.default).toBe(null);
    expect(node.spec.attrs?.marginTop.default).toBe(null);
    expect(node.spec.attrs?.marginBottom.default).toBe(null);
  });

  test('should render width font size and margins on cell attributes', () => {
    editor
      .chain()
      .setCellAttribute('cellWidth', '120')
      .setCellAttribute('fontSize', '14')
      .setCellAttribute('paddingTop', '12')
      .setCellAttribute('paddingBottom', '10')
      .setCellAttribute('marginTop', '6')
      .setCellAttribute('marginBottom', '8')
      .run();

    const html = editor.getHTML();

    expect(html).toContain('width: 120px');
    expect(html).toContain('font-size: 14px');
    expect(html).toContain('padding-top: 12px');
    expect(html).toContain('padding-bottom: 10px');
    expect(html).toContain('margin-top: 6px');
    expect(html).toContain('margin-bottom: 8px');
    expect(html).not.toContain('padding-top: 6px');
    expect(html).not.toContain('padding-bottom: 8px');
  });

  test('should parse cellWidth, font and margin attributes from HTML', () => {
    editor.commands.setContent(
      '<table><tr><td style="width: 140px; font-size: 18px; letter-spacing: 1.5px; margin-top: 6px; margin-bottom: 9px;">Cell</td></tr></table>'
    );

    let cellAttrs: Record<string, unknown> | null = null;
    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableCell') {
        cellAttrs = node.attrs;
      }
    });

    expect(cellAttrs?.cellWidth).toBe('140px');
    expect(cellAttrs?.fontSize).toBe('18px');
    expect(cellAttrs?.letterSpacing).toBe('1.5px');
    expect(cellAttrs?.marginTop).toBe('6px');
    expect(cellAttrs?.marginBottom).toBe('9px');
  });

  test('should render cellStyle inline CSS when provided', () => {
    editor
      .chain()
      .setCellAttribute('fontSize', '45')
      .setCellAttribute('cellStyle', 'vertical-align: top;')
      .run();

    const html = editor.getHTML();
    expect(html).toContain('--czi-cell-font-size: 45px');
    expect(html).toContain('vertical-align: top');
    expect(html).not.toContain('45pxvertical-align');
  });

  test('should keep an imported cell style class as metadata only', () => {
    const attrs = getTableCellExtensionAttributes();

    expect(attrs.cellStyle.renderHTML?.({cellStyle: 'para'})).toStrictEqual({
      'data-cell-style': 'para',
    });
    expect(
      attrs.cellStyle.renderHTML?.({cellStyle: 'vertical-align: top;'})
    ).toStrictEqual({
      'data-cell-style': 'vertical-align: top;',
      style: 'vertical-align: top;',
    });
  });

  test('should render backgroundColor as string when vignette is true', () => {
    editor.commands.setContent('<table><tr><td>Cell</td></tr></table>');

    editor
      .chain()
      .setCellAttribute('backgroundColor', 'red')
      .setCellAttribute('vignette', true)
      .run();

    const html = editor.getHTML();

    expect(html).toContain('background-color: red');
  });


  test('should render nested color value when vignette is false', () => {
    // Add backgroundColor as object
    editor.state.doc.descendants((node: PMNode, _pos) => {
      if (node.type.name === 'tableCell') {
        editor
          .chain()
          .setCellAttribute('backgroundColor', { color: 'blue' })
          .setCellAttribute('vignette', false)
          .run();
      }
    });

    const html = editor.getHTML();
    expect(html).toContain('background-color: blue');
  });

  test('should not render backgroundColor when not provided', () => {
    const html = editor.getHTML();
    expect(html).not.toContain('background-color');
  });

  test('should parse backgroundColor from HTML element', () => {
    const htmlWithBgColor =
      '<table><tr><td style="background-color: blue">Cell</td></tr></table>';
    editor.commands.setContent(htmlWithBgColor);

    let found = false;
    editor.state.doc.descendants((node: PMNode) => {
      if (
        node.type.name === 'tableCell' &&
        node.attrs.backgroundColor === 'blue'
      ) {
        found = true;
      }
    });

    expect(found).toBe(true);
  });

  test('should handle backgroundColor with quotes', () => {
    editor.commands.setContent(
      '<table><tr><td style="background-color: \'red\'">Cell</td></tr></table>'
    );

    let backgroundColor = '';
    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableCell') {
        backgroundColor = node.attrs.backgroundColor;
      }
    });

    expect(backgroundColor).toBe('');
  });

  test('should render borderLeft style', () => {
    editor.commands.setContent(
      '<table><tr><td style="border-left: 2px solid red">Cell</td></tr></table>'
    );
    const html = editor.getHTML();
    expect(html).toContain('border-left: 2px solid red');
  });

  test('should render borderRight style', () => {
    editor.commands.setContent(
      '<table><tr><td style="border-right: 3px dashed blue">Cell</td></tr></table>'
    );
    const html = editor.getHTML();
    expect(html).toContain('border-right: 3px dashed blue');
  });

  test('should render borderTop style', () => {
    editor.commands.setContent(
      '<table><tr><td style="border-top: 1px dotted green">Cell</td></tr></table>'
    );
    const html = editor.getHTML();
    expect(html).toContain('border-top: 1px dotted green');
  });

  test('should render borderBottom style', () => {
    editor.commands.setContent(
      '<table><tr><td style="border-bottom: 4px double #000">Cell</td></tr></table>'
    );
    const html = editor.getHTML();
    expect(html).toContain('border-bottom: 4px double rgb(0, 0, 0)');
  });

  test('should parse border side values correctly', () => {
    editor.commands.setContent(
      '<table><tr><td style="border-left: 2px solid red; border-right: 3px dashed blue">Cell</td></tr></table>'
    );

    let left: string | undefined;
    let right: string | undefined;

    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableCell') {
        left = node.attrs.borderLeft;
        right = node.attrs.borderRight;
      }
    });

    expect(left).toBe('2px solid red');
    expect(right).toBe('3px dashed blue');
  });

  test('should render borderColor style correctly', () => {
    editor.commands.setContent(
      '<table><tr><td style="border-color: green">Cell</td></tr></table>'
    );
    const html = editor.getHTML();
    expect(html).toContain('border-color: green');
  });

  test('should keep every side border color separate from later styles', () => {
    editor
      .chain()
      .setCellAttribute('borderLeftColor', 'red')
      .setCellAttribute('borderRightColor', 'blue')
      .setCellAttribute('borderTopColor', 'green')
      .setCellAttribute('borderBottomColor', 'purple')
      .setCellAttribute('verticalAlign', 'top')
      .run();

    const html = editor.getHTML();
    expect(html).toContain('border-left-color: red');
    expect(html).toContain('border-right-color: blue');
    expect(html).toContain('border-top-color: green');
    expect(html).toContain('border-bottom-color: purple');
    expect(html).toContain('vertical-align: top');
    expect(html).not.toMatch(/(?:red|blue|green|purple)vertical-align/);
  });

  test('should parse and render vertical-align for tableCell', () => {
    editor.commands.setContent(
      '<table><tr><td style="vertical-align: bottom">Cell</td></tr></table>'
    );

    let parsedVerticalAlign: string | null = null;
    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableCell') {
        parsedVerticalAlign = node.attrs.verticalAlign;
      }
    });

    expect(parsedVerticalAlign).toBe('bottom');

    const html = editor.getHTML();
    expect(html).toContain('vertical-align: bottom');
    expect(html).toContain('valign="bottom"');
  });

  test('should skip optional inline styles when table cell attributes are empty', () => {
    const attrs = getTableCellExtensionAttributes();

    expect(attrs.fontName.renderHTML?.({ fontName: null })).toStrictEqual({});
    expect(attrs.paddingLeft.renderHTML?.({ paddingLeft: null })).toStrictEqual({});
    expect(attrs.backgroundColor.renderHTML?.({ backgroundColor: null })).toStrictEqual({});
    expect(attrs.borderLeft.renderHTML?.({ borderLeft: null })).toStrictEqual({});
    expect(attrs.borderRight.renderHTML?.({ borderRight: null })).toStrictEqual({});
    expect(attrs.borderTop.renderHTML?.({ borderTop: null })).toStrictEqual({});
    expect(attrs.borderBottom.renderHTML?.({ borderBottom: null })).toStrictEqual({});
    expect(attrs.borderColor.renderHTML?.({ borderColor: null })).toStrictEqual({});
    expect(attrs.cellStyle.renderHTML?.({ cellStyle: null })).toStrictEqual({});
    expect(attrs.cellWidth.renderHTML?.({ cellWidth: null })).toStrictEqual({});
    expect(attrs.fontSize.renderHTML?.({ fontSize: null })).toStrictEqual({});
    expect(attrs.letterSpacing.renderHTML?.({ letterSpacing: null })).toStrictEqual({});
    expect(attrs.marginTop.renderHTML?.({ marginTop: null })).toStrictEqual({});
    expect(attrs.marginBottom.renderHTML?.({ marginBottom: null })).toStrictEqual({});
    expect(attrs.verticalAlign.renderHTML?.({ verticalAlign: null })).toStrictEqual({});
  });

  test('should render optional inline styles from table cell attributes', () => {
    const attrs = getTableCellExtensionAttributes();

    expect(attrs.fontName.renderHTML?.({ fontName: 'Arial' })).toStrictEqual({
      fontName: 'Arial',
      style: 'font-family: Arial;',
    });
    expect(attrs.paddingLeft.renderHTML?.({ paddingLeft: '4px' })).toStrictEqual({
      style: 'padding-left: 4px;',
    });
    expect(attrs.borderLeft.renderHTML?.({ borderLeft: '1px solid red' })).toStrictEqual({
      style: 'border-left: 1px solid red;',
    });
    expect(attrs.borderRight.renderHTML?.({ borderRight: '2px solid blue' })).toStrictEqual({
      style: 'border-right: 2px solid blue;',
    });
    expect(attrs.borderTop.renderHTML?.({ borderTop: '3px solid green' })).toStrictEqual({
      style: 'border-top: 3px solid green;',
    });
    expect(attrs.borderBottom.renderHTML?.({ borderBottom: '4px solid black' })).toStrictEqual({
      style: 'border-bottom: 4px solid black;',
    });
    expect(attrs.borderColor.renderHTML?.({ borderColor: 'purple' })).toStrictEqual({
      style: 'border-color: purple;',
    });
    expect(attrs.borderLeftColor.renderHTML?.({ borderLeftColor: 'red' })).toStrictEqual({
      style: 'border-left-color: red;',
    });
    expect(attrs.borderRightColor.renderHTML?.({ borderRightColor: 'blue' })).toStrictEqual({
      style: 'border-right-color: blue;',
    });
    expect(attrs.borderTopColor.renderHTML?.({ borderTopColor: 'green' })).toStrictEqual({
      style: 'border-top-color: green;',
    });
    expect(attrs.borderBottomColor.renderHTML?.({ borderBottomColor: 'purple' })).toStrictEqual({
      style: 'border-bottom-color: purple;',
    });
    expect(attrs.verticalAlign.renderHTML?.({ verticalAlign: 'middle' })).toStrictEqual({
      verticalAlign: 'middle',
      valign: 'middle',
      style: 'vertical-align: middle;',
    });
  });
});
