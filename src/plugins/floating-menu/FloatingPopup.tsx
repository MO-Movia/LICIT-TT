/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { FloatingMenuItem, FloatingMenuContext } from './model';
import { UICommand } from '../../core';
import CustomMenu from '../../licit/ui/customMenu';
import CustomMenuItem from '../../licit/ui/customMenuItem';

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
      <div className="context-menu floating-menu" role="menu" tabIndex={-1}>
        <CustomMenu theme={UICommand.theme}>
          {visibleItems.map((item) => {
            const enabled = item.isEnabled
              ? item.isEnabled(context)
              : true;

            return (
              <CustomMenuItem
                key={item.id}
                label={item.label}
                theme={UICommand.theme}
                disabled={!enabled}
                onClick={item.onClick}
                value={item.id}
              />
            );
          })}
        </CustomMenu>
      </div>
    );
  }
}
