/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {Editor} from '@tiptap/core';
import type {Node as PMNode} from 'prosemirror-model';
import {StarterKit} from '@tiptap/starter-kit';
import {Table} from '@tiptap/extension-table';
import {TableRowEx} from '../tableRowEx';
import {TableCellEx} from '../tableCellEx';
import {TableHeaderEx} from './tableHeaderEx';

describe('TableHeaderEx Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, Table, TableRowEx, TableHeaderEx, TableCellEx],
      content: '<table><tr><th>Header</th></tr></table>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  test('should expose layout and typography attributes on tableHeader', () => {
    const schema = editor.schema;
    const headerNode = schema.nodes.tableHeader;

    expect(headerNode.spec.attrs).toHaveProperty('cellWidth');
    expect(headerNode.spec.attrs).toHaveProperty('cellStyle');
    expect(headerNode.spec.attrs).toHaveProperty('fontSize');
    expect(headerNode.spec.attrs).toHaveProperty('letterSpacing');
    expect(headerNode.spec.attrs).toHaveProperty('marginTop');
    expect(headerNode.spec.attrs).toHaveProperty('marginBottom');
    expect(headerNode.spec.attrs).toHaveProperty('textRotation');
  });

  test('should parse custom style attrs from table header HTML', () => {
    editor.commands.setContent(
      '<table><tr><th style="width: 180px; font-size: 20px; letter-spacing: 2px; margin-top: 7px; margin-bottom: 11px;">Header</th></tr></table>'
    );

    let headerAttrs: Record<string, unknown> | null = null;
    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableHeader') {
        headerAttrs = node.attrs;
      }
    });

    expect(headerAttrs?.cellWidth).toBe('180px');
    expect(headerAttrs?.fontSize).toBe('20px');
    expect(headerAttrs?.letterSpacing).toBe('2px');
    expect(headerAttrs?.marginTop).toBe('7px');
    expect(headerAttrs?.marginBottom).toBe('11px');
  });

  test('should render table header styles and cellStyle', () => {
    let headerPos = 0;
    editor.state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableHeader') {
        headerPos = pos + 1;
      }
    });

    editor.commands.setTextSelection(headerPos);
    editor
      .chain()
      .setCellAttribute('cellStyle', 'line-height: 22px; text-transform: uppercase;')
      .setCellAttribute('fontSize', '19px')
      .run();

    const html = editor.getHTML();
    expect(html).toContain('line-height: 22px');
    expect(html).toContain('text-transform: uppercase');
    expect(html).toContain('font-size: 19px');
  });

  test('should render and parse clockwise text rotation on table headers', () => {
    let headerPos = 0;
    editor.state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableHeader') {
        headerPos = pos + 1;
      }
    });

    editor.commands.setTextSelection(headerPos);
    editor.commands.setCellAttribute('textRotation', 'clockwise');

    const html = editor.getHTML();
    expect(html).toContain('data-cell-text-rotation="clockwise"');
    expect(html).toContain('writing-mode: vertical-rl');
    expect(html).toContain('text-align: center');
    expect(html).toContain('vertical-align: middle');

    editor.commands.setContent(
      '<table><tr><th data-cell-text-rotation="clockwise">Header</th></tr></table>'
    );

    let textRotation: string | null = null;
    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableHeader') {
        textRotation = node.attrs.textRotation;
      }
    });
    expect(textRotation).toBe('clockwise');
  });

  test('should keep every side border color separate from vertical-align', () => {
    let headerPos = 0;
    editor.state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableHeader') {
        headerPos = pos + 1;
      }
    });

    editor.commands.setTextSelection(headerPos);
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
});
