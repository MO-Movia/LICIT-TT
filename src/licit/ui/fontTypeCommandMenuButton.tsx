/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import CommandMenuButton from './commandMenuButton';
import { FontTypeCommand } from '../../commands';
import * as React from 'react';
import { EditorState } from 'prosemirror-state';
import { FONT_TYPE_NAMES } from '../specs/fontTypeMarkSpec';
import findActiveFontType, {
  FONT_TYPE_NAME_DEFAULT,
} from '../findActiveFontType';
import { Transform } from 'prosemirror-transform';
import { editorType } from './fontSizeCommandMenuButton';
type PropsType = {
  dispatch: (tr: Transform) => void;
  editorState: EditorState;
  editorView?: editorType;
};
const FONT_TYPE_COMMANDS: Record<string, unknown> = {
  [FONT_TYPE_NAME_DEFAULT]: new FontTypeCommand(''),
};

for (const name of FONT_TYPE_NAMES) {
  FONT_TYPE_COMMANDS[name] = new FontTypeCommand(name);
};

const COMMAND_GROUPS = [FONT_TYPE_COMMANDS];

class FontTypeCommandMenuButton extends React.PureComponent<PropsType> {
  declare props: PropsType;

  render(): React.ReactElement<CommandMenuButton> {
    const { dispatch, editorState, editorView } = this.props;
    const fontType = findActiveFontType(editorState);
    const MAX_CHARS = 12;
    return (
      // <CommandMenuButton  className="width-100"
      <CommandMenuButton  className="width-100 czi-dropdown-border"
        // [FS] IRAD-1008 2020-07-16
        // Disable font type menu on editor disable state
        commandGroups={COMMAND_GROUPS}
        disabled={!!editorView?.disabled}
        dispatch={dispatch}
        editorState={editorState}
        editorView={editorView}
        label={fontType}
        title={fontType.length >= MAX_CHARS ? fontType : undefined}
      />
    );
  }
}

export default FontTypeCommandMenuButton;
