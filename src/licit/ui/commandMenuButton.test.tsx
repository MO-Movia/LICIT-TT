/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import CommandMenuButton, { CommandMenu } from './commandMenuButton';
import { EditorState } from 'prosemirror-state';
import { CustomButton, createPopUp } from '../../commands';
import { EditorView } from 'prosemirror-view';

//  Mock Dependencies
jest.mock('../../commands', () => ({
  CustomButton: (props: React.JSX.Element) =>
    React.createElement('button', props),
  createPopUp: jest.fn(() => ({ close: jest.fn(), update: jest.fn() })),
  atAnchorRight: jest.fn(),
  ThemeContext: React.createContext('light'),
}));

jest.mock('../../core', () => ({
  UICommand: { theme: 'light' },
}));

jest.mock('../constants', () => ({
  EditorViewEx: jest.fn(),
}));

jest.mock('./editorToolbarConfig', () => ({
  isExpandButton: jest.fn(() => false),
}));

jest.mock('./uuid', () => jest.fn(() => 'mock-uuid'));

jest.mock('./commandMenu', () => 'CommandMenu');
  
const mockCommand = {
  isEnabled: jest.fn(() => true),
};

const mockCommandGroups = [
  { Bold: mockCommand },
];

const mockProps = {
  commandGroups: mockCommandGroups,
  dispatch: jest.fn(),
  editorState: {} as EditorState,
  editorView: {} as EditorView,
  title: 'Bold Menu',
  label: 'Bold',
  className: 'test-btn',
};

