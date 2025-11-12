import {Decoration, EditorView} from 'prosemirror-view';
export type ImageProps = {
    height: number;
    id: string;
    src: string;
    width: number;
};
export type ImageInlineEditorValue = {
  align?: string;
  src?;
};
  export type ImageInlineProps = {
    onSelect: (val: ImageInlineEditorValue) => void;
    value: ImageInlineEditorValue;
    editorView: EditorView;
  };
export type ImageLike = {
  height: number,
  id: string,
  src: string,
  width: number,
};
  export type EditorFocused = EditorView & {
  focused: boolean;
  runtime: EditorRuntime;
  readOnly?: boolean;
};
export type NodeViewProps = {
  decorations: Array<Decoration>;
  editorView: EditorFocused;
  getPos: () => number;
  node: Node;
  selected: boolean;
  focused: boolean;
};

export type EditorRuntime = {
  // Image Proxy
  canProxyImageSrc?: (src: string) => boolean,
  getProxyImageSrc?: (src: string) => Promise<string>,

  // Image Upload
  canUploadImage?: () => boolean,
  uploadImage?: (obj: Blob) => Promise<ImageLike>,


};