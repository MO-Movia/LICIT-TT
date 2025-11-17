import { EditorState } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import TableColorCommand from './tableColorCommand';

class TableBackgroundColorCommand extends TableColorCommand {
  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }
  executeCustom(
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform {
    return tr;
  }
  constructor() {
    super('backgroundColor');
  }
}

export default TableBackgroundColorCommand;
