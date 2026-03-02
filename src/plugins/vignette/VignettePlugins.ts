/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {VignettePlugin} from './VignettePlugin';
import {VignetteMenuPlugin }from './VignetteMenuPlugin';

export const VignettePlugins =  [
  new VignetteMenuPlugin(),
  new VignettePlugin(),
];
