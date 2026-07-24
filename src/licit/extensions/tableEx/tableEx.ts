/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { findParentNodeClosestToPos } from '@tiptap/core';
import { Table, createTable } from '@tiptap/extension-table';
import { TextSelection } from 'prosemirror-state';
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  splitCell,
} from '@tiptap/pm/tables';
import { normalizeCssSize, normalizeValue } from '../table.utils';
import { LicitTableNodeView } from '../../ui/tableNodeView';
import {
  applyTableStyle,
  applyStoredTableStyles,
  DEFAULT_TABLE_STYLE_NAME,
  TABLE_STYLE_NAME_ATTRIBUTE,
} from './tableStyle';

export const TableEx = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      View: LicitTableNodeView,
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
      [TABLE_STYLE_NAME_ATTRIBUTE]: {
        default: DEFAULT_TABLE_STYLE_NAME,
        renderHTML: (attributes) => {
          const styleName = normalizeValue(
            attributes[TABLE_STYLE_NAME_ATTRIBUTE]
          );
          return styleName ? { 'data-table-style-name': styleName } : {};
        },
        parseHTML: (element) => {
          return normalizeValue(element.dataset.tableStyleName);
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state } = this.editor;
        const { selection } = state;

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

      addColumnBefore:
        () =>
        ({ state, dispatch }) => {
          return addColumnBefore(
            state,
            dispatch &&
              ((tr) => {
                dispatch(applyStoredTableStyles(state, tr));
              })
          );
        },

      addColumnAfter:
        () =>
        ({ state, dispatch }) => {
          return addColumnAfter(
            state,
            dispatch &&
              ((tr) => {
                dispatch(applyStoredTableStyles(state, tr));
              })
          );
        },

      addRowBefore:
        () =>
        ({ state, dispatch }) => {
          return addRowBefore(
            state,
            dispatch &&
              ((tr) => {
                dispatch(applyStoredTableStyles(state, tr));
              })
          );
        },

      addRowAfter:
        () =>
        ({ state, dispatch }) => {
          return addRowAfter(
            state,
            dispatch &&
              ((tr) => {
                dispatch(applyStoredTableStyles(state, tr));
              })
          );
        },

      splitCell:
        () =>
        ({ state, dispatch }) => {
          return splitCell(
            state,
            dispatch &&
              ((tr) => {
                dispatch(applyStoredTableStyles(state, tr));
              })
          );
        },

      // override only insertTable to remove header row
      insertTable:
        ({ rows = 3, cols = 3 } = {}) =>
        ({ tr, dispatch, editor, state }) => {
          const withHeaderRow = false;
          const tableNode = createTable(
            editor.schema,
            rows,
            cols,
            withHeaderRow
          );
          const node = tableNode.type.createChecked(
            {
              ...tableNode.attrs,
              noOfColumns: cols,
              [TABLE_STYLE_NAME_ATTRIBUTE]: DEFAULT_TABLE_STYLE_NAME,
            },
            tableNode.content,
            tableNode.marks
          );

          if (dispatch) {
            const offset = tr.selection.from + 1;

            tr.replaceSelectionWith(node)
              .scrollIntoView();
            applyTableStyle(
              state,
              tr,
              offset - 1,
              DEFAULT_TABLE_STYLE_NAME
            );
            tr.setSelection(TextSelection.near(tr.doc.resolve(offset)));
          }

          return true;
        },
    };
  },
});
