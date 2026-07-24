/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { MarkSpec } from 'prosemirror-model';

const LetterSpacingMarkSpec: MarkSpec = {
  attrs: {
    letterSpacing: { default: null },
    overridden: { default: false },
  },
  inline: true,
  group: 'inline',
  parseDOM: [
    {
      tag: 'span[style*=letter-spacing]',
      getAttrs: (dom: HTMLElement) => ({
        letterSpacing: dom.style.letterSpacing || null,
        overridden: dom.getAttribute('overridden') === 'true',
      }),
    },
  ],
  toDOM(mark) {
    return [
      'span',
      {
        overridden: mark.attrs.overridden,
        style: `letter-spacing: ${mark.attrs.letterSpacing}`,
      },
      0,
    ];
  },
};

export default LetterSpacingMarkSpec;
