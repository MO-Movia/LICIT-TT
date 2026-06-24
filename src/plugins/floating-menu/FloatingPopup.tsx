/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { FloatingMenuItem, FloatingMenuContext } from './model';
import { CustomButton } from '../../commands/ui/CustomButton';

interface FloatingMenuProps {
  context: FloatingMenuContext;
  items: FloatingMenuItem[];
  close: () => unknown;
}

export class FloatingMenu extends React.PureComponent<FloatingMenuProps> {
  render(): React.ReactNode {
    const {context, items, close} = this.props;

    return (
      <div className="context-menu" role="menu">
        <div className="context-menu__items">
          {items.map((item, index) => {
            let disabled: boolean | string | undefined = false;
            try {
              disabled = item.disabled?.(context);
            } catch (error) {
              disabled = String(error);
            }

            return (
              <CustomButton
                key={'FloatingMenuItem_' + index}
                label={
                  item.label + (disabled ? ' (' + String(disabled) + ')' : '')
                }
                disabled={!!disabled}
                onClick={() => {
                  close();
                  item.onClick(context);
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }
}
