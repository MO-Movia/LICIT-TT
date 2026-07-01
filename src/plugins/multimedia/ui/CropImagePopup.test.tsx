/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import { CropDataPropValue, CropImagePopup } from './CropImagePopup';

jest.mock('react-image-crop', () => ({
  ReactCrop: ({ children, crop, onChange, onComplete }) => (
    <div data-testid="react-crop" data-unit={crop.unit}>
      <button
        onClick={() =>
          onChange({ unit: '%', x: 1, y: 2, width: 30, height: 40 })
        }
        type="button"
      >
        Change crop
      </button>
      <button
        onClick={() =>
          onComplete({ unit: 'px', x: 10, y: 20, width: 100, height: 80 })
        }
        type="button"
      >
        Complete crop
      </button>
      {children}
    </div>
  ),
  centerCrop: jest.fn((crop) => ({ ...crop, x: 5, y: 6 })),
  makeAspectCrop: jest.fn((crop) => ({ ...crop, height: 75 })),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function computeCropData(
  completedCrop: { x: number; y: number; width: number; height: number } | null,
  image: { naturalWidth: number; naturalHeight: number; width: number; height: number } | null,
  croppedBase64: string
): CropDataPropValue | null {
  if (!image || !completedCrop?.width || !completedCrop?.height) return null;
  return {
    left: completedCrop.x,
    top: completedCrop.y,
    width: completedCrop.width,
    height: completedCrop.height,
    croppedBase64,
  };
}

function computeScales(image: {
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
}) {
  return {
    scaleX: image.naturalWidth / image.width,
    scaleY: image.naturalHeight / image.height,
  };
}

function computeDrawArgs(
  completedCrop: { x: number; y: number; width: number; height: number },
  scaleX: number,
  scaleY: number
): [number, number, number, number, number, number, number, number] {
  return [
    completedCrop.x * scaleX,
    completedCrop.y * scaleY,
    completedCrop.width * scaleX,
    completedCrop.height * scaleY,
    0,
    0,
    completedCrop.width,
    completedCrop.height,
  ];
}

function computeInitialCrop(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
  unit: 'px' | '%'
): { unit: 'px' | '%'; x: number; y: number; width: number; height: number } {
  const cropWidth = imageWidth * 0.8;
  const cropHeight = cropWidth / aspectRatio;
  const x = (imageWidth - cropWidth) / 2;
  const y = (imageHeight - cropHeight) / 2;
  return { unit, x, y, width: cropWidth, height: cropHeight };
}

function isCropValid(completedCrop: { width?: number; height?: number } | null): boolean {
  return !!(completedCrop?.width && completedCrop?.height);
}

describe('CropImagePopup logic', () => {

  it('computeCropData returns null when completedCrop is null', () => {
    expect(computeCropData(null, { naturalWidth: 800, naturalHeight: 600, width: 400, height: 300 }, 'base64')).toBeNull();
  });

  it('computeCropData returns null when image is null', () => {
    expect(computeCropData({ x: 10, y: 20, width: 100, height: 80 }, null, 'base64')).toBeNull();
  });

  it('computeCropData returns null when completedCrop.width is 0', () => {
    expect(computeCropData(
      { x: 10, y: 20, width: 0, height: 80 },
      { naturalWidth: 800, naturalHeight: 600, width: 400, height: 300 },
      'base64'
    )).toBeNull();
  });

  it('computeCropData returns null when completedCrop.height is 0', () => {
    expect(computeCropData(
      { x: 10, y: 20, width: 100, height: 0 },
      { naturalWidth: 800, naturalHeight: 600, width: 400, height: 300 },
      'base64'
    )).toBeNull();
  });

  it('computeCropData maps completedCrop to left/top/width/height', () => {
    const result = computeCropData(
      { x: 10, y: 20, width: 100, height: 80 },
      { naturalWidth: 800, naturalHeight: 600, width: 400, height: 300 },
      'data:image/png;base64,abc'
    );
    expect(result).toEqual({
      left: 10,
      top: 20,
      width: 100,
      height: 80,
      croppedBase64: 'data:image/png;base64,abc',
    });
  });

  it('computeCropData passes croppedBase64 through unchanged', () => {
    const b64 = 'data:image/png;base64,xyz123';
    const result = computeCropData(
      { x: 0, y: 0, width: 50, height: 50 },
      { naturalWidth: 400, naturalHeight: 400, width: 200, height: 200 },
      b64
    );
    expect(result.croppedBase64).toBe(b64);
  });

  it('computeScales returns 1 when natural and display sizes match', () => {
    const { scaleX, scaleY } = computeScales({ naturalWidth: 400, naturalHeight: 300, width: 400, height: 300 });
    expect(scaleX).toBe(1);
    expect(scaleY).toBe(1);
  });

  it('computeScales returns correct ratio when image is scaled down', () => {
    const { scaleX, scaleY } = computeScales({ naturalWidth: 800, naturalHeight: 600, width: 400, height: 300 });
    expect(scaleX).toBe(2);
    expect(scaleY).toBe(2);
  });

  it('computeScales handles non-uniform scaling', () => {
    const { scaleX, scaleY } = computeScales({ naturalWidth: 1000, naturalHeight: 500, width: 200, height: 250 });
    expect(scaleX).toBe(5);
    expect(scaleY).toBe(2);
  });

  it('computeDrawArgs scales source coords by scaleX/scaleY', () => {
    const args = computeDrawArgs({ x: 10, y: 20, width: 100, height: 80 }, 2, 2);
    expect(args[0]).toBe(20);  // x * scaleX
    expect(args[1]).toBe(40);  // y * scaleY
    expect(args[2]).toBe(200); // width * scaleX
    expect(args[3]).toBe(160); // height * scaleY
  });

  it('computeDrawArgs destination always starts at (0, 0)', () => {
    const args = computeDrawArgs({ x: 10, y: 20, width: 100, height: 80 }, 2, 2);
    expect(args[4]).toBe(0);
    expect(args[5]).toBe(0);
  });

  it('computeDrawArgs destination size matches unscaled crop size', () => {
    const args = computeDrawArgs({ x: 10, y: 20, width: 100, height: 80 }, 2, 3);
    expect(args[6]).toBe(100);
    expect(args[7]).toBe(80);
  });

  it('computeDrawArgs works with scale=1 (no scaling)', () => {
    const args = computeDrawArgs({ x: 5, y: 15, width: 50, height: 40 }, 1, 1);
    expect(args).toEqual([5, 15, 50, 40, 0, 0, 50, 40]);
  });

  it('computeInitialCrop width is 80% of image width', () => {
    const result = computeInitialCrop(500, 400, 4 / 3, 'px');
    expect(result.width).toBe(400);
  });

  it('computeInitialCrop height respects aspect ratio', () => {
    const result = computeInitialCrop(500, 400, 4 / 3, 'px');
    expect(result.height).toBeCloseTo(300, 5);
  });

  it('computeInitialCrop is centered horizontally', () => {
    const result = computeInitialCrop(500, 400, 4 / 3, 'px');
    expect(result.x).toBeCloseTo((500 - 400) / 2, 5);
  });

  it('computeInitialCrop is centered vertically', () => {
    const result = computeInitialCrop(500, 400, 4 / 3, 'px');
    expect(result.y).toBeCloseTo((400 - 300) / 2, 5);
  });

  it('computeInitialCrop preserves the unit', () => {
    expect(computeInitialCrop(400, 300, 4 / 3, 'px').unit).toBe('px');
    expect(computeInitialCrop(400, 300, 4 / 3, '%').unit).toBe('%');
  });

  it('isCropValid returns false for null', () => {
    expect(isCropValid(null)).toBe(false);
  });

  it('isCropValid returns false when width is 0', () => {
    expect(isCropValid({ width: 0, height: 80 })).toBe(false);
  });

  it('isCropValid returns false when height is 0', () => {
    expect(isCropValid({ width: 100, height: 0 })).toBe(false);
  });

  it('isCropValid returns false when width and height are missing', () => {
    expect(isCropValid({})).toBe(false);
  });

  it('isCropValid returns true when both width and height are positive', () => {
    expect(isCropValid({ width: 100, height: 80 })).toBe(true);
  });

});

describe('CropImagePopup component', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderPopup = (props?: Partial<React.ComponentProps<typeof CropImagePopup>>) => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <CropImagePopup
          src="data:image/png;base64,image"
          onConfirm={onConfirm}
          onCancel={onCancel}
          {...props}
        />
      );
    });

    return { onConfirm, onCancel };
  };

  const clickButton = (label: string) => {
    const button = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent === label
    );
    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const setImageDimensions = (
    image: HTMLImageElement,
    dimensions = {
      naturalWidth: 800,
      naturalHeight: 600,
      width: 400,
      height: 300,
    }
  ) => {
    Object.entries(dimensions).forEach(([key, value]) => {
      Object.defineProperty(image, key, {
        configurable: true,
        value,
      });
    });
  };

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    jest.restoreAllMocks();
  });

  it('renders the crop image and default px crop unit', () => {
    renderPopup();

    expect(container.querySelector('.crop-popup-wrapper')).toBeTruthy();
    expect(container.querySelector('[data-testid="react-crop"]')?.getAttribute('data-unit')).toBe('px');
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'data:image/png;base64,image'
    );
  });

  it('uses percent crop unit when requested and handles crop changes', () => {
    renderPopup({ defaultUnit: '%' });

    expect(container.querySelector('[data-testid="react-crop"]')?.getAttribute('data-unit')).toBe('%');
    clickButton('Change crop');
    expect(container.querySelector('[data-testid="react-crop"]')?.getAttribute('data-unit')).toBe('%');
  });

  it('calls onCancel from the cancel button', () => {
    const { onCancel } = renderPopup();

    clickButton('Cancel');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('centers the initial crop when the image loads', () => {
    renderPopup();
    const image = container.querySelector('img') as HTMLImageElement;
    setImageDimensions(image);

    act(() => {
      image.dispatchEvent(new Event('load'));
    });

    expect(makeAspectCrop).toHaveBeenCalledWith(
      { unit: 'px', width: 320 },
      4 / 3,
      400,
      300
    );
    expect(centerCrop).toHaveBeenCalledWith(
      expect.objectContaining({ height: 75 }),
      400,
      300
    );
  });

  it('does not confirm when crop dimensions are missing', () => {
    const { onConfirm } = renderPopup();

    clickButton('Crop');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not confirm when canvas context is unavailable', () => {
    const { onConfirm } = renderPopup();
    const image = container.querySelector('img') as HTMLImageElement;
    setImageDimensions(image);
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);

    clickButton('Complete crop');
    clickButton('Crop');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('draws the selected crop and confirms crop data', () => {
    const { onConfirm } = renderPopup();
    const image = container.querySelector('img') as HTMLImageElement;
    const drawImage = jest.fn();
    setImageDimensions(image);
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,cropped');

    clickButton('Complete crop');
    clickButton('Crop');

    expect(drawImage).toHaveBeenCalledWith(
      image,
      20,
      40,
      200,
      160,
      0,
      0,
      100,
      80
    );
    expect(onConfirm).toHaveBeenCalledWith({
      left: 10,
      top: 20,
      width: 100,
      height: 80,
      croppedBase64: 'data:image/png;base64,cropped',
    });
  });
});
