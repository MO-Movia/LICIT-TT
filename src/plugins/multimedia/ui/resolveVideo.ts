import {isOffline} from './isOffline';
import url from 'url';
import {VideoEditorState} from './VideoEditor';

export type VideoResult = {
  complete: boolean;
  height: number;
  id: string;
  src: string;
  width: number;
};

const cache: {[src: string]: VideoResult} = {};
const queue: {
  config: VideoEditorState | undefined;
  resolve: (value: VideoResult | PromiseLike<VideoResult>) => void;
  reject: (reason?: VideoResult | PromiseLike<VideoResult>) => void;
}[] = [];

export function resolveVideo(config?: VideoEditorState): Promise<VideoResult> {
  return new Promise((resolve, reject) => {
    const bag = {config, resolve, reject};
    queue.push(bag);
    processQueue();
  });
}

function processQueue() {
  const bag = queue.shift();
  if (bag) {
    processPromise(bag.config, bag.resolve, bag.reject);
  }
}

function processPromise(
  config: VideoEditorState | undefined,
  resolve: (value: VideoResult | PromiseLike<VideoResult>) => void,
  _reject: (value: VideoResult | PromiseLike<VideoResult>) => void
): void {
  const result: VideoResult = {
    complete: true,
    height: config?.height ?? 100,
    id: config?.id ?? '',
    src: config?.src ?? '',
    width: config?.width ?? 100,
  };

  if (isOffline()) {
    resolve(result);
    return;
  }

  const srcStr = config?.src ?? '';
  if (!srcStr) {
    resolve(result);
    return;
  } else if (cache[srcStr]) {
    const cachedResult = {...cache[srcStr]};
    resolve(cachedResult);
    return;
  }

  const parsedURL = url.parse(srcStr);
  // Removed the port validation from here
  const protocol = parsedURL.protocol;
  if (!/(http:|https:|data:)/.test(protocol || globalThis.location.protocol)) {
    resolve(result);
    return;
  }

  resolve(result);
  // Fix: Inconsistent behavior on image load
  // Avoid image caching remove the below line
  cache[srcStr] = {...result};
}
