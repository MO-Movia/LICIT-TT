/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import type { ReactElement } from 'react';
import FontTypeCommandMenuButton from './fontTypeCommandMenuButton';
import { UICommand } from '../../core';
import findActiveFontType from '../findActiveFontType';
import CommandMenuButton from './commandMenuButton';

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

  function getElementProps(element: ReactElement): Record<string, unknown> {
    return element.props as Record<string, unknown>;
  }

  it('should instantiate component without throwing', () => {
    const props = {
      dispatch: mockDispatch,
      editorState: mockEditorState,
      editorView: { disabled: false },
    } as unknown as FontTypeCommandMenuButton['props'];

    expect(() => new FontTypeCommandMenuButton(props)).not.toThrow();
  });

  it('renders without title for short font names', () => {
    (findActiveFontType as jest.Mock).mockReturnValue('Arial');
    const editorView = { disabled: false };
    const element = new FontTypeCommandMenuButton({
      dispatch: mockDispatch,
      editorState: mockEditorState,
      editorView,
    } as unknown as FontTypeCommandMenuButton['props']).render();
    const props = getElementProps(element);

    expect(element.type).toBe(CommandMenuButton);
    expect(props.className).toBe('width-100 czi-dropdown-border');
    expect(props.disabled).toBe(false);
    expect(props.label).toBe('Arial');
    expect(props.title).toBeUndefined();
    expect(props.dispatch).toBe(mockDispatch);
    expect(props.editorState).toBe(mockEditorState);
    expect(props.editorView).toBe(editorView);
  });

  it('renders title and disabled state for long font names', () => {
    (findActiveFontType as jest.Mock).mockReturnValue('Times New Roman');
    const element = new FontTypeCommandMenuButton({
      dispatch: mockDispatch,
      editorState: mockEditorState,
      editorView: { disabled: true },
    } as unknown as FontTypeCommandMenuButton['props']).render();
    const props = getElementProps(element);

    expect(props.disabled).toBe(true);
    expect(props.label).toBe('Times New Roman');
    expect(props.title).toBe('Times New Roman');
  });

  it('renders enabled when editorView is not provided', () => {
    (findActiveFontType as jest.Mock).mockReturnValue('Courier');
    const element = new FontTypeCommandMenuButton({
      dispatch: mockDispatch,
      editorState: mockEditorState,
    }).render();
    const props = getElementProps(element);

    expect(props.disabled).toBe(false);
  });
});
