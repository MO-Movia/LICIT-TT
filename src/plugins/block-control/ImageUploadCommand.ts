/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import React from 'react';

import {ImageSourceCommand} from './ImageSourceCommand';
import {ImageUploadEditor} from './ui/ImageUploadEditor';

export class ImageUploadCommand extends ImageSourceCommand {
  isEnabled = (state: EditorState, view: EditorView | null): boolean => {
    return this.__isEnabled(state, view);
  };

  getEditor(): typeof React.Component {
    return ImageUploadEditor;
  }
}
