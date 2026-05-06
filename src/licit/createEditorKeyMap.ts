/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { MarkToggleCommand } from '../commands';
import { Command } from 'prosemirror-state';
import * as EditorCommands from './editorCommands';
import * as EditorKeyMap from './editorKeyMap';

 
export default function createEditorKeyMap(): Record<string, Command> {
  return {
    [EditorKeyMap.KEY_SPLIT_LIST_ITEM.common]:
      EditorCommands.LIST_SPLIT.execute as unknown as Command,
      [EditorKeyMap.KEY_TOGGLE_BOLD.common]: (EditorCommands.STRONG as MarkToggleCommand).execute as unknown as Command,
      [EditorKeyMap.KEY_TOGGLE_ITALIC.common]: (EditorCommands.EM as MarkToggleCommand).execute as unknown as Command,
      [EditorKeyMap.KEY_TOGGLE_UNDERLINE.common]: (EditorCommands.UNDERLINE as MarkToggleCommand).execute as unknown as Command,
      [EditorKeyMap.KEY_TOGGLE_STRIKETHROUGH.common]: (EditorCommands.STRIKE as MarkToggleCommand).execute as unknown as Command,
  };
}
