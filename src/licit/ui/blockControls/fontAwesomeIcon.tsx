/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';

const ICON_CLASS_NAMES = {
  addNotes: 'fa-file-text',
  alignCenter: 'fa-align-center',
  alignLeft: 'fa-align-left',
  alignRight: 'fa-align-right',
  clipboard: 'fa-clipboard',
  crop: 'fa-crop',
  delete: 'fa-trash',
  deleteNotes: 'fa-window-close',
  file: 'fa-folder-o',
  floatLeft: 'fa-indent',
  floatRight: 'fa-outdent',
  insertAbove: 'fa-arrow-up',
  insertBelow: 'fa-arrow-down',
  resetCrop: 'fa-history',
  style: 'fa-paint-brush',
} as const;

export function getBlockControlIcon(
  name: keyof typeof ICON_CLASS_NAMES,
  label: string
): React.ReactElement {
  return (
    <i
      aria-hidden="true"
      className={`fa ${ICON_CLASS_NAMES[name]}`}
      title={label}
    />
  );
}
