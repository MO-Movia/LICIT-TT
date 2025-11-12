import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import {createCommand} from './CreateCommand';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';

describe('create command', () => {
  let command: UICommand;
  beforeEach(() => {
    let executecall = () => {
      return true;
    };
    command = createCommand(executecall);
  });

  it('should return new custom command', () => {
    expect(command).toBeDefined();
  });

  it('should execute', () => {
    const mockState = {
        tr: {
          docChanged: false
        }
    } as unknown as EditorState;
    expect(command.execute(mockState)).toBeFalsy();
  });

  it('should cancel', () => {
    expect(command.cancel()).toBeNull();
  });

  it('should render label', () => {
    const mockState = null as unknown as EditorState;
    expect(command.renderLabel(mockState)).toBeNull();
  });

  it('should be active', () => {
    const mockState = null as unknown as EditorState;
    expect(command.isActive(mockState)).toBeTruthy();
  });

  it('should execute Custom', () => {
    const mockState = null as unknown as EditorState;
    const mockTr = {} as unknown as Transform;
    expect(command.executeCustom(mockState, mockTr, 0, 0)).toBe(mockTr);
  });

  it('should execute with user input', () => {
    const mockState = null as unknown as EditorState;
    expect(command.executeWithUserInput(mockState)).toBeFalsy();
  });

  it('should wait', async () => {
    const mockState = null as unknown as EditorState;
    expect(await command.waitForUserInput(mockState)).toBeFalsy();
  });
});
