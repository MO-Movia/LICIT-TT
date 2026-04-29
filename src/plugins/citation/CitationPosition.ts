/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Attrs } from 'prosemirror-model';

export const POSITION_MODE_PARAGRAPH = 'paragraph';
export const POSITION_MODE_GLOBAL = 'global';

type CitationRange = {
  from: number;
  to: number;
};

export function toAbsoluteFromStored(attrs: Attrs) {
  const from = Number(attrs.from);
  const to = Number(attrs.to);

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }

  if (
    attrs.positionMode === POSITION_MODE_PARAGRAPH ||
    attrs.paragraphPos !== null && attrs.paragraphPos !== undefined
  ) {
    const paragraphPos = Number(attrs.paragraphPos);

    if (Number.isNaN(paragraphPos)) {
      return null;
    }

    return {
      from: paragraphPos + from,
      to: paragraphPos + to,
    };
  }

  return {
    from,
    to,
  };
}
