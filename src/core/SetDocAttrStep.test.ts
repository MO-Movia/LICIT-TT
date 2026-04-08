/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {SetDocAttrStep} from './SetDocAttrStep';
import {Step} from 'prosemirror-transform';

describe('SetDocAttrStep', () => {
  it('should return null from merge when other is not SetDocAttrStep', () => {
    const step = new SetDocAttrStep('counterFlags', {a: 1});
    const merged = step.merge({} as unknown as SetDocAttrStep);
    expect(merged).toBeNull();
  });

  it('should rethrow non-duplicate registration errors', () => {
    const jsonIdSpy = jest.spyOn(Step, 'jsonID').mockImplementation(() => {
      throw new Error('unexpected registration failure');
    });

    expect(() => SetDocAttrStep.register()).toThrow(
      'unexpected registration failure'
    );
    jsonIdSpy.mockRestore();
  });
});
