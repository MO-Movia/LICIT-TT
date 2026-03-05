/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { isValidElement, PureComponent, Children } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ColorEditor } from './ColorEditor';

function render(props: { close?: (hex: string) => void; hex?: string } = {}): ReactElement {
  const instance = new ColorEditor({ close: jest.fn(), ...props });
  return instance.render() as ReactElement;
}

function getChildren(el: ReactElement): ReactElement[] {
  return Children.toArray(
    (el.props as Record<string, unknown>).children as ReactNode
  ) as ReactElement[];
}

function buttonProps(btn: ReactElement): Record<string, unknown> {
  return btn.props as Record<string, unknown>;
}

describe('ColorEditor', () => {

  it('extends React.PureComponent', () => {
    expect(Object.getPrototypeOf(ColorEditor)).toBe(PureComponent);
  });

  it('render() returns a valid React element', () => {
    expect(isValidElement(render())).toBe(true);
  });

  it('root element has className "czi-color-editor"', () => {
    expect((render().props as Record<string, unknown>).className).toBe('czi-color-editor');
  });

  it('renders exactly 5 sections', () => {
    expect(getChildren(render())).toHaveLength(5);
  });

  it('every section has className "czi-color-editor-section"', () => {
    getChildren(render()).forEach(section => {
      expect((section.props as Record<string, unknown>).className).toBe('czi-color-editor-section');
    });
  });

  // Transparent button (section 0)
  it('first section contains the Transparent button', () => {
    const [firstSection] = getChildren(render());
    const btn = getChildren(firstSection)[0];
    expect(buttonProps(btn).label).toBe('Transparent');
    expect(buttonProps(btn).value).toBe('rgba(0,0,0,0)');
    expect(buttonProps(btn).className).toBe('czi-color-editor-color-transparent');
  });

  it('Transparent button is active when no hex prop is provided', () => {
    const [firstSection] = getChildren(render({ hex: undefined }));
    const btn = getChildren(firstSection)[0];
    expect(buttonProps(btn).active).toBe(true);
  });

  it('Transparent button is NOT active when a hex prop is provided', () => {
    const [firstSection] = getChildren(render({ hex: '#ff0000' }));
    const btn = getChildren(firstSection)[0];
    expect(buttonProps(btn).active).toBe(false);
  });

  // Grey section (section 1)
  it('grey section renders 10 color buttons', () => {
    const [, greySection] = getChildren(render());
    expect(getChildren(greySection)).toHaveLength(10);
  });

  it('grey buttons have className "czi-color-editor-cell"', () => {
    const [, greySection] = getChildren(render());
    getChildren(greySection).forEach(btn => {
      expect(buttonProps(btn).className).toBe('czi-color-editor-cell');
    });
  });

  it('grey buttons have a backgroundColor style set to a hex value', () => {
    const [, greySection] = getChildren(render());
    getChildren(greySection).forEach(btn => {
      const style = buttonProps(btn).style as Record<string, string>;
      expect(style.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('grey buttons have greyscale colors (r === g === b in hex)', () => {
    const [, greySection] = getChildren(render());
    getChildren(greySection).forEach(btn => {
      const hex = (buttonProps(btn).value as string).replace('#', '');
      const r = hex.slice(0, 2);
      const g = hex.slice(2, 4);
      const b = hex.slice(4, 6);
      expect(r).toBe(g);
      expect(g).toBe(b);
    });
  });

  // Rainbow sections (sections 2, 3, 4)
  it('section 2 renders 10 rainbow color buttons', () => {
    const [,, s2] = getChildren(render());
    expect(getChildren(s2)).toHaveLength(10);
  });

  it('section 3 renders 30 rainbow color buttons', () => {
    const [,,, s3] = getChildren(render());
    expect(getChildren(s3)).toHaveLength(30);
  });

  it('section 4 renders 30 rainbow color buttons', () => {
    const [,,,, s4] = getChildren(render());
    expect(getChildren(s4)).toHaveLength(30);
  });

  it('rainbow buttons have a valid hex value prop', () => {
    const [,, s2] = getChildren(render());
    getChildren(s2).forEach(btn => {
      expect(buttonProps(btn).value as string).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  // Active state matching
  it('marks the matching color button as active', () => {
    const el = render();
    const [, greySection] = getChildren(el);
    const buttons = getChildren(greySection);
    const activeBtn = buttons.find(btn => buttonProps(btn).active === true);
    // none should be active when hex doesn't match any grey
    expect(activeBtn).toBeUndefined();
  });

  it('marks a color button active when hex matches', () => {
    // get a real grey hex from a default render to use as prop
    const [, greySection] = getChildren(render());
    const firstGrey = getChildren(greySection)[0];
    const hex = buttonProps(firstGrey).value as string;

    const el = render({ hex });
    const [, section] = getChildren(el);
    const buttons = getChildren(section);
    const activeBtn = buttons.find(btn => buttonProps(btn).active === true);
    expect(activeBtn).toBeDefined();
    expect(buttonProps(activeBtn).value).toBe(hex);
  });

  it('color matching is case-insensitive', () => {
    const [, greySection] = getChildren(render());
    const firstGrey = getChildren(greySection)[0];
    const hex = (buttonProps(firstGrey).value as string).toUpperCase();

    const el = render({ hex });
    const [, section] = getChildren(el);
    const buttons = getChildren(section);
    const activeBtn = buttons.find(btn => buttonProps(btn).active === true);
    expect(activeBtn).toBeDefined();
  });

  // Button ids and keys
  it('color buttons have an id prop prefixed with "$c-btn-"', () => {
    const [, greySection] = getChildren(render());
    getChildren(greySection).forEach(btn => {
      expect((buttonProps(btn).id as string)).toMatch(/^\$c-btn-\d+$/);
    });
  });

  // _onSelectColor / close callback
  it('_onSelectColor calls props.close with the hex value', () => {
    const close = jest.fn();
    const instance = new ColorEditor({ close, hex: undefined });
    (instance as unknown as { _onSelectColor: (hex: string) => void })._onSelectColor('#aabbcc');
    expect(close).toHaveBeenCalledWith('#aabbcc');
  });

  it('color buttons wire onClick to _onSelectColor', () => {
    const close = jest.fn();
    const instance = new ColorEditor({ close });
    const el = instance.render() as ReactElement;
    const [, greySection] = getChildren(el);
    const btn = getChildren(greySection)[0];
    const onClick = buttonProps(btn).onClick as (hex: string) => void;
    const hex = buttonProps(btn).value as string;
    onClick(hex);
    expect(close).toHaveBeenCalledWith(hex);
  });

  it('Transparent button wires onClick and calls close with rgba value', () => {
    const close = jest.fn();
    const instance = new ColorEditor({ close });
    const el = instance.render() as ReactElement;
    const [firstSection] = getChildren(el);
    const btn = getChildren(firstSection)[0];
    const onClick = buttonProps(btn).onClick as (val: string) => void;
    onClick('rgba(0,0,0,0)');
    expect(close).toHaveBeenCalledWith('rgba(0,0,0,0)');
  });

});