/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import { EditorState } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import React from 'react';
import { CustomButton, createPopUp, ThemeContext } from '../../../commands';
import { UICommand } from '../../../core';
import { uuid } from './Uuid';
import { CustomMenuUI } from './CustomMenuUI';

export class CustomMenuButton extends React.PureComponent<
  {
    className?: string;
    commandGroups: Array<{ [string: string]: UICommand }>;
    staticCommand: Array<{ [string: string]: UICommand }>;
    disabled?: boolean;
    dispatch: (tr: Transform) => void;
    editorState: EditorState;
    editorView?: EditorView | null;
    icon?: string | React.ReactElement | null;
    label?: string | React.ReactElement | null;
    title?: string;
  },
  {
    expanded: boolean;
  }
> {
  state = {
    expanded: false,
  };
  static readonly contextType = ThemeContext;
  _menu  = null;
  _id = uuid();

  render(): React.ReactElement {
    const { className, label, icon, title } = this.props;
    const { expanded } = this.state;
    const theme_1 = this.context;
    const buttonClassName = cx(className, {
      'czi-custom-menu-button': true,
      expanded,
    });

    return (
      <CustomButton
        className={buttonClassName}
        disabled={this.props.disabled}
        icon={icon}
        id={this._id}
        label={label}
        onClick={this._onClick}
        theme={typeof theme_1 === 'string' ? theme_1 : 'light'}
        title={title}
      />
    );
  }

  componentWillUnmount(): void {
    this._hideMenu();
  }

  _onClick = (): void => {
    this.setState((lastState) => {
      const expanded = !lastState.expanded;
      if (expanded) {
        this._showMenu();
      } else {
        this._hideMenu();
      }
      return {
        expanded,
      };
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
      theme:this.context
      // popupId: this._popupId
    };
    if (menu) {
      menu.update(menuProps);
    } else {
      this._menu = createPopUp(CustomMenuUI, menuProps, {
        autoDismiss: true,
        // Id: this._popupId,
        anchor: document.getElementById(this._id),
        onClose: this._onClose,
      });
    }
  };

  _onCommand = (): void => {
    this.setState({ expanded: false });
    this._hideMenu();
  };

  _onClose = (): void => {
    if (this._menu) {
      this.setState({ expanded: false });
      this._menu = null;
    }
  };
}
