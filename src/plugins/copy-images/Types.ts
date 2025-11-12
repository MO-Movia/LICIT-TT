export type RenderCommentProps = {
  commentThreadId: string;
  isActive: boolean;
  requestCommentThreadDeletion: () => void;
  requestCommentThreadReflow: () => void;
};

export type VideoLike = {
  height: number;
  id: string;
  src: string;
  width: number;
};

export type NodeSpec = {
  attrs?: { [key: string]: unknown },
  content?: string,
  draggable?: boolean,
  group?: string,
  inline?: boolean,
  name?: string,
  parseDOM?: Array<unknown>,
  toDOM?: (node) => Array<unknown>,
};

export type EditorVideoRuntime = {
  // Video Proxy
  canProxyVideoSrc?: (src: string) => boolean;
  getProxyVideoSrc?: (src: string) => string;
  getVideoSrc?: (id: string) => Promise<string>;

  // Video Upload
  canUploadVideo?: () => boolean;
  uploadVideo?: (obj: Blob) => Promise<VideoLike>;
};

export type ImageLike = {
  height: number,
  id: string,
  src: string,
  width: number,
};

export type EditorRuntime = {
  // Image Proxy
  canProxyImageSrc?: (src: string) => boolean,
  getProxyImageSrc?: (src: string) => Promise<string>,

  // Image Upload
  canUploadImage?: () => boolean,
  uploadImage?: (obj: Blob) => Promise<ImageLike>,

  // Comments
  canComment?: () => boolean,
  createCommentThreadID?: () => string,
  renderComment?: (props: RenderCommentProps) => unknown,

  // External HTML
  canLoadHTML?: () => boolean,
  loadHTML?: () => Promise<string>,

};
