/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BlockControlMenu } from './BlockControlMenu';
import type { BlockControlMenuItem } from './types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BlockControlMenu', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderMenu = (
    items?: BlockControlMenuItem[],
    close = jest.fn(),
    includeClose = true
  ) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <BlockControlMenu
          {...(includeClose ? { close } : {})}
          items={items}
        />
      );
    });

    return close;
  };

  const clickButton = (id: string) => {
    const button = container.querySelector<HTMLButtonElement>(
      `[data-id="${id}"]`
    );
    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it('renders visible menu items with icons and active class', () => {
    renderMenu([
      {
        id: 'visible',
        label: 'Visible',
        icon: <span data-testid="icon">Icon</span>,
        action: jest.fn(),
        active: true,
      },
      {
        id: 'hidden',
        label: 'Hidden',
        action: jest.fn(),
        hidden: true,
      },
    ]);

    expect(container.querySelector('[role="menu"]')).toBeTruthy();
    expect(container.querySelector('[data-id="visible"]')?.className).toContain(
      'active'
    );
    expect(container.querySelector('.licit-block-control-menu-icon')).toBeTruthy();
    expect(container.querySelector('[data-id="hidden"]')).toBeNull();
  });

  it('runs enabled item action and closes the menu', () => {
    const action = jest.fn();
    const close = renderMenu([
      {
        id: 'enabled',
        label: 'Enabled',
        action,
      },
    ]);

    clickButton('enabled');

    expect(action).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps the menu open when an item opens a child menu', () => {
    const action = jest.fn().mockReturnValue(false);
    const close = renderMenu([
      {
        id: 'child-menu',
        label: 'Child menu',
        action,
      },
    ]);

    clickButton('child-menu');

    expect(action).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    expect(close).not.toHaveBeenCalled();
  });

  it('does not run disabled item action or close the menu', () => {
    const action = jest.fn();
    const close = renderMenu([
      {
        id: 'disabled',
        label: 'Disabled',
        action,
        disabled: true,
      },
    ]);

    clickButton('disabled');

    expect(action).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('runs enabled item action when close is omitted', () => {
    const action = jest.fn();
    renderMenu([
      {
        id: 'no-close',
        label: 'No Close',
        action,
      },
    ], jest.fn(), false);

    clickButton('no-close');

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('renders an empty menu when items are omitted', () => {
    renderMenu(undefined);

    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
  });
});
