/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

/**
 * Generates a new Object ID in
 * @param {String} namespace optional URI to override default namespace.
 * @returns generated UUID
 */
export function createObjectId(namespace: string | null | undefined = '', suffix = ''): string {
  const namespaceString = namespace || '';
  const suffixString = suffix || '';
  return `${namespaceString}${crypto.randomUUID()}${suffixString}`;
}

