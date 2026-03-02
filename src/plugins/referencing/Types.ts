/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Fragment } from 'prosemirror-model';

/**
 * Function that takes the reference id and returns a Promise that
 * contains either an html element to use, or a Prosemirror JSON (object or string) to use as the reference context
 */
export type getFragment = (
  id: string
) => Promise<globalThis.Node | Fragment | string>;
export interface ReferencingPluginOptions {
  fetchReference?: getFragment;
}
