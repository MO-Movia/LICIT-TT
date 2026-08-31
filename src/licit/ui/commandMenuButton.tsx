/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import * as React from 'react';

import CustomMenu from './customMenu';
import CustomMenuItem from './customMenuItem';
import {
  CustomButton,
  createPopUp,
  atAnchorRight,
  ThemeContext,
} from '../../commands';
import { UICommand } from '../../core';
import { MenuKeyboardNav } from '../../commands/ui/menuKeyboardNav';
import uuid from './uuid';
import {isExpandButton, parseLabel} from './toolbarLabelUtils';
import {EditorViewEx} from '../constants';
export interface Arr {
  [key: string]: UICommand;
}

type UICommandCandidate = Partial<
  Record<
    | 'cancel'
    | 'execute'
    | 'isActive'
    | 'isEnabled'
    | 'renderLabel'
    | 'shouldRespondToUIEvent',
    unknown
  >
>;

export function isUICommandLike(value: unknown): value is UICommand {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const command = value as UICommandCandidate;
  return (
    typeof command.cancel === 'function' &&
    typeof command.execute === 'function' &&
    typeof command.isActive === 'function' &&
    typeof command.isEnabled === 'function' &&
    typeof command.renderLabel === 'function' &&
    typeof command.shouldRespondToUIEvent === 'function'
  );
}

type CommandMenuProps = {
  commandGroups: Array<Arr>;
  dispatch: (tr: Transform) => void;
  editorState: EditorState;
  editorView?: EditorView;
  onCommand?: () => void;
  title?: string;
  theme?: string;
};
type PropsType = {
  className?: string;
  commandGroups: Array<unknown>;
  disabled?: boolean;
  dispatch: (tr: Transform) => void; //NOSONAR
  editorState: EditorState;
  editorView: EditorViewEx;
  icon?: string | React.ReactElement;
  label?: string | React.ReactElement;
  title?: string;
  sub?: boolean;
};
type StateType = {
  expanded: boolean;
};

type CommandMenuState = {
  selectedIndex: number;
};

export class CommandMenu extends React.PureComponent<
  CommandMenuProps,
  CommandMenuState
> {
  _activeCommand?: UICommand = null;

  _menuRef = React.createRef<HTMLDivElement>();
  _navCommands: UICommand[] = [];
  _activeIndex = 0;
  _kbd = new MenuKeyboardNav({
    getRoot: () => this._menuRef.current,
    getNavCount: () => this._navCommands.length,
    getSelectedIndex: () => this.state.selectedIndex,
    setSelectedIndex: (index, done) =>
      this.setState({selectedIndex: index}, done),
    activate: (index, event) => {
      const command = this._navCommands[index];
      if (command) {
        this._execute(command, event as unknown as React.SyntheticEvent);
      }
    },
    scrollSelectedIntoView: () => this._scrollSelectedIntoView(),
  });

  declare props: CommandMenuProps;

  state = {selectedIndex: 0};

  render(): React.ReactElement {
    const {commandGroups, title, theme} = this.props;
    const isHorizontal = isExpandButton(title);
    this._navCommands = [];
    const children = commandGroups.flatMap((group, index) =>
      this.renderCommandGroup(
        group,
        index < commandGroups.length - 1,
        isHorizontal,
        theme
      )
    );
    const menu = (
      <CustomMenu theme={theme} isHorizontal={isHorizontal}>
        {children}
      </CustomMenu>
    );
    if (isHorizontal) {
      return menu;
    }
    return (
      <div
        className="mo-menu-keyboardnav"
        onKeyDown={this._kbd.onKeyDown}
        ref={this._menuRef}
        role="menu"
        tabIndex={-1}
      >
        {menu}
      </div>
    );
  }

  renderCommandGroup(
    group: Arr,
    appendSeparator: boolean,
    isHorizontal: boolean,
    theme: string
  ): React.ReactElement[] {
    const children = Object.keys(group)
      .map((label) =>
        this.renderCommandEntry(label, group[label], isHorizontal, theme)
      )
      .filter(Boolean);

    if (appendSeparator) {
      children.push(<CustomMenuItem.Separator key={`${children.length}-hr`} />);
    }

    return children;
  }

  renderCommandEntry(
    label: string,
    command: UICommand | Array<unknown>,
    isHorizontal: boolean,
    theme: string
  ): React.ReactElement | null {
    if (isUICommandLike(command)) {
      const {editorState, editorView} = this.props;
      const {icon} = parseLabel(label, theme.toString());
      const item = this._renderCustomMenuItem(
        label,
        command,
        editorState,
        editorView,
        icon,
        theme
      );
      return isHorizontal ? item : this.renderNavigationRow(label, command, item);
    }

    return Array.isArray(command)
      ? this._renderMenuButton(label, command, theme)
      : null;
  }

  renderNavigationRow(
    label: string,
    command: UICommand,
    item: React.ReactElement
  ): React.ReactElement {
    const index = this._navCommands.length;
    if (command.isActive(this.props.editorState)) {
      this._activeIndex = index;
    }
    this._navCommands.push(command);

    return (
      <div
        className={cx('mo-menu-row', {
          'mo-menu-row--selected': index === this.state.selectedIndex,
        })}
        data-index={index}
        key={label}
        role="menuitem"
        tabIndex={-1}
      >
        {item}
      </div>
    );
  }

  componentDidMount(): void {

    if (isExpandButton(this.props.title)) {
      return;
    }
    this.setState({selectedIndex: this._activeIndex}, () =>
      this._scrollSelectedIntoView()
    );
    this._kbd.mount();
  }

  componentWillUnmount(): void {
    this._kbd.unmount();
  }

  _scrollSelectedIntoView(): void {
    const row = this._menuRef.current?.querySelector(
      `[data-index="${this.state.selectedIndex}"]`
    );
    row?.scrollIntoView?.({block: 'nearest'});
  }

  _renderCustomMenuItem = (
    label: string,
    command: UICommand,
    editorState: EditorState,
    editorView: EditorView | undefined,
    icon: string | React.ReactElement,
    theme: string
  ): React.ReactElement<CustomMenuItem> => {
    const {title} = parseLabel(label, theme);
    let disabled = true;
    try {
      disabled =
        !editorView || !command.isEnabled(editorState, editorView, label);
    } catch (_error) {
      console.error('Error checking if command is enabled:', _error);
      disabled = false;
    }
    return (
      <CustomMenuItem
        active={command.isActive(editorState)}
        disabled={disabled}
        icon={icon}
        key={label}
        label={
          icon
            ? null
            : (command.renderLabel(editorState) as
                | string
                | React.ReactElement) || label
        }
        onClick={this._onUIEnter}
        onMouseEnter={this._onUIEnter}
        value={command}
        theme={theme}
        title={title}
      />
    );
  };

  _renderMenuButton = (
    label: string,
    commandGroups: Array<unknown>,
    theme: string
  ): React.ReactElement<CommandMenuButton> => {
    const {editorState, editorView, dispatch} = this.props;
    const {icon, title} = parseLabel(label, theme);
    let isDropdown = false;
    if (commandGroups && commandGroups.length > 0) {
      isDropdown = isUICommandLike(commandGroups[0]);
    }

    return (
      <CommandMenuButton
        commandGroups={commandGroups}
        disabled={false}
        dispatch={dispatch}
        editorState={editorState}
        editorView={editorView}
        icon={icon}
        key={label}
        label={icon ? null : title}
        sub={!isDropdown}
        title={title}
      />
    );
  };

  _onUIEnter = (command: UICommand, event: React.SyntheticEvent): void => {
    if (command.shouldRespondToUIEvent(event)) {
      if (this._activeCommand && this._activeCommand !== command) {
        this._activeCommand.cancel();
      }
      this._activeCommand = command;
      this._execute(command, event);
    }
  };

  _execute = (command: UICommand, e: React.SyntheticEvent): void => {
    const {dispatch, editorState, editorView, onCommand} = this.props;
    if (command.execute(editorState, dispatch, editorView, e, onCommand)) {
      onCommand?.();
    }
  };
}

