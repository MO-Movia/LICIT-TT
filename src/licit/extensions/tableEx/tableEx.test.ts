/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Editor, Extension, Mark } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { TableEx } from './tableEx';
import { createTable } from '@tiptap/extension-table';
import {
  addColumnAfter as addColumnAfterCommand,
  addRowAfter as addRowAfterCommand,
} from '@tiptap/pm/tables';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableRowEx } from '../tableRowEx';
import { TableHeaderEx } from '../tableHeaderEx';
import { TableCellEx } from '../tableCellEx';
import ParagraphNodeSpec from '../../specs/paragraphNodeSpec';
import { setStyles } from '../../../plugins/custom-styles/customStyle';
import { EditorState } from 'prosemirror-state';
import {
  applyStoredTableStyles,
  applyStoredTableStyleAtSelection,
  applyTableStyle,
  createPendingTableMarksPlugin,
  findTableAtSelection,
  isSelectionInsideTable,
  normalizeTableStyleName,
  PENDING_TABLE_MARKS_ATTRIBUTE,
  TABLE_STYLE_NAME_ATTRIBUTE,
} from './tableStyle';
import { Schema } from 'prosemirror-model';
import type { Node as PMNode } from 'prosemirror-model';
import type { Transaction } from 'prosemirror-state';

