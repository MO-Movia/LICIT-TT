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
});
