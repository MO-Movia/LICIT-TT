import * as React from 'react';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { EditorState } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import { EditorView } from '@tiptap/pm/view';
import uuid from './uuid';

// [FS] IRAD-1039 2020-09-24
// UI to show the list buttons

class ListTypeMenu extends React.PureComponent {
  _activeCommand: UICommand = null;
  declare props: {
    className?: string;
    commandGroups: Array<any>;
    disabled?: boolean;
    dispatch: (tr: Transform) => void;
    editorState: EditorState;
    editorView: EditorView;
    onCommand;
    icon?: string | React.ReactElement | null;
    label?: string | React.ReactElement | null;
    title?: string;
    theme?: string;
  };

  _menu = null;
  _id = uuid();

  state = {
    expanded: false,
  };

  render(): JSX.Element {
    const { commandGroups } = this.props;
    const children = [];
    const theme = this.props.theme;
    let className = 'buttonsize ' + theme;
    let cont_classname = 'ol-container ' + theme;
    commandGroups.forEach((group, _ii) => {
      Object.keys(group).forEach((label) => {
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
      });
    });
    return <div className={cont_classname}>{children}</div>;
  }

  _onUIEnter = (command: UICommand, event: React.SyntheticEvent): void => {
    this._activeCommand && this._activeCommand.cancel();
    this._activeCommand = command;
    this._execute(command, event);
  };

  _execute = (command: UICommand, e: React.SyntheticEvent): void => {
    const { dispatch, editorState, editorView, onCommand } = this.props;
    if (command.execute(editorState, dispatch, editorView, e)) {
      onCommand && onCommand();
    }
  };
}

export default ListTypeMenu;
