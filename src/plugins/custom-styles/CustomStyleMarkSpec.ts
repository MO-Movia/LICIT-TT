/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { DOMOutputSpec, Node } from 'prosemirror-model';
import type { KeyValuePair } from './Constants';

// Always append to base calls.
const ATTR_OVERRIDDEN = 'overridden';

type getAttrsFn = (p: Node | string) => KeyValuePair;
type DOMArrayOutput = Array<string | number | Record<string, unknown>>;

function toDOMOutputSpec(output: DOMArrayOutput): DOMOutputSpec {
  return output as unknown as DOMOutputSpec;
}

function getAttrs(base: getAttrsFn | undefined, dom: HTMLElement) {
  if (typeof dom != 'string' && undefined !== base) {
    const attrs = base(dom as unknown as Node);
    // [FS] IRAD-1623 2021-11-11
    return attrs;
  } else {
    return base?.(dom as unknown as Node);
  }
}

function toDOM(
  base: (node: Node) => DOMOutputSpec | DOMArrayOutput,
  node: Node
): DOMOutputSpec {
  const output = base(node);
  if (!Array.isArray(output)) {
    return output;
  }

  if (output.length === 2) {
    output[1] = {
      [ATTR_OVERRIDDEN]: node.attrs[ATTR_OVERRIDDEN],
    };
    output[2] = 0;
  } else {
    const attrs =
      output[1] && typeof output[1] === 'object' && !Array.isArray(output[1])
        ? output[1]
        : {};
    attrs[ATTR_OVERRIDDEN] = node.attrs[ATTR_OVERRIDDEN];
    output[1] = attrs;
  }

  return toDOMOutputSpec(output);
}

export const toMarkDOM = toDOM;
export const getMarkAttrs = getAttrs;
