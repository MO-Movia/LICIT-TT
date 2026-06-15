/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';

import { MarkToggleCommand } from '../../commands';

class MarkToggleCommandEx extends MarkToggleCommand {
  constructor(markName: string) {
    super(markName);
  }

  isEnabled = (_state: EditorState): boolean => {
    return true;
  };
}

export default MarkToggleCommandEx;