class CommandMenuButton extends React.PureComponent<PropsType, StateType> {
  declare props: PropsType;
  public static readonly contextType = ThemeContext;
  _menu = null;
  _id = uuid();

  state = {
    expanded: false,
  };

  render(): React.ReactElement<CustomButton> {
    let hasChild = false;
    const {
      className,
      label,
      commandGroups,
      editorState,
      editorView,
      icon,
      disabled,
      title,
    } = this.props;
    const enabled =
      !disabled &&
      commandGroups.some((group) => {
        return Object.keys(group).some((grpLabel) => {
          hasChild = true;
          const command = group[grpLabel];
          let disabledVal = true;
          try {
            disabledVal =
              !editorView ||
              !command.isEnabled(editorState, editorView, grpLabel);
          } catch (_error) {
            console.error('Error checking if command is enabled:', _error);
            disabledVal = false;
          }
          return !disabledVal;
        });
      });

    const {expanded} = this.state;
    const isMaximizeButton = isExpandButton(title);
    const theme_1 = UICommand.theme;
    const buttonClassName = cx(className, {
      'czi-custom-menu-button': true,
      'menu-expand-btn': isMaximizeButton,
      expanded,
    });

    return (
      <CustomButton
        className={buttonClassName}
        disabled={!enabled}
        hasChild={hasChild && !isMaximizeButton}
        icon={icon}
        id={this._id}
        label={label || (hasChild && !isMaximizeButton ? '?' : null)}
        onClick={this._onClick}
        theme={theme_1.toString()}
        title={title}
      />
    );
  }

  componentWillUnmount(): void {
    this._hideMenu();
  }

  _onClick = (): void => {
    this.setState((prevState) => {
      const expanded = !prevState.expanded;
      if (expanded) {
        this._showMenu();
      } else {
        this._hideMenu();
      }
      return { expanded };
    });
  };

  _hideMenu = (): void => {
    const menu = this._menu;
    this._menu = null;
    menu?.close();
  };

  _showMenu = (): void => {
    const menu = this._menu;
    const menuProps = {
      ...this.props,
      onCommand: this._onCommand,
      theme: UICommand.theme,
    };
    if (menu) {
      menu.update(menuProps);
    } else {
      let hasPopupId = false;
      if (menuProps.commandGroups[0]['Insert Table...']) {
        hasPopupId = true;
      }
      const popUpProps = {
        anchor: document.getElementById(this._id),
        onClose: this._onClose,
        IsChildDialog: true,
        autoDismiss: true,
        popUpId: menuProps.commandGroups[0]['Single']
          ? 'mo-menuList-1'
          : 'mo-menuList',
      };
      if (hasPopupId) {
        popUpProps.popUpId = null;
      }
      if (this.props.sub) {
        popUpProps['position'] = atAnchorRight;
      }
      this._menu = createPopUp(CommandMenu, menuProps, popUpProps);
    }
  };

  _onCommand = (): void => {
    this.setState({expanded: false});
    this._hideMenu();
  };

  _onClose = (): void => {
    if (this._menu) {
      this.setState({expanded: false});
      this._menu = null;
    }
  };
}

export default CommandMenuButton;
