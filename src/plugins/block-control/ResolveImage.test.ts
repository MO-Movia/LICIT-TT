import { resolveImage, isImgInstance } from './ResolveImage';
import type { ImageResult } from './ResolveImage';

// Mock dependencies
jest.mock('url', () => ({
    parse: jest.fn((src) => new URL(src)),
}));

describe('Image Resolver Module', () => {
    beforeEach(() => {
        document.body.innerHTML = ''; // Reset DOM
        (window.navigator as any).__defineGetter__('onLine', () => true); // Simulate online
    });

    describe('isImgInstance', () => {
        it('returns true for HTML elements', () => {
            const el = document.createElement('div');
            expect(isImgInstance(el)).toBe(true);
        });

        it('returns false for non-elements', () => {
            expect(isImgInstance({})).toBe(false);
            expect(isImgInstance(null)).toBe(false);
            expect(isImgInstance(undefined)).toBe(false);
        });
    });

    describe('resolveImage', () => {
        it('resolves with result if offline', async () => {
            (window.navigator as any).__defineGetter__('onLine', () => false);
            const result = await resolveImage('https://example.com/test.jpg');
            expect(result).toEqual(
                expect.objectContaining({
                    complete: false,
                    height: 0,
                    naturalHeight: 0,
                    naturalWidth: 0,
                    src: 'https://example.com/test.jpg',
                    width: 0,
                })
            );
        });

        it('resolves with image dimensions on load', async () => {
            const src = 'https://example.com/image.jpg';
            const img = new Image();
            Object.defineProperty(img, 'width', { value: 100 });
            Object.defineProperty(img, 'height', { value: 200 });

            jest.spyOn(document, 'createElement').mockImplementation(() => img as any);
            const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => img);

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

            appendSpy.mockRestore();
        });

        it('resolves with default result on error', async () => {
            const src = 'https://example.com/invalid.jpg';
            const img = new Image();

            jest.spyOn(document, 'createElement').mockImplementation(() => img as any);
            const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => img);

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

            appendSpy.mockRestore();
        });


        it('skips resolution if unsupported protocol', async () => {
            const src = 'ftp://example.com/file.png';

            const result = await resolveImage(src);
            expect(result.src).toBe(src);
            expect(result.complete).toBe(false);
        });
    });
});
