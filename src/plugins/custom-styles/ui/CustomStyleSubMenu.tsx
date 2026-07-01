/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';

import React from 'react';
import { UICommand } from '../../../core';
import { CustomStyleCommand } from '../CustomStyleCommand';
import {
  RESERVED_STYLE_NONE
} from '../CustomStyleNodeSpec';

export class CustomStyleSubMenu extends React.PureComponent<
  {
    command: UICommand;
    theme?: string;
    disabled?: boolean;
    close: (value: unknown) => void;
  },
  unknown
> {
  render(): React.ReactElement {
    const { command, theme } = this.props;
    const styleName = (command as CustomStyleCommand)._customStyleName;
    const showMenu = styleName !== RESERVED_STYLE_NONE;

    const className = 'molsp-dropdown-content molsp-style-edit-menu ' + theme;
    const divClassName = cx(className, {
      'div-height-large': showMenu,
      'div-height-small': !showMenu,
    });

    return (
      <div
        className={divClassName}
        data-cy="cyStyleEditDropdown"
        id="mo-submenu"
      >
        <button
          type="button"
          onClick={() => this.onButtonClick({ type: 'modify', command })}
        >
          Modify Style..
        </button>

        {showMenu && (
          <>
            <button
              type="button"
              onClick={() => this.onButtonClick({ type: 'rename', command })}
            >
              Rename Style..
            </button>

            <button
              type="button"
              data-cy="cyStyleEditReset"
              onClick={() => this.onButtonClick({ type: 'remove', command })}
            >
              Reset Style to Normal..
            </button>
          </>
        )}
      </div>
    );
  }

  // handles the option button click, close the popup with selected values
  onButtonClick = (val: unknown) => {
    this.props.close(val);
  };
}