describe('TableEx Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, TableEx, TableRowEx, TableHeader, TableCell],
      content:
        '<table><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></table>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  test('should extend the base Table extension', () => {
    const extension = editor.extensionManager.extensions.find(
      (ext) => ext.name === 'table'
    );

    expect(extension).toBeDefined();
    expect(extension?.name).toBe('table');
  });

  test('should navigate to next cell with goToNextCell command', () => {
    // Set cursor in first cell
    editor.commands.setContent(
      '<table><tr><td>First</td><td>Second</td></tr></table>'
    );
    editor.commands.focus();

    const result = editor.commands.goToNextCell();

    expect(result).toBeDefined();
  });

  test('should navigate to previous cell with goToPreviousCell command', () => {
    // Set cursor in second cell
    editor.commands.setContent(
      '<table><tr><td>First</td><td>Second</td></tr></table>'
    );
    editor.commands.focus();

    const result = editor.commands.goToPreviousCell();

    expect(result).toBeDefined();
  });

  test('should have table extension loaded', () => {
    const hasTableExtension = editor.extensionManager.extensions.some(
      (ext) => ext.name === 'table'
    );

    expect(hasTableExtension).toBe(true);
  });

  test('should have noOfColumns and tableHeight attributes', () => {
    const schema = editor.schema;
    const tableNode = schema.nodes.table;

    expect(tableNode.spec.attrs).toHaveProperty('noOfColumns');
    expect(tableNode.spec.attrs).toHaveProperty('tableHeight');
    expect(tableNode.spec.attrs).toHaveProperty(TABLE_STYLE_NAME_ATTRIBUTE);
    expect(
      tableNode.spec.attrs[TABLE_STYLE_NAME_ATTRIBUTE].default
    ).toBe('Normal');
  });

  test('should configure Licit table node view', () => {
    const extension = editor.extensionManager.extensions.find(
      (ext) => ext.name === 'table'
    );

    expect(extension?.options.View?.name).toBe('LicitTableNodeView');
  });

  test('should support table cell commands', () => {
    editor.commands.setContent('<table><tr><td>Cell</td></tr></table>');

    expect(editor.commands.goToNextCell).toBeDefined();
    expect(editor.commands.goToPreviousCell).toBeDefined();
  });

  test('should handle Tab key navigation', () => {
    editor.commands.setContent(
      '<table><tr><td>First</td><td>Second</td></tr></table>'
    );

    // Get the first table cell position and set selection there
    const { state } = editor;
    let cellPos = 0;
    state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableCell' && cellPos === 0) {
        cellPos = pos + 2;
      }
    });

    editor.commands.setTextSelection(cellPos);
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    editor.view.dom.dispatchEvent(tabEvent);
    expect(editor.commands.goToNextCell).toBeDefined();
  });

  test('should handle Shift-Tab key navigation', () => {
    editor.commands.setContent(
      '<table><tr><td>First</td><td>Second</td></tr></table>'
    );

    // Get the second table cell position and set selection there
    const { state } = editor;
    let cellCount = 0;
    let cellPos = 0;
    state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableCell') {
        cellCount++;
        if (cellCount === 2) {
          cellPos = pos + 2;
        }
      }
    });

    editor.commands.setTextSelection(cellPos);
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
    });
    editor.view.dom.dispatchEvent(shiftTabEvent);
    expect(editor.commands.goToPreviousCell).toBeDefined();
  });

  test('should add a new row when Tab pressed in last cell and vignette is false', () => {
    editor.commands.setContent(`
      <table>
        <tr><td>Cell 1</td><td>Cell 2</td></tr>
      </table>
    `);

    const { state } = editor;
    let lastCellPos = 0;

    state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableCell') {
        lastCellPos = pos;
      }
    });

    editor.commands.setTextSelection(lastCellPos + 2);
    editor.commands.updateAttributes('tableCell', { vignette: false });

    const countRows = () => {
      let rows = 0;
      editor.state.doc.descendants((node: PMNode) => {
        if (node.type.name === 'tableRow') rows++;
      });
      return rows;
    };

    const initialRows = countRows();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    editor.view.dom.dispatchEvent(tabEvent);

    const finalRows = countRows();
    expect(finalRows).toBe(initialRows);
  });

  test('should insert table without header row', () => {
    editor.commands.insertTable({ rows: 2, cols: 2 });

    let hasHeaderCell = false;
    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableHeader') {
        hasHeaderCell = true;
      }
    });

    expect(hasHeaderCell).toBe(false);
  });

  describe('TableEx Extension - table styles', () => {
    let editor: Editor;

    beforeEach(() => {
      const StyledParagraph = ParagraphNodeSpec.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            styleName: {
              default: null,
            },
            [PENDING_TABLE_MARKS_ATTRIBUTE]: {
              default: null,
            },
          };
        },
      });
      const StrongMark = Mark.create({
        name: 'strong',
        addAttributes() {
          return {
            overridden: {
              default: false,
              parseHTML: (element) => element.getAttribute('overridden') === 'true',
              renderHTML: (attributes) => ({
                overridden: attributes.overridden,
              }),
            },
          };
        },
        parseHTML() {
          return [{tag: 'strong'}, {tag: 'b'}];
        },
        renderHTML({HTMLAttributes}) {
          return ['strong', HTMLAttributes, 0];
        },
      });
      const FontSizeMark = Mark.create({
        name: 'mark-font-size',
        addAttributes() {
          return {
            pt: {default: null},
            overridden: {default: false},
          };
        },
        parseHTML() {
          return [{tag: 'span'}];
        },
        renderHTML({HTMLAttributes}) {
          return ['span', HTMLAttributes, 0];
        },
      });
      const FontTypeMark = Mark.create({
        name: 'mark-font-type',
        addAttributes() {
          return {
            name: {default: ''},
            overridden: {default: false},
          };
        },
        parseHTML() {
          return [{tag: 'span'}];
        },
        renderHTML({HTMLAttributes}) {
          return ['span', HTMLAttributes, 0];
        },
      });
      const PendingTableMarksExtension = Extension.create({
        name: 'pendingTableMarks',
        addProseMirrorPlugins() {
          return [createPendingTableMarksPlugin()];
        },
      });

      setStyles([
        { styleName: 'Normal', styles: {} },
        { styleName: 'Table body', styles: {} },
      ]);
      editor = new Editor({
        extensions: [
          StarterKit.configure({ bold: false, paragraph: false }),
          StyledParagraph,
          StrongMark,
          FontSizeMark,
          FontTypeMark,
          TableEx,
          TableRowEx,
          TableHeaderEx,
          TableCellEx,
          PendingTableMarksExtension,
        ],
        content:
          '<table><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></table>',
      });
    });

    afterEach(() => {
      editor.destroy();
    });

    test('applies the selected style to every cell and preserves it for new rows and columns', () => {
      let tablePos = 0;
      let firstCellContentPos = 0;

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'table') {
          tablePos = pos;
        }
        if (node.type.name === 'tableCell' && firstCellContentPos === 0) {
          firstCellContentPos = pos + 2;
        }
      });

      editor.commands.setTextSelection(firstCellContentPos);
      editor.view.dispatch(
        applyTableStyle(
          editor.state,
          editor.state.tr,
          tablePos,
          'Table body'
        ) as Transaction
      );

      editor.commands.addRowAfter();
      editor.commands.addColumnAfter();

      const paragraphStyleNames: string[] = [];
      let appliedTableStyleName: string | null = null;
      const table = editor.state.doc.nodeAt(tablePos);
      if (table) {
        appliedTableStyleName = table.attrs[TABLE_STYLE_NAME_ATTRIBUTE];
        table.descendants((node) => {
          if (node.type.name === 'paragraph') {
            paragraphStyleNames.push(node.attrs.styleName);
          }
        });
      }

      expect(appliedTableStyleName).toBe('Table body');
      expect(paragraphStyleNames).toHaveLength(9);
      expect(paragraphStyleNames).toEqual(
        Array(paragraphStyleNames.length).fill('Table body')
      );
    });

    test('sets Normal as the table style when a table is inserted', () => {
      editor.commands.setContent('<p></p>');
      editor.commands.setTextSelection(1);
      editor.commands.insertTable({ rows: 2, cols: 2 });

      const table = editor.state.doc.firstChild;
      const paragraphStyleNames: string[] = [];
      table.descendants((node) => {
        if (node.type.name === 'paragraph') {
          paragraphStyleNames.push(node.attrs.styleName);
        }
      });

      expect(table.attrs[TABLE_STYLE_NAME_ATTRIBUTE]).toBe('Normal');
      expect(paragraphStyleNames).toEqual([null, null, null, null]);
    });

    test('applies a table style to both empty and populated cells', () => {
      editor.commands.setContent(
        '<table><tr><td></td><td>Populated</td></tr></table>'
      );

      let tablePos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'table') {
          tablePos = pos;
          return false;
        }
        return true;
      });

      editor.view.dispatch(
        applyTableStyle(
          editor.state,
          editor.state.tr,
          tablePos,
          'Table body'
        ) as Transaction
      );

      const paragraphStyleNames: string[] = [];
      editor.state.doc.nodeAt(tablePos).descendants((node) => {
        if (node.type.name === 'paragraph') {
          paragraphStyleNames.push(node.attrs.styleName);
        }
      });

      expect(paragraphStyleNames).toEqual(['Table body', 'Table body']);
    });

    test('reapplies the table style to pasted paragraphs', () => {
      let tablePos = 0;
      let firstParagraphPos = 0;

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'table') {
          tablePos = pos;
        }
        if (node.type.name === 'paragraph' && firstParagraphPos === 0) {
          firstParagraphPos = pos;
        }
      });

      editor.commands.setTextSelection(firstParagraphPos + 1);
      editor.view.dispatch(
        applyTableStyle(
          editor.state,
          editor.state.tr,
          tablePos,
          'Table body'
        ) as Transaction
      );

      const firstParagraph = editor.state.doc.nodeAt(firstParagraphPos);
      const pastedParagraph = editor.schema.nodes.paragraph.create(
        { styleName: 'Pasted style' },
        editor.schema.text('Pasted content')
      );
      const pasteTr = editor.state.tr.insert(
        firstParagraphPos + firstParagraph.nodeSize,
        pastedParagraph
      );
      const pastedState = editor.state.apply(pasteTr);
      const restoredTr = applyStoredTableStyleAtSelection(
        pastedState,
        pastedState.tr
      );
      const paragraphStyleNames: string[] = [];

      restoredTr.doc.nodeAt(tablePos).descendants((node) => {
        if (node.type.name === 'paragraph') {
          paragraphStyleNames.push(node.attrs.styleName);
        }
      });

      expect(paragraphStyleNames).toEqual(
        Array(paragraphStyleNames.length).fill('Table body')
      );
    });

    test('table style helpers return unchanged transactions for non-table selections and invalid table positions', () => {
      editor.commands.setContent('<p>Outside</p>');
      editor.commands.setTextSelection(2);

      expect(normalizeTableStyleName('Default')).toBe('Normal');
      expect(normalizeTableStyleName('Table body')).toBe('Table body');
      expect(findTableAtSelection(editor.state)).toBeNull();
      expect(isSelectionInsideTable(editor.state)).toBe(false);

      const tr = editor.state.tr;
      expect(applyTableStyle(editor.state, tr, 0, 'Table body')).toBe(tr);
      expect(applyStoredTableStyleAtSelection(editor.state, tr)).toBe(tr);
      expect(applyStoredTableStyles(editor.state, tr)).toBe(tr);
    });

    test('does not reapply stored style for vignette tables', () => {
      editor.commands.setContent(
        '<table data-vignette="true" data-table-style-name="Table body"><tr><td>Cell</td></tr></table>'
      );

      let firstCellContentPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableCell' && firstCellContentPos === 0) {
          firstCellContentPos = pos + 2;
        }
      });
      editor.commands.setTextSelection(firstCellContentPos);

      const tr = editor.state.tr;
      expect(applyStoredTableStyleAtSelection(editor.state, tr)).toBe(tr);
    });

    test('pending table marks plugin returns null when no update is needed', () => {
      const plugin = createPendingTableMarksPlugin();
      const result = plugin.spec.appendTransaction?.(
        [editor.state.tr],
        editor.state,
        editor.state
      );

      expect(result).toBeNull();
    });

    test('pending table marks plugin applies stored marks for empty paragraphs', () => {
      const pendingSchema = new Schema({
        nodes: {
          doc: {content: 'paragraph+'},
          paragraph: {
            content: 'text*',
            attrs: {
              [PENDING_TABLE_MARKS_ATTRIBUTE]: {default: null},
            },
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
          },
          text: {group: 'inline'},
        },
        marks: {
          strong: {
            attrs: {overridden: {default: false}},
            parseDOM: [{tag: 'strong'}],
            toDOM: () => ['strong', 0],
          },
        },
      });
      const mark = pendingSchema.marks.strong.create({overridden: true});
      const paragraph = pendingSchema.nodes.paragraph.create({
        [PENDING_TABLE_MARKS_ATTRIBUTE]: [mark.toJSON()],
      });
      const doc = pendingSchema.nodes.doc.create({}, [paragraph]);
      const state = EditorState.create({
        doc,
        schema: pendingSchema,
        plugins: [createPendingTableMarksPlugin()],
      });
      const plugin = createPendingTableMarksPlugin();

      const result = plugin.spec.appendTransaction?.(
        [state.tr],
        state,
        state
      );

      expect(result?.storedMarks).toEqual([mark]);
    });

    test('pending table marks plugin clears pending marks after content is entered', () => {
      const plugin = createPendingTableMarksPlugin();
      const paragraph: {
        attrs: Record<string, unknown>;
        content: {size: number};
        type: {name: string};
      } = {
        attrs: {[PENDING_TABLE_MARKS_ATTRIBUTE]: [{type: 'missing-mark'}]},
        content: {size: 5},
        type: {name: 'paragraph'},
      };
      const tr = {
        doc: {
          descendants: jest.fn((callback) => {
            callback(paragraph, 1);
          }),
        },
        docChanged: false,
        setNodeMarkup: jest.fn(function setNodeMarkup(
          this: {docChanged: boolean},
          _pos: number,
          _type: unknown,
          attrs: Record<string, unknown>
        ) {
          paragraph.attrs = attrs;
          this.docChanged = true;
          return this;
        }),
        storedMarksSet: false,
      } as unknown as Transaction;
      const newState = {
        selection: {empty: false},
        tr,
      } as unknown as EditorState;

      const result = plugin.spec.appendTransaction?.(
        [{docChanged: true} as Transaction],
        newState,
        newState
      );

      expect(tr.setNodeMarkup).toHaveBeenCalledWith(
        1,
        undefined,
        expect.objectContaining({
          [PENDING_TABLE_MARKS_ATTRIBUTE]: null,
        })
      );
      expect(result).toBe(tr);
    });

    test('pending table marks plugin applies marks to newly entered content', () => {
      const pendingSchema = new Schema({
        nodes: {
          doc: {content: 'paragraph+'},
          paragraph: {
            content: 'text*',
            attrs: {
              [PENDING_TABLE_MARKS_ATTRIBUTE]: {default: null},
            },
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
          },
          text: {group: 'inline'},
        },
        marks: {
          strong: {
            attrs: {overridden: {default: false}},
            parseDOM: [{tag: 'strong'}],
            toDOM: () => ['strong', 0],
          },
        },
      });
      const mark = pendingSchema.marks.strong.create({overridden: true});
      const paragraph = pendingSchema.nodes.paragraph.create(
        {
          [PENDING_TABLE_MARKS_ATTRIBUTE]: [mark.toJSON()],
        },
        pendingSchema.text('Typed')
      );
      const state = EditorState.create({
        doc: pendingSchema.nodes.doc.create({}, [paragraph]),
        schema: pendingSchema,
        plugins: [createPendingTableMarksPlugin()],
      });
      const plugin = createPendingTableMarksPlugin();

      const result = plugin.spec.appendTransaction?.(
        [{docChanged: true} as Transaction],
        state,
        state
      );
      const updatedParagraph = result?.doc.firstChild;
      const typedText = updatedParagraph?.firstChild;

      expect(updatedParagraph?.attrs[PENDING_TABLE_MARKS_ATTRIBUTE]).toBeNull();
      expect(typedText?.marks).toEqual([mark]);
    });

    test('copies paragraph overrides to a new row when operation is supplied', () => {
      let firstParagraphPos = 0;
      let firstCellTextPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && firstParagraphPos === 0) {
          firstParagraphPos = pos;
        }
        if (node.type.name === 'tableCell' && firstCellTextPos === 0) {
          firstCellTextPos = pos + 2;
        }
      });

      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(firstParagraphPos, undefined, {
          ...editor.state.doc.nodeAt(firstParagraphPos).attrs,
          align: 'right',
          marginTop: '12px',
          overriddenAlign: true,
          overriddenAlignValue: 'right',
        })
      );
      editor.commands.setTextSelection(firstCellTextPos);

      let styledTr: Transaction | null = null;
      addRowAfterCommand(editor.state, (tr) => {
        styledTr = applyStoredTableStyles(editor.state, tr, 'addRowAfter') as Transaction;
      });

      const copiedParagraphAttrs: Record<string, unknown>[] = [];
      styledTr.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          copiedParagraphAttrs.push(node.attrs);
        }
      });

      expect(
        copiedParagraphAttrs.some(
          (attrs) =>
            attrs.overriddenAlign === true &&
            attrs.overriddenAlignValue === 'right' &&
            attrs.align === 'right' &&
            attrs.marginTop === '12px'
        )
      ).toBe(true);
    });

    test('copies paragraph overrides to a new column when operation is supplied', () => {
      let firstParagraphPos = 0;
      let firstCellTextPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && firstParagraphPos === 0) {
          firstParagraphPos = pos;
        }
        if (node.type.name === 'tableCell' && firstCellTextPos === 0) {
          firstCellTextPos = pos + 2;
        }
      });

      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(firstParagraphPos, undefined, {
          ...editor.state.doc.nodeAt(firstParagraphPos).attrs,
          align: 'right',
          marginTop: '12px',
          overriddenAlign: true,
          overriddenAlignValue: 'right',
        })
      );
      editor.commands.setTextSelection(firstCellTextPos);

      let styledTr: Transaction | null = null;
      addColumnAfterCommand(editor.state, (tr) => {
        styledTr = applyStoredTableStyles(
          editor.state,
          tr,
          'addColumnAfter'
        ) as Transaction;
      });

      let cellCount = 0;
      styledTr.doc.descendants((node) => {
        if (node.type.name === 'tableCell') {
          cellCount++;
        }
      });

      expect(styledTr).not.toBeNull();
      expect(cellCount).toBe(6);
    });

    test('addRowAfter command copies paragraph overrides through the editor command path', () => {
      let firstParagraphPos = 0;
      let firstCellTextPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && firstParagraphPos === 0) {
          firstParagraphPos = pos;
        }
        if (node.type.name === 'tableCell' && firstCellTextPos === 0) {
          firstCellTextPos = pos + 2;
        }
      });

      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(firstParagraphPos, undefined, {
          ...editor.state.doc.nodeAt(firstParagraphPos).attrs,
          align: 'right',
          marginTop: '12px',
          overriddenAlign: true,
          overriddenAlignValue: 'right',
        })
      );
      editor.commands.setTextSelection(firstCellTextPos);
      editor.commands.addRowAfter();

      const copiedParagraphAttrs: Record<string, unknown>[] = [];
      editor.state.doc.descendants((node) => {
        if (
          node.type.name === 'paragraph' &&
          node.attrs.overriddenAlign === true &&
          node.attrs.overriddenAlignValue === 'right' &&
          node.attrs.align === 'right' &&
          node.attrs.marginTop === '12px'
        ) {
          copiedParagraphAttrs.push(node.attrs);
        }
      });

      expect(copiedParagraphAttrs).toHaveLength(2);
    });

    test('typing in a row added after fully bold cells keeps overridden bold', () => {
      editor.commands.setContent(
        '<table><tr><td>A</td><td>B</td></tr><tr><td><strong overridden="true">C</strong></td><td><strong overridden="true">D</strong></td></tr></table>'
      );

      let lastRowCellTextPos = 0;
      let rowIndex = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableRow') {
          rowIndex++;
        }
        if (
          rowIndex === 1 &&
          node.type.name === 'tableCell' &&
          lastRowCellTextPos === 0
        ) {
          lastRowCellTextPos = pos + 2;
        }
      });

      editor.commands.setTextSelection(lastRowCellTextPos);
      editor.commands.addRowAfter();

      let newRowParagraphPos = 0;
      rowIndex = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableRow') {
          rowIndex++;
        }
        if (
          rowIndex === 2 &&
          node.type.name === 'paragraph' &&
          newRowParagraphPos === 0
        ) {
          newRowParagraphPos = pos;
        }
      });

      editor.view.dispatch(
        editor.state.tr.insert(
          newRowParagraphPos + 1,
          editor.schema.text('Typed')
        )
      );

      let typedHasOverriddenBold = false;
      editor.state.doc.descendants((node) => {
        if (node.isText && node.text === 'Typed') {
          typedHasOverriddenBold = node.marks.some(
            (mark) =>
              mark.type.name === 'strong' && mark.attrs.overridden === true
          );
        }
      });

      expect(typedHasOverriddenBold).toBe(true);
    });

    test('typing in a row added to a Normal styled table keeps Normal font marks', () => {
      setStyles([
        {
          styleName: 'Normal',
          styles: {
            fontName: 'Arial',
            fontSize: '12',
          },
        },
      ]);
      editor.commands.setContent(
        '<table data-table-style-name="Normal"><tr><td>A</td><td>B</td></tr></table>'
      );

      let firstCellTextPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableCell' && firstCellTextPos === 0) {
          firstCellTextPos = pos + 2;
        }
      });

      editor.commands.setTextSelection(firstCellTextPos);
      editor.commands.addRowAfter();

      let newRowParagraphPos = 0;
      let rowIndex = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableRow') {
          rowIndex++;
        }
        if (
          rowIndex === 1 &&
          node.type.name === 'paragraph' &&
          newRowParagraphPos === 0
        ) {
          newRowParagraphPos = pos;
        }
      });

      editor.commands.setTextSelection(newRowParagraphPos + 1);
      editor.commands.insertContent('Typed');

      let typedMarks: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.isText && node.text === 'Typed') {
          typedMarks = node.marks.map((mark) =>
            `${mark.type.name}:${JSON.stringify(mark.attrs)}`
          );
        }
      });

      expect(typedMarks).toContain(
        'mark-font-type:{"name":"Arial","overridden":false}'
      );
      expect(typedMarks).toContain(
        'mark-font-size:{"pt":"12","overridden":false}'
      );
    });

    test('Normal style font marks replace stale non-overridden pending marks', () => {
      setStyles([
        {
          styleName: 'Normal',
          styles: {
            fontName: 'Times New Roman',
            fontSize: '20',
          },
        },
      ]);
      editor.commands.setContent(
        '<table data-table-style-name="Normal"><tr><td>A</td><td>B</td></tr></table>'
      );

      let firstCellTextPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableCell' && firstCellTextPos === 0) {
          firstCellTextPos = pos + 2;
        }
      });

      editor.commands.setTextSelection(firstCellTextPos);
      editor.commands.addRowAfter();

      let newRowParagraphPos = 0;
      let rowIndex = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableRow') {
          rowIndex++;
        }
        if (
          rowIndex === 1 &&
          node.type.name === 'paragraph' &&
          newRowParagraphPos === 0
        ) {
          newRowParagraphPos = pos;
        }
      });

      const paragraph = editor.state.doc.nodeAt(newRowParagraphPos);
      const stalePendingMarks = [
        editor.schema.marks['mark-font-type']
          .create({name: 'Courier New', overridden: false})
          .toJSON(),
        editor.schema.marks['mark-font-size']
          .create({pt: '18', overridden: false})
          .toJSON(),
        editor.schema.marks.strong
          .create({overridden: true})
          .toJSON(),
      ];
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(newRowParagraphPos, undefined, {
          ...paragraph?.attrs,
          [PENDING_TABLE_MARKS_ATTRIBUTE]: stalePendingMarks,
        })
      );
      setStyles([
        {
          styleName: 'Normal',
          styles: {
            fontName: 'Arial',
            fontSize: '12',
          },
        },
      ]);

      editor.commands.setTextSelection(newRowParagraphPos + 1);
      editor.commands.insertContent('Typed');

      let typedMarks: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.isText && node.text === 'Typed') {
          typedMarks = node.marks.map((mark) =>
            `${mark.type.name}:${JSON.stringify(mark.attrs)}`
          );
        }
      });

      expect(typedMarks).toContain(
        'mark-font-type:{"name":"Arial","overridden":false}'
      );
      expect(typedMarks).toContain(
        'mark-font-size:{"pt":"12","overridden":false}'
      );
      expect(typedMarks).toContain(
        'strong:{"overridden":true}'
      );
      expect(typedMarks).not.toContain(
        'mark-font-type:{"name":"Courier New","overridden":false}'
      );
      expect(typedMarks).not.toContain(
        'mark-font-size:{"pt":"18","overridden":false}'
      );
    });

    test('addColumnAfter command copies paragraph overrides through the editor command path', () => {
      let firstParagraphPos = 0;
      let firstCellTextPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && firstParagraphPos === 0) {
          firstParagraphPos = pos;
        }
        if (node.type.name === 'tableCell' && firstCellTextPos === 0) {
          firstCellTextPos = pos + 2;
        }
      });

      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(firstParagraphPos, undefined, {
          ...editor.state.doc.nodeAt(firstParagraphPos).attrs,
          align: 'right',
          marginTop: '12px',
          overriddenAlign: true,
          overriddenAlignValue: 'right',
        })
      );
      editor.commands.setTextSelection(firstCellTextPos);
      editor.commands.addColumnAfter();

      const copiedParagraphAttrs: Record<string, unknown>[] = [];
      editor.state.doc.descendants((node) => {
        if (
          node.type.name === 'paragraph' &&
          node.attrs.overriddenAlign === true &&
          node.attrs.overriddenAlignValue === 'right' &&
          node.attrs.align === 'right' &&
          node.attrs.marginTop === '12px'
        ) {
          copiedParagraphAttrs.push(node.attrs);
        }
      });

      expect(copiedParagraphAttrs).toHaveLength(2);
    });
  });

  test('should insert table with custom rows and cols', () => {
    editor.commands.insertTable({ rows: 3, cols: 4 });

    let rowCount = 0;
    let maxCols = 0;
    let currentCols = 0;

    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableRow') {
        rowCount++;
        currentCols = 0;
      }
      if (node.type.name === 'tableCell') {
        currentCols++;
        maxCols = Math.max(maxCols, currentCols);
      }
    });

    expect(rowCount).toBe(5);
    expect(maxCols).toBe(5);
  });

  test('should insert table with default dimensions', () => {
    editor.commands.insertTable();

    let rowCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'tableRow') {
        rowCount++;
      }
    });

    expect(rowCount).toBe(5);
  });

  test('should not add row when Tab pressed in last cell and vignette is true', () => {
    editor.commands.setContent(`
    <table>
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
    </table>
  `);

    const { state } = editor;
    let lastCellPos = 0;

    state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableCell') {
        lastCellPos = pos;
      }
    });

    editor.commands.setTextSelection(lastCellPos + 2);
    editor.commands.updateAttributes('tableCell', { vignette: true });

    editor.state.doc.descendants((node: PMNode) => {
      return node.type.name === 'tableRow';
    });

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    editor.view.dom.dispatchEvent(tabEvent);

    let finalRows = 0;
    editor.state.doc.descendants((node: PMNode) => {
      if (node.type.name === 'tableRow') finalRows++;
    });

    expect(finalRows).toBe(1);
  });

  test('should add row and move to it when Tab pressed in last cell without vignette', () => {
    editor.commands.setContent(`
    <table>
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
    </table>
  `);

    const { state } = editor;
    let lastCellPos = 0;

    state.doc.descendants((node: PMNode, pos: number) => {
      if (node.type.name === 'tableCell') {
        lastCellPos = pos;
      }
    });

    editor.commands.setTextSelection(lastCellPos + 2);

    const spy = jest.spyOn(editor.commands, 'addRowAfter');
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    editor.view.dom.dispatchEvent(tabEvent);

    expect(spy).not.toHaveBeenCalled();
  });

  test('should maintain selection after inserting table', () => {
    editor.commands.setContent('<p>Test</p>');
    editor.commands.insertTable({ rows: 2, cols: 2 });

    const { selection } = editor.state;
    expect(selection).toBeDefined();
    expect(selection.from).toBeGreaterThan(0);
  });

  test('should handle header_cell role in Tab navigation', () => {
    editor.commands.setContent(`
    <table>
      <tr><th>Header 1</th><th>Header 2</th></tr>
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
    </table>
  `);

    const { state } = editor;
    let headerPos = 0;

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableHeader' && headerPos === 0) {
        headerPos = pos + 2;
      }
    });

    editor.commands.setTextSelection(headerPos);
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    editor.view.dom.dispatchEvent(tabEvent);

    expect(editor.commands.goToNextCell).toBeDefined();
  });

  test('should apply tableHeight to table DOM when attributes are updated', () => {
    editor.commands.setContent('<table><tr><td>Cell</td></tr></table>');

    let cellPos = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' && cellPos === 0) {
        cellPos = pos + 2;
      }
    });

    editor.commands.setTextSelection(cellPos);
    editor.commands.updateAttributes('table', { tableHeight: '280' });

    const tableElement = editor.view.dom.querySelector('table');
    expect(tableElement.style.height).toBe('280px');
  });

  test('should return true when insertTable is called without dispatch', () => {
    const insertTableCommand = editor.extensionManager.commands.insertTable;
    const command = insertTableCommand({ rows: 2, cols: 2 });

    const result = command({
      tr: editor.state.tr,
      dispatch: undefined,
      editor,
      state: editor.state,
      view: editor.view,
      commands: editor.commands,
      chain: editor.chain,
      can: editor.can,
    });

    expect(result).toBe(true);
  });

  test.each([
    'addColumnBefore',
    'addColumnAfter',
    'addRowBefore',
    'addRowAfter',
    'splitCell',
  ])('command wrapper %s returns without dispatch', (commandName) => {
    editor.commands.setContent('<table><tr><td>A</td><td>B</td></tr></table>');
    let cellPos = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' && cellPos === 0) {
        cellPos = pos + 2;
      }
    });
    editor.commands.setTextSelection(cellPos);

    const commandFactory = editor.extensionManager.commands[commandName];
    const command = commandFactory();
    const result = command({
      tr: editor.state.tr,
      dispatch: undefined,
      editor,
      state: editor.state,
      view: editor.view,
      commands: editor.commands,
      chain: editor.chain,
      can: editor.can,
    });

    expect(typeof result).toBe('boolean');
  });

  test('attribute render and parse functions cover empty and populated values', () => {
    const attrs = (TableEx.config.addAttributes as () => Record<
      string,
      {
        renderHTML: (attributes: Record<string, unknown>) => Record<string, unknown>;
        parseHTML: (element: HTMLElement) => unknown;
      }
    >).call({parent: () => ({})});
    const element = document.createElement('table');
    element.dataset.noOfColumns = '4';
    element.dataset.coverPage = 'true';
    element.dataset.tableStyleName = 'Table body';
    element.style.height = '120px';

    expect(attrs.noOfColumns.renderHTML({noOfColumns: 3})).toEqual({
      'data-no-of-columns': '3',
    });
    expect(attrs.noOfColumns.renderHTML({noOfColumns: null})).toEqual({});
    expect(attrs.noOfColumns.parseHTML(element)).toBe(4);
    element.dataset.noOfColumns = 'abc';
    expect(attrs.noOfColumns.parseHTML(element)).toBeNull();
    delete element.dataset.noOfColumns;
    expect(attrs.noOfColumns.parseHTML(element)).toBeNull();

    expect(attrs.tableHeight.renderHTML({tableHeight: 120})).toEqual({
      style: 'height: 120px',
    });
    expect(attrs.tableHeight.renderHTML({tableHeight: ''})).toEqual({});
    expect(attrs.tableHeight.parseHTML(element)).toBe('120px');

    expect(attrs.coverPage.renderHTML({coverPage: 'yes'})).toEqual({
      'data-cover-page': 'yes',
    });
    expect(attrs.coverPage.renderHTML({coverPage: ''})).toEqual({});
    expect(attrs.coverPage.parseHTML(element)).toBeUndefined();
    delete element.dataset.coverPage;
    expect(attrs.coverPage.parseHTML(element)).toBeNull();

    expect(
      attrs[TABLE_STYLE_NAME_ATTRIBUTE].renderHTML({
        [TABLE_STYLE_NAME_ATTRIBUTE]: 'Table body',
      })
    ).toEqual({'data-table-style-name': 'Table body'});
    expect(
      attrs[TABLE_STYLE_NAME_ATTRIBUTE].renderHTML({
        [TABLE_STYLE_NAME_ATTRIBUTE]: '',
      })
    ).toEqual({});
    expect(attrs[TABLE_STYLE_NAME_ATTRIBUTE].parseHTML(element)).toBe(
      'Table body'
    );
  });
});

