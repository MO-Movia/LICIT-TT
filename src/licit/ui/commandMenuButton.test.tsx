/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import CommandMenuButton, { CommandMenu } from './commandMenuButton';
import { EditorState } from 'prosemirror-state';
import { CustomButton, createPopUp } from '../../commands';
import { EditorView } from 'prosemirror-view';
import { UICommand } from '../../core';

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

  test('should pass menu cleanup callback to asynchronous commands', () => {
    const onCommand = jest.fn();
    const command = {
      execute: jest.fn().mockReturnValue(false),
    };
    const event = {type: 'mouseenter'} as React.SyntheticEvent;
    const instance = new CommandMenu({
      commandGroups: [],
      dispatch: mockProps.dispatch,
      editorState: mockProps.editorState,
      editorView: mockProps.editorView,
      onCommand,
      theme: 'light',
    });

    instance._execute(command as never, event);

    expect(command.execute).toHaveBeenCalledWith(
      mockProps.editorState,
      mockProps.dispatch,
      mockProps.editorView,
      event,
      onCommand
    );
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

describe('CommandMenu keyboard navigation', () => {
  const menuProps = {
    commandGroups: [],
    dispatch: jest.fn(),
    editorState: {} as EditorState,
    editorView: {} as EditorView,
    onCommand: jest.fn(),
    title: 'Font Size',
    theme: 'light',
  };
  const cmdA = { label: 'a' } as unknown as UICommand;
  const cmdB = { label: 'b' } as unknown as UICommand;

  const syncSetState = (instance: CommandMenu) =>
    jest
      .spyOn(instance, 'setState')
      .mockImplementation((update, cb?: () => void) => {
        const partial =
          typeof update === 'function'
            ? (update as (s: object) => object)(instance.state)
            : update;
        instance.state = { ...instance.state, ...partial };
        cb?.();
      });

  const navKeyEvent = (key: string) =>
    ({
      key,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    }) as unknown as React.KeyboardEvent;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The arrow/Enter/hover logic itself is covered in menuKeyboardNav.test.ts;
  // these tests verify CommandMenu wires its state/commands/scroll into that
  // shared controller correctly (via instance._kbd).

  test('ArrowDown moves the highlight down through the controller', () => {
    const instance = new CommandMenu(menuProps);
    instance._navCommands = [cmdA, cmdB];
    instance.state = { selectedIndex: 0 };
    syncSetState(instance);
    const e = navKeyEvent('ArrowDown');
    instance._kbd.onKeyDown(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(instance.state.selectedIndex).toBe(1);
  });

  test('ArrowUp wraps to the last row from the first', () => {
    const instance = new CommandMenu(menuProps);
    instance._navCommands = [cmdA, cmdB];
    instance.state = { selectedIndex: 0 };
    syncSetState(instance);
    instance._kbd.onKeyDown(navKeyEvent('ArrowUp'));
    expect(instance.state.selectedIndex).toBe(1);
  });

  test('Enter activates the highlighted command via _execute', () => {
    const instance = new CommandMenu(menuProps);
    instance._navCommands = [cmdA, cmdB];
    instance.state = { selectedIndex: 1 };
    const execSpy = jest
      .spyOn(instance, '_execute')
      .mockImplementation(() => undefined);
    instance._kbd.onKeyDown(navKeyEvent('Enter'));
    expect(execSpy).toHaveBeenCalledWith(cmdB, expect.anything());
  });

  test('getNavCount reflects the rendered command rows (no rows = no-op)', () => {
    const instance = new CommandMenu(menuProps);
    instance._navCommands = [];
    const e = navKeyEvent('ArrowDown');
    instance._kbd.onKeyDown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  test('hover through the controller selects the row', () => {
    const instance = new CommandMenu(menuProps);
    instance.state = { selectedIndex: 0 };
    syncSetState(instance);
    const row = document.createElement('div');
    row.setAttribute('data-index', '2');
    instance._kbd.onMouseOver({
      target: row,
      clientX: 5,
      clientY: 9,
    } as unknown as MouseEvent);
    expect(instance.state.selectedIndex).toBe(2);
  });

  test('componentDidMount highlights the active row and mounts the controller', () => {
    const instance = new CommandMenu(menuProps);
    instance._activeIndex = 3;
    syncSetState(instance);
    const mountSpy = jest
      .spyOn(instance._kbd, 'mount')
      .mockImplementation(() => undefined);
    instance._menuRef = {
      current: { querySelector: jest.fn(() => null) },
    } as unknown as typeof instance._menuRef;
    instance.componentDidMount();
    expect(instance.state.selectedIndex).toBe(3);
    expect(mountSpy).toHaveBeenCalled();
  });

  test('componentDidMount is a no-op for horizontal/expand menus', () => {
    // The real isExpandButton treats a title of 'Expand' as a horizontal menu.
    const instance = new CommandMenu({ ...menuProps, title: 'Expand' });
    const setStateSpy = jest.spyOn(instance, 'setState');
    const mountSpy = jest.spyOn(instance._kbd, 'mount');
    instance.componentDidMount();
    expect(setStateSpy).not.toHaveBeenCalled();
    expect(mountSpy).not.toHaveBeenCalled();
  });

  test('componentWillUnmount unmounts the controller', () => {
    const instance = new CommandMenu(menuProps);
    const unmountSpy = jest
      .spyOn(instance._kbd, 'unmount')
      .mockImplementation(() => undefined);
    instance.componentWillUnmount();
    expect(unmountSpy).toHaveBeenCalled();
  });

  test('_scrollSelectedIntoView reveals the selected row', () => {
    const instance = new CommandMenu(menuProps);
    instance.state = { selectedIndex: 2 };
    const scrollIntoView = jest.fn();
    const querySelector = jest.fn(() => ({ scrollIntoView }));
    instance._menuRef = {
      current: { querySelector },
    } as unknown as typeof instance._menuRef;
    instance._scrollSelectedIntoView();
    expect(querySelector).toHaveBeenCalledWith('[data-index="2"]');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });
});
