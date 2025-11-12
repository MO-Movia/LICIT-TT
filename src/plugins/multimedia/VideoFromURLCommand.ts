import React from 'react';

import {VideoSourceCommand} from './VideoSourceCommand';
import {VideoEditor} from './ui/VideoEditor';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';

export class VideoFromURLCommand extends VideoSourceCommand {
  renderLabel() {
    return null;
  }

  isActive(): boolean {
    return true;
  }

  executeCustom(_state: EditorState, tr: Transform): Transform {
    return tr;
  }

  getEditor(): typeof React.Component {
    return VideoEditor;
  }

  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
  ): Transform {
    return tr;
  }
}
