/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { UICommand } from '../../../core';
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

  it('renders the full submenu when the style is editable', () => {
    const command = {
      _customStyleName: 'Body Text',
    } as unknown as UICommand;
    const menu = new CustomStyleSubMenu({
      command,
      theme: 'dark',
      close: jest.fn(),
    });
    const rendered = menu.render();
    const children = rendered.props.children.filter(Boolean);
    const fragmentButtons = children[1].props.children;

    expect(rendered.props.className).toContain('div-height-large');
    expect(children).toHaveLength(2);
    expect(fragmentButtons).toHaveLength(2);
  });

  it('renders the compact submenu for the reserved style', () => {
    const command = {
      _customStyleName: RESERVED_STYLE_NONE,
    } as unknown as UICommand;
    const menu = new CustomStyleSubMenu({
      command,
      theme: 'light',
      close: jest.fn(),
    });
    const rendered = menu.render();
    const children = rendered.props.children.filter(Boolean);

    expect(rendered.props.className).toContain('div-height-small');
    expect(children).toHaveLength(1);
  });
});
