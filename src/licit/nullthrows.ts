/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

/**
 * Throws if value is null or undefined, otherwise returns value.
 */
export default function nullthrows<T>(value?: T | null, message?: string): T {
  if (value == null) {
    throw new Error(message ?? `Got unexpected ${String(value)}`);
  }
  return value;
}
