/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export function clamp(min: number, val: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
