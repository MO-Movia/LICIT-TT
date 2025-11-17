import { EditorState } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import TableColorCommand from './tableColorCommand';

class TableBorderColorCommand extends TableColorCommand {
  executeCustom(
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform {
    return tr;
  }
  constructor() {
    super('borderColor');
  }
}

export default TableBorderColorCommand;
