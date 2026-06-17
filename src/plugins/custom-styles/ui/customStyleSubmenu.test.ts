/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { UICommand } from '../../../core';
import { RESERVED_STYLE_NONE } from '../CustomStyleNodeSpec';
import { CustomStyleSubMenu } from './CustomStyleSubMenu';
import { RESERVED_STYLE_NONE } from '../CustomStyleNodeSpec';

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

  it('renders large menu when style is not None', () => {
    const props = {
      command: { _customStyleName: 'Heading' } as unknown as UICommand,
      theme: 'light',
      close: jest.fn(),
    };
    const rendered = new CustomStyleSubMenu(props).render();

    expect(rendered.props.className).toContain('div-height-large');
    expect(rendered.props.children).toHaveLength(2);
  });

  it('renders compact menu when style is None', () => {
    const props = {
      command: {
        _customStyleName: RESERVED_STYLE_NONE,
      } as unknown as UICommand,
      theme: 'dark',
      close: jest.fn(),
    };
    const rendered = new CustomStyleSubMenu(props).render();

    expect(rendered.props.className).toContain('div-height-small');
    expect(rendered.props.children[1]).toBe(false);
  });
});

