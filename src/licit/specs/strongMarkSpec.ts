/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { MarkSpec } from 'prosemirror-model';

const StrongMarkSpec: MarkSpec = {
  attrs: {
    overridden: { default: false }
  },
  parseDOM: [

    {
      tag: 'strong',
      getAttrs: (dom: HTMLElement) => {
        const _overridden = dom.getAttribute('overridden');
        return { overridden: _overridden === 'true' };
      }
    },
    {
      tag: 'b',
      getAttrs: (dom: HTMLElement) => {
        const _overridden = dom.getAttribute('overridden');
        return { overridden: _overridden === 'true' };
      }
    },
    {
      tag: 'span[style*=font-weight]',
      getAttrs: (dom: HTMLElement) => {
        const _overridden = dom.getAttribute('overridden');
        return { overridden: _overridden === 'true' };

      },
    },
  ],
  toDOM(mark) {
    // Explicitly pin the mark to CSS bold. The browser's user-agent
    // `strong { font-weight: bolder }` rule compounds a bold table-cell
    // inheritance (700 -> 900), which makes imported and overridden table
    // text heavier than its source style.
    return [
      'strong',
      {overridden: mark.attrs.overridden, style: 'font-weight: 700;'},
      0,
    ];
  },
};

export default StrongMarkSpec;
