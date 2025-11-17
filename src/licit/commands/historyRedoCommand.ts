import { EditorState } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import { EditorView } from '@tiptap/pm/view';

import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { Editor } from '@tiptap/react';

class HistoryRedoCommand extends UICommand {
  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }
  getEditor = (): Editor | null => {
    return UICommand.prototype.editor || null;
  };

  isEnabled = (_state: EditorState): boolean => {
    const history = (_state as any).history$;
    return history?.undone?.eventCount > 0 || false;
  };

  execute = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView
  ): boolean => {
    const editor = this.getEditor();
    if (!editor) {
      console.error('Editor instance is not available.');
      return false;
    }
    return editor.commands.redo();
  };

  waitForUserInput = (): Promise<null> => Promise.resolve(null);

  executeWithUserInput = (): boolean => false;

  cancel = (): void => {
    console.log('Cancel called on HistoryRedoCommand.');
  };

  executeCustom = (state: EditorState, tr: Transform): Transform => tr;
}

export default HistoryRedoCommand;
