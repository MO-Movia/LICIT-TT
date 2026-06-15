/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';

export interface SliceModel {
  name: string;
  description: string;
  id: string;
  referenceType: string;
  source: string;
  from: string;
  to: string;
  ids: string[];
}

export interface FloatRuntime {
  createSlice(slice: SliceModel): Promise<SliceModel>;

  retrieveSlices(): Promise<SliceModel[]>;

  insertInfoIconFloat(): void;

  insertCitationFloat(): void;

  insertReference(): Promise<SliceModel>;

  isReadonly: boolean
}


export interface FloatingMenuContext {
  editorState: EditorState;
  paragraphPos?: number;
}

export interface FloatingMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  isEnabled?: (ctx: FloatingMenuContext) => boolean;
}


