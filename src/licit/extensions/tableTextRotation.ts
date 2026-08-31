/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export const CLOCKWISE_TEXT_ROTATION = 'clockwise';

const CLOCKWISE_WRITING_MODES = new Set(['vertical-rl', 'sideways-rl']);

export const tableTextRotationAttribute = {
  default: null,
  renderHTML: (attributes: Record<string, unknown>) => {
    if (attributes.textRotation !== CLOCKWISE_TEXT_ROTATION) {
      return {};
    }

    return {
      'data-cell-text-rotation': CLOCKWISE_TEXT_ROTATION,
      style:
        'writing-mode: vertical-rl; text-orientation: mixed; text-align: center; vertical-align: middle;',
    };
  },
  parseHTML: (element: HTMLElement) => {
    const attributeValue =
      element.dataset.cellTextRotation ??
      element.getAttribute('textRotation');
    if (attributeValue?.trim().toLowerCase() === CLOCKWISE_TEXT_ROTATION) {
      return CLOCKWISE_TEXT_ROTATION;
    }

    return CLOCKWISE_WRITING_MODES.has(
      element.style.writingMode.trim().toLowerCase()
    )
      ? CLOCKWISE_TEXT_ROTATION
      : null;
  },
};
