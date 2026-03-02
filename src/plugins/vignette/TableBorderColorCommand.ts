/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {TableColorCommand} from './ui/TableColorCommand';

export class TableBorderColorCommand extends TableColorCommand {
  getAttrName = (): string => {
    return 'borderColor';
  };
}
