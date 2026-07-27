/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React, {useEffect, useId, useRef, useState} from 'react';

import {UICommand} from '../../../core';
import {
  MAX_SIZE as MAX_DIMENSION,
  MIN_SIZE as MIN_DIMENSION,
} from './ImageResizeBox';

export type ImageSizeFitEditorProps = {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  maxWidth: number;
  canReset: boolean;
  onApply: (width: number, height: number) => void;
  onCancel: () => void;
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function resolveRatio(
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number
): number {
  if (isPositiveFinite(width) && isPositiveFinite(height)) {
    return width / height;
  }
  if (isPositiveFinite(originalWidth) && isPositiveFinite(originalHeight)) {
    return originalWidth / originalHeight;
  }
  return 1;
}

function toDimension(value: number, fallback = MIN_DIMENSION): number {
  const candidate = isPositiveFinite(value) ? Math.round(value) : fallback;
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, candidate));
}

function toBoundedSize(
  width: number,
  height: number,
  fallbackWidth = MIN_DIMENSION,
  fallbackHeight = MIN_DIMENSION
): {width: number; height: number} {
  const nextWidth = isPositiveFinite(width)
    ? Math.round(width)
    : toDimension(fallbackWidth);
  const nextHeight = isPositiveFinite(height)
    ? Math.round(height)
    : toDimension(fallbackHeight);
  const scale = Math.min(
    1,
    MAX_DIMENSION / nextWidth,
    MAX_DIMENSION / nextHeight
  );
  return {
    width: Math.max(MIN_DIMENSION, Math.round(nextWidth * scale)),
    height: Math.max(MIN_DIMENSION, Math.round(nextHeight * scale)),
  };
}

