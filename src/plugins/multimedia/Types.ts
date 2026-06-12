/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export type VideoLike = {
  height: number;
  id: string;
  src: string;
  width: number;
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
  height: number;
  id: string;
  src: string;
  width: number;
};

export type EditorRuntime = {
  // Image Proxy
  canProxyImageSrc?: (src: string) => boolean;
  getProxyImageSrc?: (src: string) => Promise<string>;

  // Image Upload
  canUploadImage?: () => boolean;
  uploadImage?: (obj: Blob) => Promise<{ src: string }>;
};
