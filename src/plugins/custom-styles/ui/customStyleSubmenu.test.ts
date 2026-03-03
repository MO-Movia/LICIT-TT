/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { UICommand } from '../../../core';
import { CustomStyleSubMenu } from './CustomStyleSubMenu';

describe('CustomStyleSubMenu', () => {
  it('should handle onclick', () => {
    const props = {
      command: {} as UICommand,
      disabled: true,
      close: jest.fn(),
    };


    const customstylesubmenu = new CustomStyleSubMenu(props);


    customstylesubmenu.onButtonClick({ type: 'close', command: props.command });


    expect(props.close).toHaveBeenCalledWith({ type: 'close', command: props.command });
  });
});


