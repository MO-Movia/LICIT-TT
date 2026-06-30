/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { UICommand } from '../core';

export type NodeSpec = {
  attrs?: Record<string, unknown>;
  content?: string;
  draggable?: boolean;
  group?: string;
  inline?: boolean;
  name?: string;
  defining?: boolean;
  parseDOM?: Record<string, unknown>[];
  toDOM?: (node) => (string | number | Record<string, unknown>)[];
};

export type MarkSpec = {
  attrs?: Record<string, unknown>;
  inline?: boolean;
  defining?: boolean;
  draggable?: boolean;
  excludes?: string;
  group?: string;
  inclusive?: boolean;
  name?: string;
  spanning?: boolean;
  parseDOM: Array<Record<string, unknown>>;
  toDOM: (node) => (string | number | Record<string, unknown>)[];
};

export type DirectEditorProps = {
  clipboardSerializer;
  dispatchTransaction: (tr: Transform) => void;
  editable: () => boolean;
  nodeViews;
  state: EditorState;
  transformPastedHTML: (html: string) => string;
  handleDOMEvents;
};

export type ImageLike = {
  height: number;
  id: string;
  src: string;
  width: number;
};

export type ToolbarMenuConfig = {
  menuPosition: number;
  key: string;
  menuCommand: UICommand;
  isPlugin?: boolean;
  group: string;

}
export type RecentColor = {
  id: number,
  color: string
};

export type EditorRuntime = {
  // Image Proxy
  canProxyImageSrc?: (src: string) => boolean;
  getProxyImageSrc?: (src: string) => Promise<string>;

  // Image Upload
  canUploadImage?: () => boolean;
  uploadImage?: (obj: Blob) => Promise<{ src: string }>;
};