describe('CommandMenuButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    const element = React.createElement(CommandMenuButton, mockProps);
    expect(element).toBeTruthy();
  });

  test('initial state should not be expanded', () => {
    const instance = new (CommandMenuButton)(mockProps);
    expect(instance.state.expanded).toBe(false);
  });

  test('should toggle expanded state on click', () => {
  const instance = new (CommandMenuButton)(mockProps);
  const setStateSpy = jest.spyOn(instance, 'setState');

  // Simulate first click (expands)
  instance._onClick();
  const firstCall = setStateSpy.mock.calls[0][0] as (
    prevState: Readonly<unknown>
  ) => unknown;
  expect(firstCall({ expanded: false })).toEqual({ expanded: true });

  // Manually reflect the state change (React would normally do this)
  instance.state.expanded = true;

  // Simulate second click (collapses)
  instance._onClick();
  const secondCall = setStateSpy.mock.calls[1][0] as (
    prevState: Readonly<unknown>
  ) => unknown;
  expect(secondCall({ expanded: true })).toEqual({ expanded: false });
  });

  test('should call createPopUp when _showMenu is triggered', () => {
    const instance = new (CommandMenuButton)(mockProps);
    instance._showMenu();

    expect(createPopUp).toHaveBeenCalled();
  });

  test('should update an existing popup instead of recreating it', () => {
    const update = jest.fn();
    const instance = new (CommandMenuButton)(mockProps);
    instance._menu = { update };

    instance._showMenu();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockProps,
        onCommand: expect.any(Function),
        theme: 'light',
      })
    );
  });

  test('should render a fallback label and child indicator when nested commands exist', () => {
    const instance = new (CommandMenuButton)({
      ...mockProps,
      label: undefined,
    });
    const rendered = instance.render() as unknown as React.ReactElement<{
      hasChild: boolean;
      label: string | null;
    }>;

    expect(rendered.props.hasChild).toBe(true);
    expect(rendered.props.label).toBe('?');
  });

  test('should suppress the child indicator for expand buttons', () => {
    const instance = new (CommandMenuButton)({
      ...mockProps,
      title: 'Expand',
      label: undefined,
    });
    const rendered = instance.render() as unknown as React.ReactElement<{
      hasChild: boolean;
      className: string;
      label: string | null;
    }>;

    expect(rendered.props.hasChild).toBe(false);
    expect(rendered.props.className).toContain('menu-expand-btn');
    expect(rendered.props.label).toBeNull();
  });

  test('should recover when a command throws in isEnabled', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const instance = new (CommandMenuButton)({
      ...mockProps,
      commandGroups: [
        {
          Broken: {
            isEnabled: jest.fn(() => {
              throw new Error('broken');
            }),
          },
        },
      ],
    });
    const rendered = instance.render() as unknown as React.ReactElement<{
      disabled: boolean;
    }>;

    expect(rendered.props.disabled).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('should pass editor view and label when rendering command menu items', () => {
    const command = {
      cancel: jest.fn(),
      execute: jest.fn(),
      isActive: jest.fn(() => false),
      isEnabled: jest.fn(() => true),
      renderLabel: jest.fn(() => null),
      shouldRespondToUIEvent: jest.fn(() => true),
    };
    const instance = new CommandMenu({
      commandGroups: [{ 'Border Color....': command as never }],
      dispatch: mockProps.dispatch,
      editorState: mockProps.editorState,
      editorView: mockProps.editorView,
      theme: 'light',
    });

    const rendered = instance._renderCustomMenuItem(
      'Border Color....',
      command as never,
      mockProps.editorState,
      mockProps.editorView,
      '',
      'light'
    ) as unknown as React.ReactElement<{ disabled: boolean }>;

    expect(command.isEnabled).toHaveBeenCalledWith(
      mockProps.editorState,
      mockProps.editorView,
      'Border Color....'
    );
    expect(rendered.props.disabled).toBe(false);
  });

  test('should not cancel the active command when the same menu item is re-entered', () => {
    const command = {
      cancel: jest.fn(),
      execute: jest.fn(),
      shouldRespondToUIEvent: jest.fn(() => true),
    };
    const event = {
      type: 'mouseenter',
    } as unknown as React.SyntheticEvent;
    const instance = new CommandMenu({
      commandGroups: [],
      dispatch: mockProps.dispatch,
      editorState: mockProps.editorState,
      editorView: mockProps.editorView,
      theme: 'light',
    });

    instance._onUIEnter(command as never, event);
    instance._onUIEnter(command as never, event);

    expect(command.cancel).not.toHaveBeenCalled();
    expect(command.execute).toHaveBeenCalledTimes(2);
  });

  test('should set child popup positioning props for submenu content', () => {
    const instance = new (CommandMenuButton)({
      ...mockProps,
      sub: true,
      commandGroups: [{ Single: mockCommand }],
    });

    instance._showMenu();

    expect(createPopUp).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Object),
      expect.objectContaining({
        IsChildDialog: true,
        autoDismiss: true,
        popUpId: 'mo-menuList-1',
        position: expect.any(Function),
      })
    );
  });

  test('should keep insert table menus auto-dismissable', () => {
    const instance = new (CommandMenuButton)({
      ...mockProps,
      commandGroups: [{ 'Insert Table...': mockCommand }],
    });

    instance._showMenu();

    expect(createPopUp).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Object),
      expect.objectContaining({
        autoDismiss: true,
        popUpId: null,
      })
    );
  });

  test('should close popup on _hideMenu', () => {
    const closeMock = jest.fn();
    const instance = new (CommandMenuButton)(mockProps);
    instance._menu = { close: closeMock };
    instance._hideMenu();

    expect(closeMock).toHaveBeenCalled();
    expect(instance._menu).toBeNull();
  });

  test('should set expanded to false on _onCommand', () => {
    const instance = new (CommandMenuButton)(mockProps);
    instance.setState({ expanded: true });
    instance._onCommand();
    expect(instance.state.expanded).toBe(false);
  });

  test('should nullify menu on _onClose', () => {
    const instance = new (CommandMenuButton)(mockProps);
    instance._menu = { dummy: true };
    instance._onClose();
    expect(instance._menu).toBeNull();
    expect(instance.state.expanded).toBe(false);
  });

  test('should set _menu to null on unmount', () => {
    const instance = new (CommandMenuButton)(mockProps);
    const hideMenuSpy = jest.spyOn(instance, '_hideMenu');
    instance.componentWillUnmount();
    expect(hideMenuSpy).toHaveBeenCalled();
  });

test('should pass correct theme to CustomButton', () => {
  const instance = new (CommandMenuButton)(mockProps);
  const rendered = instance.render() as unknown as React.ReactElement<{
    theme: string;
    className: string;
    label: string | React.ReactElement;
  }>;

  // The rendered element is a React element of type 'button' (CustomButton mock)
  expect(rendered.type).toBe(CustomButton);

  // Props passed to CustomButton should include theme derived from UICommand.theme
  expect(rendered.props.theme).toBe('light');
  expect(rendered.props.className).toContain('czi-custom-menu-button');
  expect(rendered.props.label).toBe('Bold');
});


});
