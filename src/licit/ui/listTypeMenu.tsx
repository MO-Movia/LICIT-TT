/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import { UICommand } from '../../core';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';

// [FS] IRAD-1039 2020-09-24
// UI to show the list buttons

class ListTypeMenu extends React.PureComponent {
  _activeCommand: UICommand = null;
  declare props: {
    commandGroups: Array<UICommand>;
    dispatch: (tr: Transform) => void;
    editorState: EditorState;
    editorView: EditorView;
    onCommand;
    theme?: string;
  };

  state = {
    expanded: false,
  };

  render(): JSX.Element {
    const {commandGroups} = this.props;
    const children = [];
    const theme = this.props.theme;
    const className = 'buttonsize ' + theme;
    const cont_classname = 'ol-container ' + theme;
    for (const group of commandGroups) {
      for (const label of Object.keys(group)) {
        const command = group[label];
        children.push(
          <button
            className={className}
            id={label}
            key={label}
            onClick={(e) => this._onUIEnter(command, e)}
            value={command}
          >
            {command.label}
          </button>
        );
      };
    };
    return <div className={cont_classname}>{children}</div>;
  }

  _onUIEnter = (command: UICommand, event: React.SyntheticEvent): void => {
    this._activeCommand?.cancel();
    this._activeCommand = command;
    this._execute(command, event);
  };

  _execute = (command: UICommand, e: React.SyntheticEvent): void => {
    const {dispatch, editorState, editorView, onCommand} = this.props;
    if (command.execute(editorState, dispatch, editorView, e)) {
      onCommand?.();
    }
  };
}

export default ListTypeMenu;
