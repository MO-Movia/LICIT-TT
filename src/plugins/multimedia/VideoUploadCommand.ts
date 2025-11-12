import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import React from 'react';

import {VideoSourceCommand} from './VideoSourceCommand';
import {VideoUploadEditor} from './ui/VideoUploadEditor';
import type {EditorVideoRuntime} from './Types';
import {Transform} from 'prosemirror-transform';

export class VideoUploadCommand extends VideoSourceCommand {
  runtime: EditorVideoRuntime;
  isEnabled = (state: EditorState, view?: EditorView): boolean => {
    if (!view) {
      return false;
    }

    this.runtime = view['runtime'];
    if (!this.runtime) {
      return false;
    }

    const {canUploadVideo, uploadVideo} = this.runtime;
    if (!canUploadVideo || !uploadVideo) {
      return false;
    }
    if (!canUploadVideo()) {
      return false;
    }

    return this.__isEnabled(state, view);
  };

  getEditor(): typeof React.Component {
    return VideoUploadEditor;
  }

  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
  ): Transform {
    return tr;
  }
}
