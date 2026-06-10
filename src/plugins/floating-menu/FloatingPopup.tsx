/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { CustomButton } from '../../commands';
import { FloatingMenuItem, FloatingMenuContext } from './model';
import { UICommand } from '../../core';

interface FloatingMenuProps {
  context: FloatingMenuContext;
  items: FloatingMenuItem[];
  isReadonly: boolean;
}

export class FloatingMenu extends React.PureComponent<FloatingMenuProps> {
  render(): React.ReactNode {
    const { context, items, isReadonly } = this.props;
    const readOnlySet = new Set(['comment','tag','copy','copy-plain','slice']);

    const visibleItems = isReadonly
      ? items.filter(item => readOnlySet.has(item.id))
      : items;

    return (
      <div className={"context-menu " + UICommand.theme }role="menu" tabIndex={-1}>
        <div className="context-menu__items">
          {visibleItems.map((item) => {
            const enabled = item.isEnabled
              ? item.isEnabled(context)
              : true;

            return (
              <CustomButton
                key={item.id}
                label={item.label}
                theme={UICommand.theme}
                disabled={!enabled}
                onClick={item.onClick}
              />
            );
          })}
        </div>
      </div>
    );
  }
}
