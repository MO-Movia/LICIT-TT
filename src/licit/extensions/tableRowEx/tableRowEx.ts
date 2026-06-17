/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import TableRow from '@tiptap/extension-table-row';
import {normalizeCssSize, normalizeValue} from '../table.utils';

export const TableRowEx = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        renderHTML: (attributes) => {
          const rowHeight = normalizeCssSize(attributes.rowHeight);
          if (!rowHeight) {
            return {};
          }

          return {
            style: `height: ${rowHeight}`,
          };
        },
        parseHTML: (element) => {
          return normalizeValue(element.style.height);
        },
      },
      rowWidth: {
        default: null,
        renderHTML: (attributes) => {
          const rowWidth = normalizeCssSize(attributes.rowWidth);
          if (!rowWidth) {
            return {};
          }

          return {
            style: `width: ${rowWidth}`,
          };
        },
        parseHTML: (element) => {
          return normalizeValue(element.style.width);
        },
      },
    };
  },
});
