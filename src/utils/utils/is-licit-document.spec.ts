/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Node } from '@tiptap/pm/model';
import type { LicitNode } from '../models/licit-document';
import { isDirty, isLicitDocument } from './is-licit-document';

describe('isLicitDocument', () => {
  describe('when passed a document instance', () => {
    it('should return truthy', () => {
      const doc = { type: 'doc' };

      expect(isLicitDocument(doc)).toBeTruthy();
    });
  });

  describe('when passed a JSON string', () => {
    it('should be truthy', () => {
      const doc = '{"type":"doc"}';

      expect(isLicitDocument(doc)).toBeTruthy();
    });
  });

  describe('when passed an HTML fragment', () => {
    it('should return falsy', () => {
      const doc = '<p>this is a froala document</p>';

      expect(isLicitDocument(doc)).toBeFalsy();
    });
  });

  describe('when passed an empty string', () => {
    it('should return falsy', () => {
      const doc = '';

      expect(isLicitDocument(doc)).toBeFalsy();
    });
  });

  describe('isDirty', () => {
    it('should detect dirty', () => {
      expect(isDirty()).toBeFalsy();
      expect(
        isDirty({
          content: {
            attrs: { dirty: false },
          },
        } as unknown as LicitNode)
      ).toBeFalsy();
      const dirtyNode = {
        attrs: { dirty: true },
      } as unknown as LicitNode;
      expect(isDirty(dirtyNode)).toBeTruthy();
      expect(
        isDirty({
          attrs: { deletedObjectIds: [] },
        } as unknown as LicitNode)
      ).toBeFalsy();
      expect(
        isDirty({
          attrs: { deletedObjectIds: ['1'] },
        } as unknown as LicitNode)
      ).toBeTruthy();
      expect(
        isDirty({
          content: {},
        } as unknown as LicitNode)
      ).toBeFalsy();
      expect(
        isDirty({
          content: [dirtyNode],
        } as unknown as LicitNode)
      ).toBeTruthy();
      expect(isDirty(new Node())).toBeFalsy();
      expect(
        isDirty(
          Object.assign(new Node(), { content: { content: [dirtyNode] } })
        )
      ).toBeTruthy();
    });
  });
});
