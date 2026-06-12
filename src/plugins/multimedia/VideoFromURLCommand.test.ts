/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Transform} from 'prosemirror-transform';
import {VideoFromURLCommand} from './VideoFromURLCommand';

describe('VideoFromURLCommand', () => {
  it('should noop executeCustom', () => {
    const tr = {} as Transform;
    const command = new VideoFromURLCommand();
    expect(command.executeCustom(null!, tr)).toBe(tr);
  });
  it('should noop executeCustomStyleForTable', () => {
    const tr = {} as Transform;
    const command = new VideoFromURLCommand();
    expect(command.executeCustomStyleForTable(null!, tr)).toBe(tr);
  });
  it('should return true for isActive', () => {
    const command = new VideoFromURLCommand();
    expect(command.isActive()).toBe(true);
  });
  it('should return null for renderLabel', () => {
    const command = new VideoFromURLCommand();
    expect(command.renderLabel()).toBeNull();
  });
  it('should return VideoEditor for getEditor', () => {
    const command = new VideoFromURLCommand();
    expect(command.getEditor()).toBeDefined();
  });
});
