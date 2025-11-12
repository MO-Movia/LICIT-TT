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
});
