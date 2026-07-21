/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';

import type {BlockControlMenuProps} from './types';

export class BlockControlMenu extends React.PureComponent<BlockControlMenuProps> {
  declare props: BlockControlMenuProps;

  render(): React.ReactElement {
    const items = (this.props.items || []).filter((item) => !item.hidden);

    return (
      <div className="licit-block-control-menu" role="menu">
        {items.map((item) => (
          <button
            className={
              'licit-block-control-menu-item' +
              (item.active ? ' active' : '') +
              (item.dividerBefore ? ' has-divider' : '')
            }
            data-id={item.id}
            disabled={item.disabled}
            key={item.id}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!item.disabled) {
                item.action();
                this.props.close?.();
              }
            }}
            role="menuitem"
            type="button"
          >
            {item.icon ? (
              <span className="licit-block-control-menu-icon">{item.icon}</span>
            ) : null}
            <span className="licit-block-control-menu-label">{item.label}</span>
            {item.hint ? (
              <span className="licit-block-control-menu-hint">{item.hint}</span>
            ) : null}
          </button>
        ))}
      </div>
    );
  }
}
