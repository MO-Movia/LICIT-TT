/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {findParentNodeClosestToPos} from '@tiptap/core';
import  { Table,
  createTable,
  TableView as TiptapTableView,
} from '@tiptap/extension-table';
import {Node as ProseMirrorNode} from 'prosemirror-model';
import {TextSelection} from 'prosemirror-state';
import {normalizeCssSize, normalizeValue} from '../table.utils';

class TableViewEx extends TiptapTableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.applyTableAttributes(node);
  }

  update(node: ProseMirrorNode): boolean {
    const updated = super.update(node);
    if (updated) {
      this.applyTableAttributes(node);
    }
    return updated;
  }

  applyTableAttributes(node: ProseMirrorNode): void {
    const tableHeight = normalizeCssSize(node.attrs.tableHeight);
    if (tableHeight) {
      this.table.style.height = tableHeight;
      this.table.dataset.tableHeight = tableHeight;
    } else {
      this.table.style.removeProperty('height');
      delete this.table.dataset.tableHeight;
    }

    const noOfColumns = normalizeValue(node.attrs.noOfColumns);
    if (noOfColumns) {
      this.table.dataset.noOfColumns = noOfColumns;
    } else {
      delete this.table.dataset.noOfColumns;
    }
  }
}

export const TableEx = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      View: TableViewEx,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      noOfColumns: {
        default: null,
        renderHTML: (attributes) => {
          const noOfColumns = normalizeValue(attributes.noOfColumns);
          if (!noOfColumns) {
            return {};
          }

          return {
            'data-no-of-columns': noOfColumns,
          };
        },
        parseHTML: (element) => {
          const noOfColumns = element.dataset.noOfColumns;
          if (!noOfColumns) {
            return null;
          }

          const parsed = Number.parseInt(noOfColumns, 10);
          return Number.isNaN(parsed) ? null : parsed;
        },
      },
      tableHeight: {
        default: null,
        renderHTML: (attributes) => {
          const tableHeight = normalizeCssSize(attributes.tableHeight);
          if (!tableHeight) {
            return {};
          }

          return {
            style: `height: ${tableHeight}`,
          };
        },
        parseHTML: (element) => {
          return normalizeValue(element.style.height);
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const {state} = this.editor;
        const {selection} = state;

        const parentCell = findParentNodeClosestToPos(
          selection.$from,
          (node) =>
            node.type.spec.tableRole === 'cell' ||
            node.type.spec.tableRole === 'header_cell'
        );

        const cellNode = parentCell?.node;
        const moved = this.editor.commands.goToNextCell();
        if (moved) {
          return true;
        } else if (!moved && cellNode?.attrs?.vignette === false) {
          return this.editor.chain().addRowAfter().goToNextCell().run();
        }
      },
      'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),

      // override only insertTable to remove header row
      insertTable:
        ({rows = 3, cols = 3} = {}) =>
        ({tr, dispatch, editor}) => {
          const withHeaderRow = false;
          const tableNode = createTable(editor.schema, rows, cols, withHeaderRow);
          const node = tableNode.type.createChecked(
            {
              ...tableNode.attrs,
              noOfColumns: cols,
            },
            tableNode.content,
            tableNode.marks
          );

          if (dispatch) {
            const offset = tr.selection.from + 1;

            tr.replaceSelectionWith(node)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset)));
          }

          return true;
        },
    };
  },
});
