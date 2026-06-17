/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

const NUMERIC_VALUE_PATTERN = /^-?\d{1,10}(\.\d{1,10})?$/;

export const normalizeValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalized = `${value}`.trim();
  return normalized.length ? normalized : null;
};

export const normalizeCssSize = (value: unknown): string | null => {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  return NUMERIC_VALUE_PATTERN.test(normalized)
    ? `${normalized}px`
    : normalized;
};