function parseDraft(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidDraft(value: string): boolean {
  const parsed = parseDraft(value);
  return (
    parsed !== null && parsed >= MIN_DIMENSION && parsed <= MAX_DIMENSION
  );
}

function linkedDraft(value: number): string {
  return String(Math.max(1, Math.round(value)));
}

export function ImageSizeFitEditor({
  width,
  height,
  originalWidth,
  originalHeight,
  maxWidth,
  canReset,
  onApply,
  onCancel,
}: Readonly<ImageSizeFitEditorProps>): React.ReactElement {
  const initialRatio = resolveRatio(
    width,
    height,
    originalWidth,
    originalHeight
  );
  const initialSize = toBoundedSize(
    width,
    height,
    originalWidth,
    originalHeight
  );
  const [widthDraft, setWidthDraft] = useState(() =>
    String(initialSize.width)
  );
  const [heightDraft, setHeightDraft] = useState(() =>
    String(initialSize.height)
  );
  const [locked, setLocked] = useState(true);
  const [ratio, setRatio] = useState(initialRatio);
  const widthInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const validationId = useId();
  const theme = UICommand.theme === 'dark' ? 'dark' : 'light';
  const widthValid = isValidDraft(widthDraft);
  const heightValid = isValidDraft(heightDraft);
  const valid = widthValid && heightValid;
  const widthInputClassName = widthValid
    ? 'czi-image-size-fit-input'
    : 'czi-image-size-fit-input invalid';
  const heightInputClassName = heightValid
    ? 'czi-image-size-fit-input'
    : 'czi-image-size-fit-input invalid';
  const validationDescription = valid ? undefined : validationId;
  const validationMessage = valid ? null : (
    <p className="czi-image-size-fit-validation" id={validationId}>
      Enter whole-pixel dimensions from 20 to 10,000 px.
    </p>
  );

  useEffect(() => {
    widthInputRef.current?.focus();
    widthInputRef.current?.select();
  }, []);

  const getDraftRatio = (): number => {
    const draftWidth = parseDraft(widthDraft);
    const draftHeight = parseDraft(heightDraft);
    return draftWidth && draftHeight ? draftWidth / draftHeight : ratio;
  };

  const changeWidth = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextDraft = event.currentTarget.value;
    if (nextDraft && !/^\d+$/.test(nextDraft)) {
      return;
    }
    setWidthDraft(nextDraft);
    const nextWidth = parseDraft(nextDraft);
    if (locked && nextWidth !== null) {
      setHeightDraft(linkedDraft(nextWidth / ratio));
    }
  };

  const changeHeight = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextDraft = event.currentTarget.value;
    if (nextDraft && !/^\d+$/.test(nextDraft)) {
      return;
    }
    setHeightDraft(nextDraft);
    const nextHeight = parseDraft(nextDraft);
    if (locked && nextHeight !== null) {
      setWidthDraft(linkedDraft(nextHeight * ratio));
    }
  };

  const toggleLock = (): void => {
    if (!locked) {
      setRatio(getDraftRatio());
    }
    setLocked(!locked);
  };

  const fitWidth = (): void => {
    const nextRatio = locked ? ratio : getDraftRatio();
    const nextWidth = toDimension(maxWidth, toDimension(width));
    const nextSize = toBoundedSize(
      nextWidth,
      nextWidth / nextRatio,
      width,
      height
    );
    setRatio(nextRatio);
    setLocked(true);
    setWidthDraft(String(nextSize.width));
    setHeightDraft(String(nextSize.height));
  };

  const resetImage = (): void => {
    if (!canReset) {
      return;
    }
    const nextSize = toBoundedSize(
      originalWidth,
      originalHeight,
      width,
      height
    );
    setRatio(
      resolveRatio(
        nextSize.width,
        nextSize.height,
        originalWidth,
        originalHeight
      )
    );
    setLocked(true);
    setWidthDraft(String(nextSize.width));
    setHeightDraft(String(nextSize.height));
  };

  const cancel = (): void => {
    onCancel();
  };

  const apply = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!valid) {
      return;
    }
    onApply(Number(widthDraft), Number(heightDraft));
  };

  return (
    <form
      aria-labelledby={titleId}
      className={`czi-image-size-fit ${theme}`}
      onSubmit={apply}
    >
      <header className="czi-image-size-fit-header">
        <div>
          <h2 id={titleId}>Size &amp; Fit</h2>
          <p>Set exact pixel dimensions or fit the image to the workspace.</p>
        </div>
        <button
          aria-label="Close Size & fit"
          className="czi-image-size-fit-close"
          onClick={cancel}
          type="button"
        >
          &times;
        </button>
      </header>

      <div className="czi-image-size-fit-content">
        <div className="czi-image-size-fit-dimensions">
          <label className="czi-image-size-fit-field">
            <span>WIDTH (X)</span>
            <span className={widthInputClassName}>
              <input
                aria-describedby={validationDescription}
                aria-invalid={widthValid === false}
                autoFocus={true}
                inputMode="numeric"
                max={MAX_DIMENSION}
                min={MIN_DIMENSION}
                onChange={changeWidth}
                ref={widthInputRef}
                step={1}
                type="number"
                value={widthDraft}
              />
              <span aria-hidden="true">px</span>
            </span>
          </label>

          <button
            aria-label={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
            aria-pressed={locked}
            className={
              'czi-image-size-fit-lock' + (locked ? ' locked' : '')
            }
            onClick={toggleLock}
            title={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
            type="button"
          >
            <i
              aria-hidden="true"
              className={`fa ${locked ? 'fa-link' : 'fa-chain-broken'}`}
            />
          </button>

          <label className="czi-image-size-fit-field">
            <span>HEIGHT (Y)</span>
            <span className={heightInputClassName}>
              <input
                aria-describedby={validationDescription}
                aria-invalid={heightValid === false}
                inputMode="numeric"
                max={MAX_DIMENSION}
                min={MIN_DIMENSION}
                onChange={changeHeight}
                step={1}
                type="number"
                value={heightDraft}
              />
              <span aria-hidden="true">px</span>
            </span>
          </label>
        </div>

        {validationMessage}

        <div className="czi-image-size-fit-actions">
          <button onClick={fitWidth} type="button">
            <i aria-hidden="true" className="fa fa-arrows-h" />
            <span>Fit Width</span>
          </button>
          <button disabled={canReset === false} onClick={resetImage} type="button">
            Reset Image
          </button>
        </div>

        <div className="czi-image-size-fit-info">
          <i aria-hidden="true" className="fa fa-info-circle" />
          <span>
            With aspect lock enabled, editing either dimension calculates the
            other automatically.
          </span>
        </div>
      </div>

      <footer className="czi-image-size-fit-footer">
        <button onClick={cancel} type="button">
          Cancel
        </button>
        <button className="primary" disabled={valid === false} type="submit">
          Apply
        </button>
      </footer>
    </form>
  );
}
