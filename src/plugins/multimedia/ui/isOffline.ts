/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export function isOffline(): boolean {
  if (Object.hasOwn(globalThis.navigator, 'onLine')) {
    return !globalThis.navigator.onLine;
  }
  return false;
}
