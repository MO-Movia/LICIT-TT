/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { resolveImage, isImgInstance } from './ResolveImage';


jest.mock('node:url', () => {
  const parse = (src: string) => {
    if (!src) return { protocol: null };
    try {
      return new URL(src);
    } catch {
      return { protocol: null };
    }
  };
  return {
    __esModule: true,
    default: { parse },
    parse,
  };
});

jest.mock('url', () => {
  const parse = (src: string) => {
    if (!src) return { protocol: null };
    try {
      return new URL(src);
    } catch {
      return { protocol: null };
    }
  };
  return {
    __esModule: true,
    default: { parse },
    parse,
  };
});

const setNavigatorOnline = (isOnline: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => isOnline,
  });
};

describe('Image Resolver Module', () => {
  beforeEach(() => {
    document.body.innerHTML = ''; // Reset DOM
    setNavigatorOnline(true); // Simulate online
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isImgInstance', () => {
    it('returns true for HTML elements', () => {
      const el = document.createElement('div');
      expect(isImgInstance(el)).toBe(true);
    });

    it('returns true for <img> elements', () => {
      const img = document.createElement('img');
      expect(isImgInstance(img)).toBe(true);
    });

    it('returns false for plain objects, null, and undefined', () => {
      expect(isImgInstance({})).toBe(false);
      expect(isImgInstance(null)).toBe(false);
      expect(isImgInstance(undefined)).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isImgInstance('string')).toBe(false);
      expect(isImgInstance(42)).toBe(false);
      expect(isImgInstance(true)).toBe(false);
    });
  });

  describe('resolveImage — connectivity', () => {
    it('resolves with default result if navigator reports offline', async () => {
      setNavigatorOnline(false);
      const src = 'https://example.com/offline.jpg';
      const result = await resolveImage(src);

      expect(result).toEqual(
        expect.objectContaining({
          complete: false,
          height: 0,
          naturalHeight: 0,
          naturalWidth: 0,
          src,
          width: 0,
        })
      );
    });

    it('treats a navigator with no own onLine property as online', async () => {
      delete (globalThis.navigator as { onLine?: boolean }).onLine;
      expect(Object.hasOwn(globalThis.navigator, 'onLine')).toBe(false);

      const src = 'ftp://example.com/no-online-prop.png';
      const result = await resolveImage(src);

      expect(result.src).toBe(src);
      expect(result.complete).toBe(false);
    });
  });

  describe('resolveImage — image loading', () => {
    it('resolves with image dimensions on load', async () => {
      const src = 'https://example.com/image-load.jpg';
      const img = new Image();
      Object.defineProperty(img, 'width', { value: 100 });
      Object.defineProperty(img, 'height', { value: 200 });

      jest.spyOn(document, 'createElement').mockImplementation(() => img);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => {
        img.onload?.(new Event('load'));
      }, 10);

      const result = await resolveImage(src);

      expect(result).toEqual({
        complete: true,
        height: 200,
        naturalHeight: 200,
        naturalWidth: 100,
        src,
        width: 100,
      });
    });

    it('resolves with default result on error', async () => {
      const src = 'https://example.com/invalid.jpg';
      const img = new Image();

      jest.spyOn(document, 'createElement').mockImplementation(() => img);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => {
        img.onerror?.(new Event('error'));
      }, 10);

      const result = await resolveImage(src);

      expect(result).toEqual(
        expect.objectContaining({
          complete: false,
          src,
        })
      );
    });

    it('proceeds with image loading for data: URLs', async () => {
      const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
      const img = new Image();
      Object.defineProperty(img, 'width', { value: 1 });
      Object.defineProperty(img, 'height', { value: 1 });

      jest.spyOn(document, 'createElement').mockImplementation(() => img);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => img.onload?.(new Event('load')), 5);

      const result = await resolveImage(src);
      expect(result.complete).toBe(true);
      expect(result.width).toBe(1);
    });

    it('falls back to location.protocol when parsed protocol is null (relative URL)', async () => {
      const src = '/relative/path.png';
      const img = new Image();
      Object.defineProperty(img, 'width', { value: 30 });
      Object.defineProperty(img, 'height', { value: 40 });

      jest.spyOn(document, 'createElement').mockImplementation(() => img);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => img.onload?.(new Event('load')), 5);

      const result = await resolveImage(src);
      expect(result.complete).toBe(true);
      expect(result.width).toBe(30);
      expect(result.height).toBe(40);
    });
  });

  describe('resolveImage — resolveRes branches', () => {
    it('resolves with default result when src is an empty string', async () => {

      const img = new Image();
      jest.spyOn(document, 'createElement').mockImplementation(() => img);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      const result = await resolveImage('');

      expect(result).toEqual({
        complete: false,
        height: 0,
        naturalHeight: 0,
        naturalWidth: 0,
        src: '',
        width: 0,
      });
    });

    it('returns cached result on subsequent calls for the same src', async () => {
      const src = 'https://example.com/cacheable.jpg';

      const img1 = new Image();
      Object.defineProperty(img1, 'width', { value: 88 });
      Object.defineProperty(img1, 'height', { value: 99 });

      jest.spyOn(document, 'createElement').mockImplementation(() => img1);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => img1.onload?.(new Event('load')), 5);

      const first = await resolveImage(src);
      expect(first.width).toBe(88);
      expect(first.height).toBe(99);
      expect(first.complete).toBe(true);

      const second = await resolveImage(src);
      expect(second).toEqual(first);
      expect(second).not.toBe(first); 
    });
  });


  describe('resolveImage — unsupported protocols', () => {
    it('skips resolution for ftp URLs', async () => {
      const src = 'ftp://example.com/file.png';
      const result = await resolveImage(src);
      expect(result.src).toBe(src);
      expect(result.complete).toBe(false);
    });

    it('skips resolution for file URLs', async () => {
      const src = 'file:///etc/passwd';
      const result = await resolveImage(src);
      expect(result.src).toBe(src);
      expect(result.complete).toBe(false);
    });
  });

  describe('resolveImage — dispose & queue branches', () => {
    it('skips DOM removal when the created element is not an HTMLElement', async () => {
      
      const src = 'https://example.com/not-html-element.jpg';
      const fakeImg = {
        style: { cssText: '' },
        width: 60,
        height: 80,
        onload: null as ((e: Event) => void) | null,
        onerror: null as ((e: Event) => void) | null,
        src: '',
      };

      jest
        .spyOn(document, 'createElement')
        .mockImplementation(() => fakeImg as unknown as HTMLImageElement);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => fakeImg.onload?.(new Event('load')), 5);

      const result = await resolveImage(src);

      expect(result.complete).toBe(true);
      expect(result.width).toBe(60);
      expect(result.height).toBe(80);
      expect(fakeImg.onload).toBeNull();
      expect(fakeImg.onerror).toBeNull();
    });

    it('handles the onload handler firing again after the img has been nulled', async () => {
     
      const src = 'https://example.com/double-dispose.jpg';
      const img = new Image();
      Object.defineProperty(img, 'width', { value: 5 });
      Object.defineProperty(img, 'height', { value: 5 });

      jest.spyOn(document, 'createElement').mockImplementation(() => img);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => {
        // Capture the handler reference BEFORE it gets nulled by dispose()
        const firstHandler = img.onload;
        // First invocation: runs the normal load path → dispose() nulls closure `img`
        firstHandler?.call(img, new Event('load'));
        // Second invocation: closure `img` is now null and queue is empty
        firstHandler?.call(img, new Event('load'));
      }, 5);

      const result = await resolveImage(src);
      expect(result.complete).toBe(true);
    });

    it('processes multiple parallel requests independently', async () => {
      const srcA = 'https://example.com/parallel-a.jpg';
      const srcB = 'https://example.com/parallel-b.jpg';

      const imgA = new Image();
      Object.defineProperty(imgA, 'width', { value: 10 });
      Object.defineProperty(imgA, 'height', { value: 20 });

      const imgB = new Image();
      Object.defineProperty(imgB, 'width', { value: 30 });
      Object.defineProperty(imgB, 'height', { value: 40 });

      jest
        .spyOn(document, 'createElement')
        .mockImplementationOnce(() => imgA)
        .mockImplementationOnce(() => imgB);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      setTimeout(() => imgA.onload?.(new Event('load')), 5);
      setTimeout(() => imgB.onload?.(new Event('load')), 10);

      const [rA, rB] = await Promise.all([resolveImage(srcA), resolveImage(srcB)]);

      expect(rA.src).toBe(srcA);
      expect(rA.width).toBe(10);
      expect(rA.height).toBe(20);

      expect(rB.src).toBe(srcB);
      expect(rB.width).toBe(30);
      expect(rB.height).toBe(40);
    });
  });
});