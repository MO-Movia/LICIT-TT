/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { blankDocument, blankNode, textNode, attrsNode } from './licit-gen-json';

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
  it('should create attrsNode with attrs', () => {
    expect(attrsNode('p', { style: 'bold' })).toBeDefined();
  });
  it('should create attrsNode with undefined attrs', () => {
    expect(attrsNode('p', undefined)).toBeDefined();
  });
  it('should create attrsNode with content', () => {
    expect(attrsNode('p', { style: 'bold' }, textNode('test'))).toBeDefined();
  });
});
