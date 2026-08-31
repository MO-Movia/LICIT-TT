/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import * as React from 'react';
import type { ReactElement } from 'react';
import FontSizeCommandMenuButton, {
  FONT_PT_SIZES,
  parseFontSizeInput,
} from './fontSizeCommandMenuButton';
import { UICommand } from '../../core';
import findActiveFontSize from '../findActiveFontSize';
import { EditorView } from 'prosemirror-view';
import CommandMenuButton from './commandMenuButton';
import {FontSizeCommand} from '../../commands';

jest.mock('../../commands', () => ({
  FontSizeCommand: jest.fn().mockImplementation((pt: number) => ({
    _pt: pt,
    execute: jest.fn(() => true),
  })),
}));

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

  function getRenderedControls(instance: FontSizeCommandMenuButton): {
    input: ReactElement;
    menu: ReactElement;
    wrapper: ReactElement;
  } {
    const wrapper = instance.render();
    const [input, menu] = React.Children.toArray(
      getElementProps(wrapper).children as React.ReactNode
    ) as ReactElement[];
    return {input, menu, wrapper};
  }

  it('should call findActiveFontSize with editorState', () => {
    const fontSize = 12;
    (findActiveFontSize as jest.Mock).mockReturnValue(fontSize);

    const element = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);

    getRenderedControls(element);

    expect(findActiveFontSize).toHaveBeenCalledWith(editorState);
  });

  it('renders an editable input and preset menu for two-digit font sizes', () => {
    (findActiveFontSize as jest.Mock).mockReturnValue(12);

    const instance = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);
    const {input, menu, wrapper} = getRenderedControls(instance);
    const wrapperProps = getElementProps(wrapper);
    const inputProps = getElementProps(input);
    const menuProps = getElementProps(menu);

    expect(wrapperProps.className).toBe(
      'width-30 czi-font-size-control czi-dropdown-border dark'
    );
    expect(input.type).toBe('input');
    expect(inputProps.value).toBe('12');
    expect(inputProps.inputMode).toBe('decimal');
    expect(inputProps.disabled).toBe(false);
    expect(menu.type).toBe(CommandMenuButton);
    expect(menuProps.dispatch).toBe(dispatch);
    expect(menuProps.editorState).toBe(editorState);
    expect(menuProps.editorView).toBe(editorView);
  });

  it('renders wide width and disabled state for longer font sizes', () => {
    (findActiveFontSize as jest.Mock).mockReturnValue(100);
    editorView = { disabled: true } as unknown as EditorView;

    const component = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);
    const {input, menu, wrapper} = getRenderedControls(component);
    const props = getElementProps(wrapper);

    expect(props.className).toBe(
      'width-60 czi-font-size-control czi-dropdown-border dark'
    );
    expect(getElementProps(input).disabled).toBe(true);
    expect(getElementProps(menu).disabled).toBe(true);
  });

  it('renders enabled when editorView is not provided', () => {
    (findActiveFontSize as jest.Mock).mockReturnValue(9);

    const instance = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
    });
    const {input, menu} = getRenderedControls(instance);

    expect(getElementProps(input).disabled).toBe(false);
    expect(getElementProps(menu).disabled).toBe(false);
  });

  it('should define all FONT_PT_SIZES correctly', () => {
    expect(Array.isArray(FONT_PT_SIZES)).toBe(true);
    expect(FONT_PT_SIZES.length).toBeGreaterThan(5);
    expect(FONT_PT_SIZES).toContain(12);
    expect(FONT_PT_SIZES).toContain(72);
  });

  it('parses positive decimal font sizes', () => {
    expect(parseFontSizeInput('10.7')).toBe(10.7);
    expect(parseFontSizeInput(' 11.25 ')).toBe(11.25);
    expect(parseFontSizeInput('.5')).toBe(0.5);
  });

  it('rejects invalid font sizes', () => {
    expect(parseFontSizeInput('')).toBeNull();
    expect(parseFontSizeInput('0')).toBeNull();
    expect(parseFontSizeInput('-1')).toBeNull();
    expect(parseFontSizeInput('10pt')).toBeNull();
    expect(parseFontSizeInput(`${'1'.repeat(100_000)}x`)).toBeNull();
  });

  it('applies a decimal font size when Enter is pressed', () => {
    const focus = jest.fn();
    editorView = {disabled: false, focus} as unknown as EditorView;
    const instance = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);
    instance.state = {
      inputValue: '10.7',
      invalid: false,
      isEditing: true,
    };
    const event = {
      currentTarget: {blur: jest.fn()},
      key: 'Enter',
      nativeEvent: {isComposing: false},
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    instance._onInputKeyDown(event);

    expect(FontSizeCommand).toHaveBeenCalledWith(10.7);
    const command = (FontSizeCommand as unknown as jest.Mock).mock.results[0]
      .value;
    expect(command.execute).toHaveBeenCalledWith(editorState, dispatch);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });

  it('marks invalid values without applying a command', () => {
    const instance = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);
    instance.state = {
      inputValue: 'abc',
      invalid: false,
      isEditing: true,
    };
    const setState = jest.spyOn(instance, 'setState');

    instance._applyInputValue();

    expect(FontSizeCommand).not.toHaveBeenCalled();
    expect(setState).toHaveBeenCalledWith({invalid: true});
  });

  it('selects the current value on focus and tracks edits', () => {
    const instance = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);
    const select = jest.fn();
    const setState = jest.spyOn(instance, 'setState');

    instance._onInputFocus({
      currentTarget: {select, value: '11'},
    } as unknown as React.FocusEvent<HTMLInputElement>);
    instance._onInputChange({
      currentTarget: {value: '10.7'},
    } as unknown as React.ChangeEvent<HTMLInputElement>);

    expect(select).toHaveBeenCalled();
    expect(setState).toHaveBeenNthCalledWith(1, {
      inputValue: '11',
      invalid: false,
      isEditing: true,
    });
    expect(setState).toHaveBeenNthCalledWith(2, {
      inputValue: '10.7',
      invalid: false,
      isEditing: true,
    });
  });

  it('cancels editing on Escape', () => {
    const instance = new FontSizeCommandMenuButton({
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props']);
    const blur = jest.fn();
    const preventDefault = jest.fn();
    const setState = jest.spyOn(instance, 'setState');

    instance._onInputKeyDown({
      currentTarget: {blur},
      key: 'Escape',
      nativeEvent: {isComposing: false},
      preventDefault,
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>);

    expect(preventDefault).toHaveBeenCalled();
    expect(setState).toHaveBeenCalledWith({
      invalid: false,
      isEditing: false,
    });
    expect(blur).toHaveBeenCalled();
  });

  it('shows the new active size after a preset command updates the editor', () => {
    const previousProps = {
      dispatch,
      editorState,
      editorView,
    } as unknown as FontSizeCommandMenuButton['props'];
    const instance = new FontSizeCommandMenuButton(previousProps);
    instance.state = {
      inputValue: '10.7',
      invalid: false,
      isEditing: true,
    };
    instance.props = {
      ...previousProps,
      editorState: {} as EditorState,
    };
    const setState = jest.spyOn(instance, 'setState');

    instance.componentDidUpdate(previousProps);

    expect(setState).toHaveBeenCalledWith({
      invalid: false,
      isEditing: false,
    });
  });
});
