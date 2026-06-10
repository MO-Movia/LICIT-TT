/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';

import Icon from './icon';

const ICON_LABEL_PATTERN = /^\[((?!\[)[^\s]{1,10000})(\] )(.*)/;

export type ParsedLabel = {
  icon: string | React.ReactElement | null;
  title: string | null;
};

export function parseLabel(input: string, theme: string): ParsedLabel {
  const matched = ICON_LABEL_PATTERN.exec(input);
  if (matched) {
    const [, icon, , label] = matched;
    return {
      icon: icon ? Icon.get(icon, null, theme) : null,
      title: label || null,
    };
  }

  return {
    icon: null,
    title: input || null,
  };
}

export function isExpandButton(title: string): boolean {
  return title?.trim() === 'Expand';
}
