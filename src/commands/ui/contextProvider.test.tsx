/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { isValidElement, Component, createElement } from 'react';
import type { ReactElement } from 'react';
import { ThemeProvider, ThemeContext } from './contextProvider';

function render(props: { theme: string; children?: ReactElement }): ReactElement {
  const instance = new ThemeProvider({ children: props.children ?? null, theme: props.theme });
  return instance.render() as ReactElement;
}

function providerProps(el: ReactElement): Record<string, unknown> {
  return el.props as Record<string, unknown>;
}

describe('ThemeProvider', () => {

  it('extends React.Component', () => {
    expect(Object.getPrototypeOf(ThemeProvider)).toBe(Component);
  });

  it('render() returns a valid React element', () => {
    expect(isValidElement(render({ theme: 'light' }))).toBe(true);
  });

  it('passes theme as the value to Context.Provider', () => {
    expect(providerProps(render({ theme: 'dark' })).value).toBe('dark');
    expect(providerProps(render({ theme: 'light' })).value).toBe('light');
  });

  it('passes children through to Context.Provider', () => {
    const child = createElement('span', { key: 'c' }, 'hello');
    const el = render({ theme: 'light', children: child });
    expect(providerProps(el).children).toBe(child);
  });

  it('renders with any arbitrary theme string', () => {
    expect(providerProps(render({ theme: 'ocean' })).value).toBe('ocean');
    expect(providerProps(render({ theme: '' })).value).toBe('');
  });

  it('ThemeContext has a default value of "light"', () => {
    expect((ThemeContext as unknown as Record<string, unknown>)._currentValue).toBe('light');
  });

  it('ThemeContext is a valid React context object', () => {
    expect(ThemeContext).toHaveProperty('Provider');
    expect(ThemeContext).toHaveProperty('Consumer');
  });

});