/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { v4 } from 'uuid';

/**
 * Generates a new Object ID in
 * @param {String} namespace optional URI to override default namespace.
 * @returns generated UUID
 */
export function createObjectId(namespace: string | null | undefined = '', suffix = ''): string {
  const namespaceString = namespace || '';
  const suffixString = suffix || '';
  return `${namespaceString}${v4()}${suffixString}`;
}


