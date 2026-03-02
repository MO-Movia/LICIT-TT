/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { p } from 'jest-prosemirror';
import { ReferenceNodeSpec, REFERENCE } from './ReferenceNodeSpec';
describe('ReferenceNodeSpec', () => {
  it('toDOM should return the correct DOM representation', () => {
    const referenceNode = p('<cursor>');
    const dom = ReferenceNodeSpec?.toDOM
      ? ReferenceNodeSpec?.toDOM(referenceNode)
      : undefined;

    expect(dom).toEqual([REFERENCE, { contentEditable: false }, 0]);
  });
});
