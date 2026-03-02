/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';

import { CustomButton, ViewProps } from '@modusoperandi/licit-ui-commands';

export interface HamBurgerIconProps extends ViewProps {
  onMouseOut: () => void;
  options: { label: string; command: (e: Event) => void }[];
}
export class HamBurgerIcon extends React.PureComponent<HamBurgerIconProps> {
  render(): React.ReactElement<HamBurgerIcon> {
    const { onMouseOut } = this.props;
    return (
      <div
        className="popup-container"
        onMouseLeave={onMouseOut}
        role="menu"
        tabIndex={-1}
      >
        <div className="dropdown-content">
          {this.props.options.map((x) => (
            <CustomButton key={x.label} label={x.label} onClick={x.command} />
          ))}
        </div>
      </div>
    );
  }
}
