import { Schema } from '@tiptap/pm/model';
import { effectiveSchema } from './CitationSchema';

describe('CitationSchema', () => {
  it('should handle effectiveSchema', () => {
    expect(effectiveSchema({} as unknown as Schema)).toBeDefined();
  });
});
