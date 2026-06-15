/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Step } from 'prosemirror-transform';
import { SetDocAttrStep } from './SetDocAttrStep';

describe('SetDocAttrStep', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rethrows unexpected registration errors', () => {
    jest.spyOn(Step, 'jsonID').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => SetDocAttrStep.register()).toThrow('boom');
  });

  it('treats duplicate registration as success', () => {
    jest.spyOn(Step, 'jsonID').mockImplementation(() => {
      throw new Error('Duplicate use of step JSON ID SetDocAttr');
    });

    expect(SetDocAttrStep.register()).toBe(true);
  });

  it('maps from JSON using the provided schema signature', () => {
    const step = SetDocAttrStep.fromJSON({} as never, {
      key: 'title',
      stepType: 'SetDocAttr',
      value: 'Updated',
    });

    expect(step).toBeInstanceOf(SetDocAttrStep);
    expect(step.key).toBe('title');
    expect(step.value).toBe('Updated');
  });
});
