/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import { EditorState } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { ListToggleCommand, hasImageNode } from '../commands/listToggleCommand';
import ListTypeButton from './listTypeButton';
import { EditorViewEx } from '../constants';
import { ThemeContext } from '../../commands';
import Icon from './icon';
import { UICommand } from '../../core';
const LIST_TYPE_NAMES = [
  {
    name: 'decimal',
    label: '1.',
  },
  {
    name: 'x.x.x',
    label: '1.1.1',
  },
  {
    name: 'num_bracket',
    label: '1)',
  },
  {
    name: 'num_bracket_closed',
    label: '(1)',
  },
  {
    name: 'upper_alpha_bracket',
    label: 'A)',
  },
  {
    name: 'lower_alpha_bracket',
    label: 'a)',
  },
  {
    name: 'lower_alpha_bracket_closed',
    label: '(a)',
  },
];
const LIST_TYPE_COMMANDS = {
  ['decimal']: new ListToggleCommand(true, 'decimal'),
};
for (const obj of LIST_TYPE_NAMES) {
  LIST_TYPE_COMMANDS[obj.name] = new ListToggleCommand(true, obj.name);
  LIST_TYPE_COMMANDS[obj.name].label = obj.label;
};

const COMMAND_GROUPS = [LIST_TYPE_COMMANDS] as unknown as Array<UICommand>;

class ListTypeCommandButton extends React.PureComponent {
  public static readonly contextType = ThemeContext;
  declare context: React.ContextType<typeof ThemeContext>;
  
 declare props: {
    dispatch: (tr: Transform) => void;
    editorState: EditorState;
    editorView?: EditorViewEx;
  };

  render(): React.ReactElement<ListTypeButton> {
    const { dispatch, editorState, editorView } = this.props;
    let disabled = false;
    const theme = this.context;
    if (editorState && editorView) {
      // [FS] IRAD-1317 2021-05-06
      // To disable the list menu when select an image
      disabled = hasImageNode(editorState);
      disabled = !!(editorView.disabled || disabled);
    }
    return (
      <ListTypeButton
        className="width-50 czi-icon format_list_numbered"
        commandGroups={COMMAND_GROUPS}
        disabled={disabled}
        dispatch={dispatch}
        editorState={editorState}
        editorView={editorView}
        icon={Icon.get('format_list_numbered')}
        theme={theme.toString()}
      />
    );
  }
}

export default ListTypeCommandButton;
