/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export default function lookUpElement(
  el: Element | null,
  predict: (el: Element) => boolean
): Element | null {
  while (el?.nodeName) {
    if (predict(el)) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}
