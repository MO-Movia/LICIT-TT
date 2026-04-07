/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import CustomMenuItem from './customMenuItem';

describe('CustomMenuItem', () => {
  it('uses default class when alignment flag is missing', () => {
    const instance = new (CustomMenuItem as unknown as {
      new (props: Record<string, unknown>): React.Component;
    })({
      value: {},
      theme: 'light',
      onClick: () => undefined,
    });
    const element = instance.render() as React.ReactElement;
    expect(element.props.className).toBe('czi-custom-menu-item light');
  });

  it('uses button class when alignment flag is present', () => {
    const instance = new (CustomMenuItem as unknown as {
      new (props: Record<string, unknown>): React.Component;
    })({
      value: {_alignment: true},
      theme: 'dark',
      onClick: () => undefined,
    });
    const element = instance.render() as React.ReactElement;
    expect(element.props.className).toBe('czi-custom-menu-item-button dark');
  });
});
