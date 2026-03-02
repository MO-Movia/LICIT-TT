/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorView } from 'prosemirror-view';
import { insertReference } from './Commands';
import { REFERENCE } from './ReferenceNodeSpec';

describe('Dropdown', () => {
  it('should call insert functions', () => {
    const node = {};
    const create = jest.fn(() => node);
    const replaceSelectionWith = jest.fn();
    const dispatch = jest.fn();
    const view = {
      dispatch,
      state: {
        schema: { nodes: { [REFERENCE]: { create } } },
        tr: { replaceSelectionWith },
      },
    } as unknown as EditorView;
    insertReference(view, '', '', '','');
    expect(replaceSelectionWith).toHaveBeenCalledWith(node);
  });
});
