import {EditorState} from 'prosemirror-state';
import {isTextStyleMarkCommandEnabled} from './isTextStyleMarkCommandEnabled';
import * as isNodeSelectionForNodeType from './isNodeSelectionForNodeType';

describe('isTextStyleMarkCommandEnabled', () => {
  it('should handle isTextStyleMarkCommandEnabled and return true', () => {
    jest
      .spyOn(isNodeSelectionForNodeType, 'isNodeSelectionForNodeType')
      .mockReturnValue(true);
    const state = {
      selection: {},
      schema: {marks: {'mark-font-size': 'bold'}, nodes: {math: '1'}},
      tr: {},
    } as unknown as EditorState;
    const markName = 'mark-font-size';
    const result = isTextStyleMarkCommandEnabled(state, markName);
    expect(result).toBeTruthy();
  });
});
