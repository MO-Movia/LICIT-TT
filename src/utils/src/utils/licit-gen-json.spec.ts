/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { blankDocument, blankNode, textNode } from './licit-gen-json';

describe('Licit JSON Generator Utils', () => {
  it('should create blankDocument', () => {
    expect(blankDocument()).toBeDefined();
  });
  it('should create blankNode', () => {
    expect(blankNode('p')).toBeDefined();
  });
  it('should create textNode', () => {
    expect(textNode('p')).toBeDefined();
  });
});
