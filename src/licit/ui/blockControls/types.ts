/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type * as React from 'react';

export type BlockControlMenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: (anchor?: HTMLElement) => void | boolean;
  onHover?: (anchor: HTMLElement) => void | boolean;
  active?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

export type BlockControlMenuProps = {
  close?: () => void;
  items: BlockControlMenuItem[];
};
