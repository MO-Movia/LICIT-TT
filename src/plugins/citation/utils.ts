
/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export function toISOString(date: Date): string {
  return date.getUTCFullYear().toString().padStart(4, '0') +
    '-' +
    (date.getUTCMonth() + 1).toString().padStart(2, '0') +
    '-' +
    date.getUTCDate().toString().padStart(2, '0');
}