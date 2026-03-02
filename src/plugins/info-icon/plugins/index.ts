/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { history } from 'prosemirror-history';
import keys from './keys';
import menu from './menu';

export const plugins = [
  history(),
  keys(),
  menu()
];
