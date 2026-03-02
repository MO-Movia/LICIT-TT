/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

// Supporting class for CapcoEmbeddedActionsParser
// Represents each code - description row in the compartment.
export class Item {
  code: string;
  description: string;
  order: number;
  display: string;
  // If children is there, treated as disabled parent like SCI
  children: Item[];

  constructor(
    code: string,
    description: string,
    order?: number,
    display?: string
  ) {
    this.code = code;
    // description can be null, to deal Possible Classifications
    this.description = description;
    // only higher order, need to be listed.
    this.order = order || -1;
    // used to display in the builder suffixing '/' or '//' or ' ' as needed
    this.display = display ? code + display : code;
  }

  addChild(child: Item): void {
    if (!this.children) {
      this.children = [];
    }

    this.children.push(child);
  }

  removeChild(code: string): void {
    this.children = removeAnItem(code, this.getChild.bind(this), this.children);
  }

  getChild(code: string): Item | undefined {
    return getAnItem(code, this.children, this.checkCode);
  }

  checkCode(item: Item, code: string): boolean {
    return code === item.code;
  }
}

export type getFn = (_code: string) => Item;
export type checkFn = (_item: Item) => boolean;
export function removeAnItem(
  code: string,
  fnGet: getFn,
  array: Item[]
): Item[] {
  const selItem = fnGet(code);

  if (selItem) {
    array = array.filter((value) => {
      if (-1 < value.order) {
        return value.order > selItem.order && value.code !== selItem.code;
      }
      return value.code !== selItem.code;
    });
  }

  return array;
}

export function getAnItem(
  code: string,
  array: Item[],
  cbCheckCode: (item: Item, code: string) => boolean
): Item | undefined {
  const index = array.findIndex((item) => cbCheckCode(item, code));
  return index >= 0 ? array[index] : undefined;
}
