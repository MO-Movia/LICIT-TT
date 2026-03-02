/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { getAnItem, removeAnItem, Item } from './item';

// Supporting class for CapcoEmbeddedActionsParser
// A generic class to handle all compartment types.
export class Compartment {
  name: string;
  values: Item[];

  constructor(name: string) {
    this.name = name; // Used to display as header.
    this.values = []; // Array<Item>
  }

  addItem(item: Item): void {
    this.values.push(item);
  }

  removeItem(code: string): void {
    this.values = removeAnItem(code, this.getItem.bind(this), this.values);
  }

  getItem(code: string): Item | undefined {
    return getAnItem(code, this.values, this.checkCode);
  }

  checkCode(item: Item, code: string): boolean {
    return item.code === code;
  }
}
