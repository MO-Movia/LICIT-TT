/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import FontTypeCommandMenuButton from './fontTypeCommandMenuButton';
import { UICommand } from '../../core';

jest.mock('../findActiveFontType', () => {
  const fn = jest.fn();
  return { __esModule: true, default: fn };
});

jest.mock('./commandMenuButton', () => {
  const fn = jest.fn((_props: jest.Mock) => null);
  return { __esModule: true, default: fn };
});

describe('FontTypeCommandMenuButton (pure Jest)', () => {
  const mockDispatch = jest.fn();
  const mockEditorState = {} as EditorState;

  beforeEach(() => {
    jest.clearAllMocks();
    UICommand.theme = 'dark';
  });

  it('should instantiate component without throwing', () => {
    const props = {
      dispatch: mockDispatch,
      editorState: mockEditorState,
      editorView: { disabled: false },
    } as unknown as FontTypeCommandMenuButton['props'];

    expect(() => new FontTypeCommandMenuButton(props)).not.toThrow();
  });
});
