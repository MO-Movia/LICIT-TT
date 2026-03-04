/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { isValidElement, Children, PureComponent } from 'react';
import type { ReactNode, ReactElement, ComponentType } from 'react';
import { CustomButton } from './CustomButton';

/** Recursively search for a React element whose type matches `typeName`. */
function findByTypeName(
  element: ReactNode,
  typeName: string
): ReactElement | null {
  if (!isValidElement(element)) return null;

  const elType = element.type;
  const name =
    typeof elType === 'string'
      ? elType
      : (elType as ComponentType).displayName ?? (elType as ComponentType).name ?? '';

  if (name === typeName) return element as ReactElement;

  const children = (element.props as Record<string, unknown>).children;
  if (!children) return null;

  for (const child of Children.toArray(children as ReactNode)) {
    const found = findByTypeName(child, typeName);
    if (found) return found;
  }

  return null;
}

/** Collect every className string that appears anywhere in the tree. */
function collectClassNames(element: ReactNode): string[] {
  if (!isValidElement(element)) return [];
  const props = element.props as Record<string, unknown>;
  const classes: string[] = props.className ? [props.className as string] : [];
  const children = props.children;
  if (children) {
    for (const child of Children.toArray(children as ReactNode)) {
      classes.push(...collectClassNames(child));
    }
  }
  return classes;
}

describe('CustomButton', () => {

  it('is a React.PureComponent subclass', () => {
    expect(Object.getPrototypeOf(CustomButton)).toBe(PureComponent);
  });

  it('render() returns a valid React element', () => {
    const instance = new CustomButton({ label: 'Click me' });
    expect(isValidElement(instance.render())).toBe(true);
  });

  describe('className construction', () => {

    it('always includes "czi-custom-button"', () => {
      const el = new CustomButton({ label: 'Hi' }).render();
      expect(collectClassNames(el).join(' ')).toContain('czi-custom-button');
    });

    it('appends a custom className when provided', () => {
      const el = new CustomButton({ className: 'my-class', label: 'Hi' }).render();
      expect(collectClassNames(el).join(' ')).toContain('my-class');
    });

    it('appends theme when provided', () => {
      const el = new CustomButton({ theme: 'dark', label: 'Hi' }).render();
      expect(collectClassNames(el).join(' ')).toContain('dark');
    });

    it('adds "is-active" when active=true', () => {
      const el = new CustomButton({ active: true, label: 'Hi' }).render();
      expect(collectClassNames(el).join(' ')).toContain('is-active');
    });

    it('does NOT add "is-active" when active is falsy', () => {
      const el = new CustomButton({ active: false, label: 'Hi' }).render();
      expect(collectClassNames(el).join(' ')).not.toContain('is-active');
    });

  });

  describe('child components', () => {

    it('renders a ThemeProvider wrapping everything', () => {
      const el = new CustomButton({ theme: 'dark', label: 'Hi' }).render();
      expect(findByTypeName(el, 'ThemeProvider')).not.toBeNull();
    });

    it('passes theme prop to ThemeProvider', () => {
      const el = new CustomButton({ theme: 'ocean' }).render();
      const tp = findByTypeName(el, 'ThemeProvider');
      expect((tp?.props as Record<string, unknown>).theme).toBe('ocean');
    });

    it('renders a TooltipSurface', () => {
      const el = new CustomButton({ label: 'Hi' }).render();
      expect(findByTypeName(el, 'TooltipSurface')).not.toBeNull();
    });

    it('passes title as tooltip to TooltipSurface', () => {
      const el = new CustomButton({ title: 'My tooltip' }).render();
      const ts = findByTypeName(el, 'TooltipSurface');
      expect((ts?.props as Record<string, unknown>).tooltip).toBe('My tooltip');
    });

    it('renders a PointerSurface', () => {
      const el = new CustomButton({ label: 'Hi' }).render();
      expect(findByTypeName(el, 'PointerSurface')).not.toBeNull();
    });

    it('forwards extra props to PointerSurface (e.g. onClick)', () => {
      const handler = () => {};
      const el = new CustomButton({ onClick: handler }).render();
      const ps = findByTypeName(el, 'PointerSurface');
      expect((ps?.props as Record<string, unknown>).onClick).toBe(handler);
    });

    it('does NOT forward title to PointerSurface', () => {
      const el = new CustomButton({ title: 'tip' }).render();
      const ps = findByTypeName(el, 'PointerSurface');
      expect((ps?.props as Record<string, unknown>).title).toBeUndefined();
    });

  });

  describe('icon and label rendering', () => {

    it('renders a string icon inside PointerSurface', () => {
      const el = new CustomButton({ icon: '★' }).render();
      const ps = findByTypeName(el, 'PointerSurface');
      const children = Children.toArray(
        (ps?.props as Record<string, unknown>).children as ReactNode
      );
      expect(children).toContain('★');
    });

    it('renders a string label inside PointerSurface', () => {
      const el = new CustomButton({ label: 'Save' }).render();
      const ps = findByTypeName(el, 'PointerSurface');
      const children = Children.toArray(
        (ps?.props as Record<string, unknown>).children as ReactNode
      );
      expect(children).toContain('Save');
    });

    it('renders null icon without crashing', () => {
      expect(() => new CustomButton({ icon: null }).render()).not.toThrow();
    });

    it('renders null label without crashing', () => {
      expect(() => new CustomButton({ label: null }).render()).not.toThrow();
    });

  });

});
