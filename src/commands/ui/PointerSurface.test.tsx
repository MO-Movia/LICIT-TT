/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { isValidElement, PureComponent, createElement } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { PointerSurface } from './PointerSurface';

function render(props = {}): ReactElement {
  return new PointerSurface(props).render();
}

function spanProps(props = {}): Record<string, unknown> {
  return render(props).props as Record<string, unknown>;
}

describe('PointerSurface', () => {

  it('extends React.PureComponent', () => {
    expect(Object.getPrototypeOf(PointerSurface)).toBe(PureComponent);
  });

  it('render() returns a valid React element', () => {
    expect(isValidElement(render())).toBe(true);
  });

  it('renders a <button> with role="button"', () => {
    expect(render().type).toBe('span');
    expect(spanProps().role).toBe('button');
  });

  it('forwards id, style, title, children to <button>', () => {
    const style = { color: 'red' };
    const child = createElement('span', { key: 'c' }, 'hi');
    expect(spanProps({ id: 'x' }).id).toBe('x');
    expect(spanProps({ style }).style).toBe(style);
    expect(spanProps({ title: 'tip' }).title).toBe('tip');
    expect(spanProps({ children: child }).children).toBe(child);
  });

  it('sets aria-disabled from disabled prop', () => {
    expect(spanProps({ disabled: true })['aria-disabled']).toBe(true);
    expect(spanProps({ disabled: false })['aria-disabled']).toBe(false);
  });

  it('sets aria-pressed from state.pressed', () => {
    const instance = new PointerSurface({});
    instance.state = { pressed: true };
    expect(((instance.render()).props as Record<string, unknown>)['aria-pressed']).toBe(true);
  });

  it('sets tabIndex=0 when enabled, null when disabled', () => {
    expect(spanProps({ disabled: false }).tabIndex).toBe(0);
    expect(spanProps({ disabled: true }).tabIndex).toBeNull();
  });

  it('includes caller className', () => {
    expect(spanProps({ className: 'foo' }).className).toContain('foo');
  });

  it('adds "disabled" class only when disabled=true', () => {
    expect(spanProps({ disabled: true }).className).toContain('disabled');
    expect(spanProps({ disabled: false }).className).not.toContain('disabled');
  });

  it('adds "pressed" class only when state.pressed=true', () => {
    const on = new PointerSurface({});
    on.state = { pressed: true };
    expect((on.render()).props.className).toContain('pressed');

    const off = new PointerSurface({});
    off.state = { pressed: false };
    expect((off.render()).props.className).not.toContain('pressed');
  });

  it('wires own handlers when enabled', () => {
    const instance = new PointerSurface({});
    const p = (instance.render()).props as Record<string, unknown>;
    expect(p.onMouseDown).toBe(instance._onMouseDown);
    expect(p.onMouseUp).toBe(instance._onMouseUp);
    expect(p.onMouseEnter).toBe(instance._onMouseEnter);
    expect(p.onMouseLeave).toBe(instance._onMouseLeave);
    expect(p.onKeyDown).toBe(instance._onMouseUp);
  });

  it('replaces handlers with preventEventDefault (or null) when disabled', () => {
    const instance = new PointerSurface({ disabled: true });
    const p = (instance.render()).props as Record<string, unknown>;
    expect(typeof p.onMouseDown).toBe('function');
    expect(p.onMouseDown).not.toBe(instance._onMouseDown);
    expect(p.onMouseLeave).toBeDefined();
  });

  it('initialises state and instance fields correctly', () => {
    const instance = new PointerSurface({});
    expect(instance.state).toEqual({ pressed: false });
    expect(instance._clicked).toBe(false);
    expect(instance._mul).toBe(false);
    expect(instance._pressedTarget).toBeNull();
  });

  it('_onMouseEnter calls preventDefault, fires prop callback, resets _pressedTarget', () => {
    const onMouseEnter = jest.fn();
    const instance = new PointerSurface({ onMouseEnter, value: 'v' });
    instance._pressedTarget = document.createElement('div');
    const e = { preventDefault: jest.fn() } as unknown as SyntheticEvent;
    instance._onMouseEnter(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(onMouseEnter).toHaveBeenCalledWith('v', e);
    expect(instance._pressedTarget).toBeNull();
  });

  it('_onMouseEnter does not throw when onMouseEnter prop is absent', () => {
    const instance = new PointerSurface({});
    expect(() => instance._onMouseEnter({ preventDefault: () => {} } as SyntheticEvent)).not.toThrow();
  });

  it('_onMouseDown ignores right-click', () => {
    const instance = new PointerSurface({});
    instance.setState = jest.fn();
    const e = { preventDefault: jest.fn(), which: 3, button: 2 } as unknown as React.MouseEvent;
    instance._onMouseDown(e);
    expect(instance.setState).not.toHaveBeenCalled();
  });

  it('_onMouseDown on left-click sets pressed, stores target, registers listener', () => {
    const instance = new PointerSurface({});
    instance.setState = jest.fn();
    const spy = jest.spyOn(document, 'addEventListener');
    const currentTarget = document.createElement('span');
    const e = { preventDefault: jest.fn(), which: 1, button: 0, currentTarget } as unknown as React.MouseEvent;
    instance._onMouseDown(e);
    expect(instance.setState).toHaveBeenCalledWith({ pressed: true });
    expect(instance._pressedTarget).toBe(currentTarget);
    expect(instance._mul).toBe(true);
    expect(spy).toHaveBeenCalledWith('mouseup', instance._onMouseUpCapture, true);
    spy.mockRestore();
  });

  it('_onMouseDown does not add duplicate listener when _mul=true', () => {
    const instance = new PointerSurface({});
    instance.setState = jest.fn();
    instance._mul = true;
    const spy = jest.spyOn(document, 'addEventListener');
    const e = { preventDefault: jest.fn(), which: 1, button: 0, currentTarget: document.createElement('span') } as unknown as React.MouseEvent;
    instance._onMouseDown(e);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('_onMouseUp fires onClick when _clicked=true', () => {
    const onClick = jest.fn();
    const instance = new PointerSurface({ onClick, value: 99 });
    instance._clicked = true;
    const e = { preventDefault: jest.fn(), type: 'mouseup' } as unknown as SyntheticEvent;
    instance._onMouseUp(e);
    expect(onClick).toHaveBeenCalledWith(99, e);
  });

  it('_onMouseUp fires onClick when event.type is "keypress"', () => {
    const onClick = jest.fn();
    const instance = new PointerSurface({ onClick });
    instance._clicked = false;
    instance._onMouseUp({ preventDefault: jest.fn(), type: 'keypress' } as unknown as SyntheticEvent);
    expect(onClick).toHaveBeenCalled();
  });

  it('_onMouseUp does NOT fire onClick when disabled or _clicked=false', () => {
    const onClick = jest.fn();
    const disabledInstance = new PointerSurface({ onClick, disabled: true });
    disabledInstance._clicked = true;
    disabledInstance._onMouseUp({ preventDefault: jest.fn(), type: 'mouseup' } as unknown as SyntheticEvent);
    expect(onClick).not.toHaveBeenCalled();

    const notClickedInstance = new PointerSurface({ onClick });
    notClickedInstance._clicked = false;
    notClickedInstance._onMouseUp({ preventDefault: jest.fn(), type: 'mouseup' } as unknown as SyntheticEvent);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('_onMouseUp resets _clicked and _pressedTarget', () => {
    const instance = new PointerSurface({ onClick: jest.fn() });
    instance._clicked = true;
    instance._pressedTarget = document.createElement('div');
    instance._onMouseUp({ preventDefault: jest.fn(), type: 'mouseup' } as unknown as SyntheticEvent);
    expect(instance._clicked).toBe(false);
    expect(instance._pressedTarget).toBeNull();
  });

  it('_onMouseUpCapture sets pressed:false and removes listener', () => {
    const instance = new PointerSurface({});
    instance.setState = jest.fn();
    instance._mul = true;
    const spy = jest.spyOn(document, 'removeEventListener');
    instance._onMouseUpCapture({ target: document.createElement('div') } as unknown as MouseEvent);
    expect(instance.setState).toHaveBeenCalledWith({ pressed: false });
    expect(instance._mul).toBe(false);
    expect(spy).toHaveBeenCalledWith('mouseup', instance._onMouseUpCapture, true);
    spy.mockRestore();
  });

  it('_onMouseUpCapture sets _clicked=true when target matches _pressedTarget', () => {
    const instance = new PointerSurface({});
    instance.setState = jest.fn();
    instance._mul = true;
    const el = document.createElement('div');
    instance._pressedTarget = el;
    instance._onMouseUpCapture({ target: el } as unknown as MouseEvent);
    expect(instance._clicked).toBe(true);
  });

  it('_onMouseUpCapture sets _clicked=true when _pressedTarget contains target', () => {
    const instance = new PointerSurface({});
    instance.setState = jest.fn();
    instance._mul = true;
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    instance._pressedTarget = parent;
    instance._onMouseUpCapture({ target: child } as unknown as MouseEvent);
    expect(instance._clicked).toBe(true);
  });

  it('_onMouseUpCapture sets _clicked=false for unrelated target or null _pressedTarget', () => {
    const instance = new PointerSurface({});
    instance.setState = jest.fn();
    instance._mul = true;
    instance._pressedTarget = null;
    instance._onMouseUpCapture({ target: document.createElement('div') } as unknown as MouseEvent);
    expect(instance._clicked).toBe(false);
  });

  it('componentWillUnmount removes listener when _mul=true, does nothing when _mul=false', () => {
    const active = new PointerSurface({});
    active._mul = true;
    const spy = jest.spyOn(document, 'removeEventListener');
    active.componentWillUnmount();
    expect(spy).toHaveBeenCalledWith('mouseup', active._onMouseUpCapture, true);
    expect(active._mul).toBe(false);
    spy.mockRestore();

    const inactive = new PointerSurface({});
    inactive._mul = false;
    const spy2 = jest.spyOn(document, 'removeEventListener');
    inactive.componentWillUnmount();
    expect(spy2).not.toHaveBeenCalled();
    spy2.mockRestore();
  });

});