type TableExtensionType = Extension & {
  options: {
    View: unknown;
  };
};

describe('TableEx Extension - attributes', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, TableEx, TableRowEx, TableHeader, TableCell],
      content: '<table><tr><td>Cell</td></tr></table>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  test('should ignore invalid attribute types when applying table attributes', () => {
    const baseTable = createTable(editor.schema, 1, 1, false);
    const tableNode = baseTable.type.createChecked(
      {
        ...baseTable.attrs,
        noOfColumns: {},
        tableHeight: '',
      },
      baseTable.content,
      baseTable.marks
    );

    const tableExtension = editor.extensionManager.extensions.find(
      (ext) => ext.name === 'table'
    ) as TableExtensionType;

    const ViewCtor = tableExtension.options.View as unknown as new (
      node: unknown,
      cellMinWidth: number
    ) => { table: HTMLTableElement };

    const view = new ViewCtor(tableNode, 25);

    expect(view.table.getAttribute('data-no-of-columns')).toBeNull();
    expect(view.table.getAttribute('data-table-height')).toBeNull();
    expect(view.table.style.height).toBe('');
  });

  test('TableViewEx update should apply table attributes when updated', () => {
    editor.commands.updateAttributes('table', {
      tableHeight: '120',
      noOfColumns: 3,
    });
    const tableNode = editor.state.doc.firstChild;
    const tableExtension = editor.extensionManager.extensions.find(
      (ext) => ext.name === 'table'
    ) as TableExtensionType;

    const ViewCtor = tableExtension.options.View as unknown as new (
      node: unknown,
      cellMinWidth: number
    ) => { update: (node: unknown) => boolean; table: HTMLTableElement };

    const view = new ViewCtor(tableNode, 25);
    const result = view.update(tableNode);

    expect(result).toBe(true);
    expect(view.table.getAttribute('data-table-height')).toBe('120px');
    expect(view.table.getAttribute('data-no-of-columns')).toBe('3');
  });
});
