/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import FontTypeCommandMenuButton from './fontTypeCommandMenuButton';
import { UICommand } from '../../core';

//  Use `var` to prevent hoisting issues
// eslint-disable-next-line no-var
var _mockFindActiveFontType: jest.Mock;
jest.mock('../findActiveFontType', () => {
  const fn = jest.fn();
  _mockFindActiveFontType = fn;
  return { __esModule: true, default: fn };
});

//  Safe mock pattern for CommandMenuButton
// eslint-disable-next-line no-var
var _MockCommandMenuButton: jest.Mock;
jest.mock('./commandMenuButton', () => {
  const fn = jest.fn((_props: jest.Mock) => null);
  _MockCommandMenuButton = fn;
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
