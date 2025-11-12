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
const queue: {
  src: string;
  resolve: (value: ImageResult | PromiseLike<ImageResult>) => void;
  reject: (reason?: {value: ImageResult | PromiseLike<ImageResult>}) => void;
}[] = [];

export function resolveImage(src: string): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const bag = {src, resolve, reject};
    queue.push(bag);
    processQueue();
  });
}

function processQueue() {
  const bag = queue.shift();
  if (bag) {
    processPromise(bag.src, bag.resolve, bag.reject);
  }
}
export function isImgInstance(img: unknown): boolean {
  return img instanceof HTMLElement;
}

function resolveRes(
  srcStr: string,
  result: ImageResult,
  resolve: (value: ImageResult | PromiseLike<ImageResult>) => void
) {
  if (!srcStr) {
    resolve(result);
  } else if (cache[srcStr]) {
    const cachedResult = {...cache[srcStr]};
    resolve(cachedResult);
  }
}

function processPromise(
  src: string,
  resolve: (value: ImageResult | PromiseLike<ImageResult>) => void,
  _reject: (reason?: {value: ImageResult | PromiseLike<ImageResult>}) => void
): void {
  const result: ImageResult = {
    complete: false,
    height: 0,
    naturalHeight: 0,
    naturalWidth: 0,
    src: src || '',
    width: 0,
  };

  if (isOffline()) {
    resolve(result);
    return;
  }

  const srcStr = src || '';

  resolveRes(srcStr, result, resolve);

  const parsedURL = url.parse(srcStr);
  // Removed the port validation from here
  const {protocol} = parsedURL;
  if (!/(http:|https:|data:)/.test(protocol || globalThis.location.protocol)) {
    resolve(result);
    return;
  }

  let img: HTMLImageElement | null;

  const dispose = () => {
    if (img) {
      if (isImgInstance(img)) {
        const pe = img.parentNode;
        pe?.removeChild(img);
      }
      img.onload = null;
      img.onerror = null;
      img = null;
    }
    processQueue();
  };

  const onLoad = () => {
    if (img) {
      result.width = img.width;
      result.height = img.height;
      result.naturalWidth = img.width;
      result.naturalHeight = img.height;
      result.complete = true;
    }
    resolve(result);
    dispose();
    // Fix: Inconsistent behavior on image load
    // Avoid image caching remove the below line
    cache[srcStr] = {...result};
  };

  const onError = () => {
    resolve(result);
    dispose();
  };

  img = document.createElement('img');
  img.style.cssText =
    'position:fixed;left:-10000000000px;width:auto;height:auto;';
  img.onload = onLoad;
  img.onerror = onError;
  img.src = srcStr;
  document.body.appendChild(img);
}
