/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Transform} from 'prosemirror-transform';
import {ImageUploadCommand} from './ImageUploadCommand';

describe('ImageUploadCommand', () => {
  it('should noop executeCustom', () => {
    const tr = {} as Transform;
    const command = new ImageUploadCommand();
    expect(command.executeCustom(null!, tr)).toBe(tr);
  });
  it('should noop executeCustomStyleForTable', () => {
    const tr = {} as Transform;
    const command = new ImageUploadCommand();
    expect(command.executeCustomStyleForTable(null!, tr)).toBe(tr);
  });
  it('should return false for isActive', () => {
    const command = new ImageUploadCommand();
    expect(command.isActive()).toBe(false);
  });
  it('should return null for renderLabel', () => {
    const command = new ImageUploadCommand();
    expect(command.renderLabel()).toBeNull();
  });
  it('should return ImageUploadEditor for getEditor', () => {
    const command = new ImageUploadCommand();
    expect(command.getEditor()).toBeDefined();
  });
});
