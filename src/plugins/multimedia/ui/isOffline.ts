export function isOffline(): boolean {
  if (Object.hasOwn(globalThis.navigator, 'onLine')) {
    return !globalThis.navigator.onLine;
  }
  return false;
}
