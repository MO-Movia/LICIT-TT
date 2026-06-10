/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import url from 'url';

import {isOffline} from './isOffline';

export type ImageResult = {
  complete: boolean;
  height: number;
  naturalHeight: number;
  naturalWidth: number;
  src: string;
  width: number;
};

const cache: {[src: string]: ImageResult} = {};
// Track in-flight requests to deduplicate concurrent calls for the same src
const inFlight: Record<string, Promise<ImageResult>> = {};
export function resolveImage(src: string): Promise<ImageResult> {
  const srcStr = src || '';
  // return from cache immediately (no img element, no download)
  if (cache[srcStr]) {
    return Promise.resolve({...cache[srcStr]});
  }
  //  Deduplicate concurrent requests for the same src
  if (inFlight[srcStr]?.then) {
    return inFlight[srcStr];
  }
  // Start resolution in parallel (no blocking queue)
  const promise = processPromise(src);
  inFlight[srcStr] = promise;
  return promise.finally(() => {
    delete inFlight[srcStr];
  });
}

export function isImgInstance(img: unknown): boolean {
  return img instanceof HTMLElement;
}

function processPromise(src: string): Promise<ImageResult> {
  return new Promise((resolve) => {
    const srcStr = src || '';
    const result = {
      complete: false,
      height: 0,
      naturalHeight: 0,
      naturalWidth: 0,
      src: srcStr,
      width: 0,
    };
    if (isOffline()) {
      resolve(result);
      return;
    }
    const parsedURL = url.parse(srcStr);
    // Removed the port validation from here
    const {protocol} = parsedURL;
    if (
      !/(http:|https:|data:|blob:)/.test(
        protocol || globalThis.location.protocol
      )
    ) {
      resolve(result);
      return;
    }
    let img = document.createElement('img');
    img.style.cssText =
      'position:fixed;left:-10000000000px;width:auto;height:auto;';
    const dispose = () => {
      if (img) {
        if (isImgInstance(img)) {
          const pe = img.parentNode;
          pe?.removeChild(img);
        }
        img = null;
      }
    };
    const onDecoded = () => {
      if (img) {
        result.width = img.naturalWidth || img.width;
        result.height = img.naturalHeight || img.height;
        result.naturalWidth = img.naturalWidth || img.width;
        result.naturalHeight = img.naturalHeight || img.height;
        result.complete = true;
        cache[srcStr] = {...result};
      }
      resolve(result);
      dispose();
    };

    const onError = () => {
      resolve(result);
      dispose();
    };

    // Yield to main thread to prevent freezing when assigning large base64 strings
    setTimeout(() => {
      if (!img) return; // disposed
      img.src = srcStr;
      document.body.appendChild(img);

      const onFinish = (method) => {
        if (method === 'decode') onDecoded();
        else if (method === 'onload') onDecoded();
        else onError();
      };

      // Use img.decode() when available � it decodes the image off the main
      // thread, preventing UI hangs for large images. Falls back to load/error
      // events for environments that don't support decode().
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(() => onFinish('decode'))
          .catch(() => onFinish('error'));
      } else {
        img.onload = () => onFinish('onload');
        img.onerror = () => onFinish('error');
      }
    }, 0);
  });
}
