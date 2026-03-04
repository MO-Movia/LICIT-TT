/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Node } from '@tiptap/pm/model';
import type { LicitDocument } from '../models/licit-document';
import { blankDocument, blankNode } from './licit-gen-json';
import { normalizeDoc, toSimpleJson } from './normalizer';

describe('Doc Normalizer Utils', () => {
  it('should normalize doc', async () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };
    // Stringify and parse to reduce to json.
    const doc = await normalizeDoc(inputDoc, [], 0);

    // Licit added properties will change over time, but something should have been added.
    expect(doc).not.toEqual(inputDoc);
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

    // Licit added properties will change over time, but something should have been added.
    expect(doc).not.toEqual(inputDoc);
  });
});
