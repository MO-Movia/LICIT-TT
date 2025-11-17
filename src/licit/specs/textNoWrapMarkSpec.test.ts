import TextNoWrapMarkSpec from './textNoWrapMarkSpec'; // Adjust the import path as needed
import { Mark } from '@tiptap/pm/model';

describe('TextNoWrapMarkSpec', () => {
  describe('toDOM', () => {
    it('should generate a <nobr> element', () => {
      const mockMark = {
        attrs: {},
      } as Mark;

      const result = TextNoWrapMarkSpec.toDOM(mockMark, false);

      expect(result).toEqual(['nobr', 0]);
    });
  });
});
