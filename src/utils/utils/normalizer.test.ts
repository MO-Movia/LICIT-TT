/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Node } from '@tiptap/pm/model';
import type { LicitDocument } from '../models/licit-document';
import { blankDocument, blankNode } from './licit-gen-json';
import { normalizeDoc, toSimpleJson } from './normalizer';

describe('Doc Normalizer Utils', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'structuredClone', {
      value: (value: unknown) => JSON.parse(JSON.stringify(value)),
      writable: true,
    });
  });
  it('should reject when editor does not respond before timeout', async () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };
    await expect(normalizeDoc(inputDoc, [], 0)).rejects.toThrow(
      'Timeout. Licit Editor did not respond.'
    );
  });
  it('should normalize as JSON', () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };
    // Stringify and parse to reduce to json.
    const doc = toSimpleJson(inputDoc as unknown as Node);

    expect(doc).toEqual(inputDoc);
    expect(doc).not.toBe(inputDoc);
  });
});
