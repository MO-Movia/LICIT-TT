/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import * as React from 'react';

import { FontSizeCommand } from '../../commands';
import {UICommand} from '../../core';
import CommandMenuButton from './commandMenuButton';
import findActiveFontSize from '../findActiveFontSize';

export type editorType = EditorView & {
  disabled: boolean;
};

type PropsType = {
  dispatch: (tr: Transform) => void;
  editorState: EditorState;
  editorView?: editorType;
};

type StateType = {
  inputValue: string;
  invalid: boolean;
  isEditing: boolean;
};

export const FONT_PT_SIZES = [
  6, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 30, 36, 42, 48, 60, 72, 90,
];

const FONT_PT_SIZE_COMMANDS = FONT_PT_SIZES.reduce((memo, size) => {
  memo[` ${size} `] = new FontSizeCommand(size);
  return memo;
}, {});

const COMMAND_GROUPS = [
  {Default: new FontSizeCommand(0)},
  FONT_PT_SIZE_COMMANDS,
];

export function parseFontSizeInput(value: string): number | null {
  const normalized = value.trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return null;
  }

  const fontSize = Number(normalized);
  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize : null;
}

class FontSizeCommandMenuButton extends React.PureComponent<
  PropsType,
  StateType
> {
  declare props: PropsType;

  state: StateType = {
    inputValue: '',
    invalid: false,
    isEditing: false,
  };

  componentDidUpdate(previousProps: PropsType): void {
    if (
      previousProps.editorState !== this.props.editorState &&
      this.state.isEditing
    ) {
      this.setState({invalid: false, isEditing: false});
    }
  }

  render(): React.ReactElement {
    const {dispatch, editorState, editorView} = this.props;
    const activeFontSize = String(findActiveFontSize(editorState));
    const fontSize = this.state.isEditing
      ? this.state.inputValue
      : activeFontSize;
    const className =
      (String(fontSize).length <= 2 ? 'width-30' : 'width-60') +
      ` czi-font-size-control czi-dropdown-border ${UICommand.theme}`;
    const disabled = !!editorView?.disabled;

    return (
      <span className={className}>
        <input
          aria-invalid={this.state.invalid}
          aria-label="Font size"
          className="czi-font-size-input"
          disabled={disabled}
          inputMode="decimal"
          onBlur={this._onInputBlur}
          onChange={this._onInputChange}
          onFocus={this._onInputFocus}
          onKeyDown={this._onInputKeyDown}
          title="Font size (press Enter to apply)"
          type="text"
          value={fontSize}
        />
        <CommandMenuButton
          className="czi-font-size-menu-trigger"
          // [FS] IRAD-1008 2020-07-16
          // Disable font size menu on editor disable state
          commandGroups={COMMAND_GROUPS}
          disabled={disabled}
          dispatch={dispatch}
          editorState={editorState}
          editorView={editorView}
          label={<span aria-hidden="true">&#9662;</span>}
          title="Choose font size"
        />
      </span>
    );
  }

  _onInputFocus = (event: React.FocusEvent<HTMLInputElement>): void => {
    event.currentTarget.select();
    this.setState({
      inputValue: event.currentTarget.value,
      invalid: false,
      isEditing: true,
    });
  };

  _onInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      inputValue: event.currentTarget.value,
      invalid: false,
      isEditing: true,
    });
  };

  _onInputBlur = (): void => {
    this.setState({invalid: false, isEditing: false});
  };

  _onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.setState({invalid: false, isEditing: false});
      event.currentTarget.blur();
      return;
    }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    this._applyInputValue();
  };

  _applyInputValue = (): void => {
    const fontSize = parseFontSizeInput(this.state.inputValue);
    if (fontSize === null) {
      this.setState({invalid: true});
      return;
    }

    const {dispatch, editorState, editorView} = this.props;
    new FontSizeCommand(fontSize).execute(editorState, dispatch);
    this.setState({
      inputValue: String(fontSize),
      invalid: false,
      isEditing: false,
    });
    editorView?.focus();
  };
}

export default FontSizeCommandMenuButton;
