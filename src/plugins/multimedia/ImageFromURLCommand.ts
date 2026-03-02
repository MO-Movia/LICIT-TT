/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';

import {ImageSourceCommand} from './ImageSourceCommand';
import {ImageURLEditor} from './ui/ImageURLEditor';

export class ImageFromURLCommand extends ImageSourceCommand {
  getEditor(): typeof React.Component {
    return ImageURLEditor;
  }
}

export default ImageFromURLCommand;
