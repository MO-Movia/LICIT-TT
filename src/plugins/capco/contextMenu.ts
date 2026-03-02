/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

export type CapcoEle = {
  name?: string;
  isSimpleItem?: boolean;
  appendHr?: boolean;
  isCustomCAPCO?: boolean;
  displayName?: string;
  action?: fnCB;
  value?: unknown;
  removeAction?: fnCB;
  menu?: unknown;
  items?: CapcoEle[];
};

type fnCB = (_x: unknown) => void;
