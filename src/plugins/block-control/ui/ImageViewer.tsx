/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import {useEffect, useRef} from 'react';

export type ImageViewerProps = {
  figureType: string;
  nodeViewDom: HTMLElement;
  onClose: () => void;
  originalHeight?: number;
  originalWidth?: number;
};

const PIXEL_STYLE_PROPERTIES = ['height', 'left', 'top', 'width'] as const;

function toPositiveNumber(value: unknown): number | undefined {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function scalePixelStyles(element: HTMLElement, scale: number): void {
  if (!Number.isFinite(scale) || scale === 1) {
    return;
  }

  for (const property of PIXEL_STYLE_PROPERTIES) {
    const value = toFiniteNumber(element.style[property]);
    if (value !== undefined) {
      element.style[property] = `${value * scale}px`;
    }
  }
}

function expandImage(
  root: HTMLElement,
  originalWidth?: number,
  originalHeight?: number
): number {
  const image = root.querySelector<HTMLImageElement>(
    '.molm-czi-image-view-body-img'
  );
  if (!image) {
    return originalWidth || 0;
  }

  const renderedWidth =
    toPositiveNumber(image.getAttribute('width')) ||
    toPositiveNumber(image.width) ||
    toPositiveNumber(image.getBoundingClientRect().width);
  const width =
    originalWidth ||
    toPositiveNumber(image.naturalWidth) ||
    renderedWidth ||
    0;
  const height =
    originalHeight ||
    (width && image.naturalWidth && image.naturalHeight
      ? (width * image.naturalHeight) / image.naturalWidth
      : toPositiveNumber(image.getAttribute('height')) ||
        toPositiveNumber(image.height));

  if (!width) {
    return 0;
  }

  const scale = renderedWidth ? width / renderedWidth : 1;
  const imageCanvas = image.parentElement;
  const imageClip = image.closest<HTMLElement>(
    '.molm-czi-image-view-body-img-clip'
  );
  const imageBody = image.closest<HTMLElement>('.molm-czi-image-view-body');

  for (const element of [image, imageCanvas, imageClip, imageBody]) {
    if (element) {
      scalePixelStyles(element, scale);
    }
  }

  image.width = width;
  image.style.width = `${width}px`;
  image.style.maxWidth = 'none';
  if (height) {
    image.height = height;
    image.style.height = `${height}px`;
  } else {
    image.removeAttribute('height');
    image.style.height = 'auto';
  }

  if (imageCanvas) {
    imageCanvas.style.width = `${width}px`;
    if (height) {
      imageCanvas.style.height = `${height}px`;
    }
  }

  return width;
}

function expandTable(root: HTMLElement, originalWidth?: number): number {
  const table = root.querySelector<HTMLTableElement>('table');
  if (!table) {
    return originalWidth || 0;
  }

  const columns = Array.from(table.querySelectorAll('col'));
  columns.forEach((column) => {
    const savedWidth = toPositiveNumber(column.dataset.eicOriginalWidth);
    if (savedWidth) {
      column.style.width = `${savedWidth}px`;
    }
  });
  const savedTableWidth = toPositiveNumber(table.dataset.eicOriginalWidth);
  const width =
    originalWidth ||
    savedTableWidth ||
    toPositiveNumber(table.scrollWidth) ||
    toPositiveNumber(table.getBoundingClientRect().width) ||
    0;
  if (width) {
    table.style.width = `${width}px`;
    table.style.minWidth = `${width}px`;
  }
  table.style.maxWidth = 'none';
  table.style.tableLayout = 'fixed';
  return width;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  figureType,
  nodeViewDom,
  onClose,
  originalHeight,
  originalWidth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const contentWidth =
      figureType === 'table'
        ? expandTable(nodeViewDom, originalWidth)
        : expandImage(nodeViewDom, originalWidth, originalHeight);

    nodeViewDom.style.width = contentWidth ? `${contentWidth}px` : 'max-content';
    nodeViewDom.style.maxWidth = 'none';
    container.appendChild(nodeViewDom);

    return () => {
      nodeViewDom.remove();
    };
  }, [figureType, nodeViewDom, originalHeight, originalWidth]);

  return (
    <div
      aria-label={`Full-size EIC ${figureType}`}
      className="enhanced-table-figure-viewer"
      role="document"
    >
      <button
        aria-label="Close full-size EIC view"
        className="enhanced-table-figure-viewer-close"
        onClick={onClose}
        type="button"
      >
        &#x2715;
      </button>
      <div
        className="enhanced-table-figure-viewer-content"
        ref={containerRef}
      />
    </div>
  );
};
