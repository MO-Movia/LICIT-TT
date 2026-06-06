/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import * as React from 'react';

import { preventEventDefault } from './preventEventDefault';
import { EditorView } from 'prosemirror-view';
import { UICommand } from '../../core';

export type PointerSurfaceProps = {
  active?: boolean;
  children?;
  className?: string;
  disabled?: boolean;
  id?: string;
  onClick?: (val, e: React.SyntheticEvent) => void;
  onMouseEnter?: (val, e: React.SyntheticEvent) => void;
  style?: Record<string, unknown>;
  title?: string;
  // value?: any;
  value?: string | number | Record<string, unknown> | EditorView | UICommand;
  hasChild?: boolean;
};

export class PointerSurface extends React.PureComponent {
  declare props: PointerSurfaceProps;

  _clicked = false;
  _mul = false;
  _pressedTarget = null;

  state = { pressed: false };

  render(): React.ReactElement {
    const { className, disabled, id, style, title, children } = this.props;
    const { pressed } = this.state;

    const buttonClassName = cx(className, {
      disabled: disabled,
      pressed: pressed,
    });

    return (
      <span
        aria-disabled={disabled}
        aria-pressed={pressed}
        className={buttonClassName}
        id={id}
        onKeyDown={disabled ? preventEventDefault : this._onMouseUp}
        onMouseDown={disabled ? preventEventDefault : this._onMouseDown}
        onMouseEnter={this._onMouseEnter}
        onMouseLeave={this._onMouseLeave}
        onMouseUp={disabled ? preventEventDefault : this._onMouseUp}
        role="button"
        style={style}
        tabIndex={disabled ? null : 0}
        title={title}
      >
        {children}
      </span>
    );
  }

  componentWillUnmount(): void {
    if (this._mul) {
      this._mul = false;
      document.removeEventListener('mouseup', this._onMouseUpCapture, true);
    }
  }

  _onMouseEnter = (e: React.SyntheticEvent): void => {
    this._pressedTarget = null;
    e.preventDefault();
    const { onMouseEnter, value } = this.props;
    onMouseEnter?.(value, e);
  };

  _onMouseLeave = (e: React.MouseEvent): void => {
    this._pressedTarget = null;
    const mouseUpEvent: MouseEvent = e as unknown as MouseEvent;
    this._onMouseUpCapture(mouseUpEvent);
  };

  _onMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();

    this._pressedTarget = null;
    this._clicked = false;

    if (e['which'] === 3 || e.button == 2) {
      // right click.
      return;
    }

    this.setState({ pressed: true });
    this._pressedTarget = e.currentTarget;
    this._clicked = false;

    if (!this._mul) {
      document.addEventListener('mouseup', this._onMouseUpCapture, true);
      this._mul = true;
    }
  };

  _onMouseUp = (e: React.SyntheticEvent): void => {
    e.preventDefault();

    if (this._clicked || e.type === 'keypress') {
      const { onClick, value, disabled } = this.props;
      if (!disabled && onClick) {
        onClick(value, e);
      }
    }

    this._pressedTarget = null;
    this._clicked = false;
  };

  _onMouseUpCapture = (e: MouseEvent): void => {
    if (this._mul) {
      this._mul = false;
      document.removeEventListener('mouseup', this._onMouseUpCapture, true);
    }
    const target = e.target;
    this._clicked =
      this._pressedTarget instanceof HTMLElement &&
      target instanceof HTMLElement &&
      (target === this._pressedTarget ||
        target.contains(this._pressedTarget) ||
        this._pressedTarget.contains(target));
    this.setState({ pressed: false });
  };
}
