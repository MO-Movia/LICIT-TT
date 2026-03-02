/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {Node} from 'prosemirror-model';
import {CAPCOKEY, METADATAKEY, type KeyValuePair} from './constants';
import {safeCapcoParse} from './utils';
const ISVALIDATE = 'isValidate';

export type toDOMFn = (
  _node: Node
) => [string, Record<string, unknown>, number];
export type getAttrsFn = (_p: Node | string | HTMLElement) => KeyValuePair;

export type toDOMExFn = (
  _base: toDOMFn,
  _node: Node
) => [string, Record<string, unknown>, number];

export type getAttrsExFn = (
  _base: getAttrsFn,
  _dom: Node | string | HTMLElement
) => KeyValuePair;

function getAttrs(
  base: getAttrsFn,
  dom: Node | string | HTMLElement
): KeyValuePair {
  const attrs = base(dom);
  if (dom instanceof HTMLElement) {
    const capco = dom.getAttribute(CAPCOKEY);
    attrs[ISVALIDATE] = dom.getAttribute(ISVALIDATE);
    attrs[CAPCOKEY] = capco;
    attrs[METADATAKEY] ??= {};
    attrs[METADATAKEY][CAPCOKEY] = safeCapcoParse(capco).ism;
  }
  return attrs;
}

function toDOM(
  base: toDOMFn,
  node: Node
): [string, Record<string, unknown>, number] {
  const output: [string, Record<string, unknown>, number] = base(node);
  if (output?.[1]) {
    output[1][CAPCOKEY] = node.attrs[CAPCOKEY];
    output[1][ISVALIDATE] = node.attrs[ISVALIDATE];
  }

  return output;
}

// [FS-AG][21-APR-2020][IRAD-939]
export const toHeadingDOM = toDOM;
export const toParagraphDOM = toDOM;
export const getParagraphNodeAttrs = getAttrs;
