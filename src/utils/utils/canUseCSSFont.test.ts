/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import canUseCSSFont, { initMaterialIconsFonts } from './canUseCSSFont';

describe('canUseCSSFont', () => {
  let originalFonts: FontFaceSet;
  const setDocumentFonts = (value: FontFaceSet | undefined): void => {
    Object.defineProperty(document, 'fonts', {
      value,
      configurable: true,
    });
  };

  beforeEach(() => {
    // Store the original `document.fonts`
    originalFonts = document.fonts;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    // Restore the original `document.fonts`
    setDocumentFonts(originalFonts);
    jest.useRealTimers();
  });

  it('should return false if FontFaceSet API is not supported (doc.fonts is undefined)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setDocumentFonts(undefined);

    const result = await canUseCSSFont('NoFontsAPI');

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('FontFaceSet is not supported');
  });

  it('should return false if doc.fonts.check is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setDocumentFonts({
      status: 'loaded',
      ready: Promise.resolve(),
      values: jest.fn(),
    } as unknown as FontFaceSet);

    const result = await canUseCSSFont('NoCheckFont');

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('FontFaceSet is not supported');
  });

  it('should return false if doc.fonts.status is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setDocumentFonts({
      check: jest.fn(),
      ready: Promise.resolve(),
      values: jest.fn(),
    } as unknown as FontFaceSet);

    const result = await canUseCSSFont('NoStatusFont');

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('FontFaceSet is not supported');
  });

  it('should return false if doc.fonts.values is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setDocumentFonts({
      check: jest.fn(),
      status: 'loaded',
      ready: Promise.resolve(),
    } as unknown as FontFaceSet);

    const result = await canUseCSSFont('NoValuesFont');

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('FontFaceSet is not supported');
  });

  it("should return false if 'ready' is not present in doc.fonts", async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setDocumentFonts({
      check: jest.fn(),
      status: 'loaded',
      values: jest.fn(),
    } as unknown as FontFaceSet);

    const result = await canUseCSSFont('NoReadyFont');

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('FontFaceSet is not supported');
  });

  it('should return true if the requested font is available', async () => {
    const mockFont = { family: 'AvailableFont' } as unknown as FontFace;
    const mockFonts: Partial<FontFaceSet> = {
      check: jest.fn(),
      status: 'loaded',
      ready: Promise.resolve({} as FontFaceSet),
      values: jest.fn(() => new Set([mockFont]).values()),
    };

    setDocumentFonts(mockFonts as FontFaceSet);

    const result = await canUseCSSFont('AvailableFont');
    expect(result).toBe(true);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);
  });

  it('should return false if the font set is empty', async () => {
    const mockFonts: Partial<FontFaceSet> = {
      check: jest.fn(),
      status: 'loaded',
      ready: Promise.resolve({} as FontFaceSet),
      values: jest.fn(() => new Set<FontFace>().values()),
    };

    setDocumentFonts(mockFonts as FontFaceSet);

    const result = await canUseCSSFont('MissingFont');
    expect(result).toBe(false);
  });

  it('should return false if the font set contains other fonts but not the requested one', async () => {
    const otherFont = { family: 'SomeOtherFont' } as unknown as FontFace;
    const mockFonts: Partial<FontFaceSet> = {
      check: jest.fn(),
      status: 'loaded',
      ready: Promise.resolve({} as FontFaceSet),
      values: jest.fn(() => new Set([otherFont]).values()),
    };

    setDocumentFonts(mockFonts as FontFaceSet);

    const result = await canUseCSSFont('UnmatchedFont');
    expect(result).toBe(false);
  });

  it("should wait for fonts to load if status is initially 'loading'", async () => {
    let status = 'loading';

    setDocumentFonts({
      check: jest.fn().mockReturnValue(true),
      ready: Promise.resolve().then(() => {
        status = 'loaded'; // Simulate async status update
      }),
      get status() {
        return status;
      },
      values: jest.fn().mockReturnValue([{ family: 'LoadingFont' }]),
    } as unknown as FontFaceSet);

    const result = await canUseCSSFont('LoadingFont');
    expect(result).toBe(true);
  });

  it("should use setTimeout and wait for status to change from 'loading' to 'loaded'", async () => {
    jest.useFakeTimers();

    let status = 'loading';
    const FONT_NAME = 'DelayedFont';
    const loadDelay = 350;

    // Manually control when ready resolves
    let readyResolve!: () => void;
    const readyPromise = new Promise<void>(
      (resolve) => (readyResolve = resolve)
    );

    const mockFonts = {
      check: jest.fn().mockReturnValue(true),
      ready: readyPromise,
      get status() {
        return status;
      },
      values: jest.fn().mockReturnValue([{ family: FONT_NAME }]),
    };

    setDocumentFonts(mockFonts as unknown as FontFaceSet);

    const promise = canUseCSSFont(FONT_NAME);
    readyResolve();

    await Promise.resolve(); // let the check() run once
    expect(mockFonts.status).toBe('loading');

    jest.advanceTimersByTime(loadDelay - 1);
    status = 'loaded';
    jest.advanceTimersByTime(1);

    await Promise.resolve();
    await Promise.resolve();

    const result = await promise;

    expect(result).toBe(true);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it("should retry via setTimeout multiple times while status remains 'loading'", async () => {
    jest.useFakeTimers();

    let status = 'loading';
    const FONT_NAME = 'MultiRetryFont';

    const mockFonts = {
      check: jest.fn().mockReturnValue(true),
      ready: Promise.resolve(),
      get status() {
        return status;
      },
      values: jest.fn().mockReturnValue([{ family: FONT_NAME }]),
    };

    setDocumentFonts(mockFonts as unknown as FontFaceSet);

    const promise = canUseCSSFont(FONT_NAME);

    // Flush the initial ready.then(check)
    await Promise.resolve();
    await Promise.resolve();

    // First retry: still loading
    jest.advanceTimersByTime(350);
    expect(status).toBe('loading');

    // Second retry: still loading
    jest.advanceTimersByTime(350);
    expect(status).toBe('loading');

    // Flip to loaded and let the next setTimeout fire
    status = 'loaded';
    jest.advanceTimersByTime(350);

    await Promise.resolve();
    await Promise.resolve();

    const result = await promise;

    expect(result).toBe(true);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('should resolve to false and log an error if doc.fonts.ready rejects', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('Font loading failed');

    const mockFonts: Partial<FontFaceSet> = {
      check: jest.fn(),
      status: 'loaded',
      ready: Promise.reject(failure),
      values: jest.fn(() => new Set<FontFace>().values()),
    };

    setDocumentFonts(mockFonts as FontFaceSet);

    const result = await canUseCSSFont('RejectedFont');

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      'Font loading check failed:',
      failure
    );
    // values() should never be called because we never reached the check() body
    expect(mockFonts.values).not.toHaveBeenCalled();
  });

  it('should return cached true result on subsequent calls for the same font', async () => {
    const FONT_NAME = 'CachedTrueFont';
    const mockFont = { family: FONT_NAME } as unknown as FontFace;

    const mockFonts: Partial<FontFaceSet> = {
      check: jest.fn(() => true),
      status: 'loaded',
      ready: Promise.resolve({} as FontFaceSet),
      values: jest.fn(() => [mockFont].values()),
    };

    setDocumentFonts(mockFonts as FontFaceSet);

    // First call - should check fonts and cache the result
    const result1 = await canUseCSSFont(FONT_NAME);
    expect(result1).toBe(true);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);

    // Second call - should return cached result without checking fonts again
    const result2 = await canUseCSSFont(FONT_NAME);
    expect(result2).toBe(true);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);

    // Third call - verify cache is still being used
    const result3 = await canUseCSSFont(FONT_NAME);
    expect(result3).toBe(true);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);
  });

  it('should cache a false result and return it on subsequent calls', async () => {
    const FONT_NAME = 'CachedFalseFont';

    const mockFonts: Partial<FontFaceSet> = {
      check: jest.fn(() => false),
      status: 'loaded',
      ready: Promise.resolve({} as FontFaceSet),
      values: jest.fn(() => new Set<FontFace>().values()),
    };

    setDocumentFonts(mockFonts as FontFaceSet);

    const result1 = await canUseCSSFont(FONT_NAME);
    expect(result1).toBe(false);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);

    // Subsequent call should hit the cache and not invoke values() again
    const result2 = await canUseCSSFont(FONT_NAME);
    expect(result2).toBe(false);
    expect(mockFonts.values).toHaveBeenCalledTimes(1);
  });

  it('should keep caches isolated between different font names', async () => {
    const FONT_A = 'IsolatedFontA';
    const FONT_B = 'IsolatedFontB';

    const mockFontA = { family: FONT_A } as unknown as FontFace;

    const mockFonts: Partial<FontFaceSet> = {
      check: jest.fn(() => true),
      status: 'loaded',
      ready: Promise.resolve({} as FontFaceSet),
      values: jest.fn(() => [mockFontA].values()),
    };

    setDocumentFonts(mockFonts as FontFaceSet);

    const resultA = await canUseCSSFont(FONT_A);
    expect(resultA).toBe(true);

    const resultB = await canUseCSSFont(FONT_B);
    expect(resultB).toBe(false);

    expect(mockFonts.values).toHaveBeenCalledTimes(2);
  });

  it('should handle callback', async () => {
    const callback = jest.fn();
    // wait out micro-queue
    await new Promise<void>((resolve) => {
      callback.mockImplementation(resolve);
      initMaterialIconsFonts(callback);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
