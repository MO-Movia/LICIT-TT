import {Mark} from 'prosemirror-model';
import {marks} from './keys';

describe('ProseMirror marks', () => {
  test('serializes to em tag', () => {
    const emNode = marks.em?.toDOM?.({} as unknown as Mark, false);
    expect(emNode).toEqual(['em', 0]);
  });
});
