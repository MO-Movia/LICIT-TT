/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import { toHeadingDOM, toDOMFn } from './capcoNodeSpec';
import { Node } from 'prosemirror-model';

describe('capconodespec', () => {
  it('should handle toDOM', () => {
    const myToDomFn: toDOMFn = (_node: Node) => {
      return ['div', { capco: 'my-class' }, 0];
    };
    const node = { attrs: { capco: 'test' } } as unknown as Node;

    myToDomFn(node);
    expect(toHeadingDOM(myToDomFn, node)).toBeDefined();
  });
});
