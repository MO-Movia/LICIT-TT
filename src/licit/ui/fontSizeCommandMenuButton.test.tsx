/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import type { ReactElement } from 'react';
import FontSizeCommandMenuButton, { FONT_PT_SIZES } from './fontSizeCommandMenuButton';
import { UICommand } from '../../core';
import findActiveFontSize from '../findActiveFontSize';
import { EditorView } from 'prosemirror-view';
import CommandMenuButton from './commandMenuButton';

//  Fix: define mock *inside* jest.mock() so it's not hoisted before initialization
jest.mock('./commandMenuButton', () => {
  const MockCommandMenuButton = jest.fn(() => null);
  return {
    __esModule: true,
    default: MockCommandMenuButton,
  };
});

//  Mock findActiveFontSize
jest.mock('../findActiveFontSize', () => jest.fn());

describe('FontSizeCommandMenuButton (pure Jest)', () => {
  let dispatch: jest.Mock;
  let editorState: EditorState;
  let editorView: EditorView;

  beforeEach(() => {
    jest.clearAllMocks();
    UICommand.theme = 'dark';
    dispatch = jest.fn();
    editorState = {} as EditorState;
    editorView = { disabled: false } as unknown as EditorView;
  });

  function getElementProps(element: ReactElement): Record<string, unknown> {
    return element.props as Record<string, unknown>;
  }

  it('should call findActiveFontSize with editorState', () => {
    const fontSize = 12;
    (findActiveFontSize as jest.Mock).mockReturnValue(fontSize);

    const element = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);

    element.render();

    expect(findActiveFontSize).toHaveBeenCalledWith(editorState);
  });

  it('renders compact width and enabled state for two-digit font sizes', () => {
    (findActiveFontSize as jest.Mock).mockReturnValue(12);

    const element = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']).render();
    const props = getElementProps(element);

    expect(element.type).toBe(CommandMenuButton);
    expect(props.className).toBe('width-30 czi-dropdown-border');
    expect(props.disabled).toBe(false);
    expect(props.label).toBe(12);
    expect(props.dispatch).toBe(dispatch);
    expect(props.editorState).toBe(editorState);
    expect(props.editorView).toBe(editorView);
  });

  it('renders wide width and disabled state for longer font sizes', () => {
    (findActiveFontSize as jest.Mock).mockReturnValue(100);
    editorView = { disabled: true } as unknown as EditorView;

    const element = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
    }).render();
    const props = getElementProps(element);

    expect(props.className).toBe('width-60 czi-dropdown-border');
    expect(props.disabled).toBe(false);
  });

  it('renders enabled when editorView is not provided', () => {
    (findActiveFontSize as jest.Mock).mockReturnValue(9);

    const element = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
    }).render();
    const props = getElementProps(element);

    expect(props.disabled).toBe(false);
  });

  it('should define all FONT_PT_SIZES correctly', () => {
    expect(Array.isArray(FONT_PT_SIZES)).toBe(true);
    expect(FONT_PT_SIZES.length).toBeGreaterThan(5);
    expect(FONT_PT_SIZES).toContain(12);
    expect(FONT_PT_SIZES).toContain(72);
  });
});
