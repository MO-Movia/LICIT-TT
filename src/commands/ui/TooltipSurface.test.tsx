/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { isValidElement, PureComponent, createElement } from 'react';
import type { ReactElement } from 'react';
import { TooltipSurface } from './TooltipSurface';

// Mock external dependencies
jest.mock('./createPopUp', () => ({ createPopUp: jest.fn(() => ({ close: jest.fn() })) }));
jest.mock('./uuid', () => ({ uuid: () => 'test-uuid' }));
jest.mock('./PopUpPosition', () => ({
  atAnchorBottomCenter: 'atAnchorBottomCenter',
  atAnchorRight: 'atAnchorRight',
}));

import { createPopUp } from './createPopUp';

function render(props: { tooltip: string; children?: ReactElement }): ReactElement {
  const instance = new TooltipSurface(props);
  return instance.render() as ReactElement;
}

function spanProps(props: { tooltip: string; children?: ReactElement }): Record<string, unknown> {
  return render(props).props as Record<string, unknown>;
}

describe('TooltipSurface', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends React.PureComponent', () => {
    expect(Object.getPrototypeOf(TooltipSurface)).toBe(PureComponent);
  });

  it('render() returns a valid React element', () => {
    expect(isValidElement(render({ tooltip: 'tip' }))).toBe(true);
  });

  // <span> shape
  it('renders a <span> with role="tooltip"', () => {
    const el = render({ tooltip: 'tip' });
    expect(el.type).toBe('span');
    expect((el.props as Record<string, unknown>).role).toBe('tooltip');
  });

  it('has className "czi-tooltip-surface"', () => {
    expect(spanProps({ tooltip: 'tip' }).className).toBe('czi-tooltip-surface');
  });

  it('sets aria-label from tooltip prop', () => {
    expect(spanProps({ tooltip: 'my tip' })['aria-label']).toBe('my tip');
  });

  it('sets data-tooltip from tooltip prop', () => {
    expect(spanProps({ tooltip: 'my tip' })['data-tooltip']).toBe('my tip');
  });

  it('sets id from _id (uuid)', () => {
    expect(spanProps({ tooltip: 'tip' }).id).toBe('test-uuid');
  });

  it('passes children through', () => {
    const child = createElement('span', { key: 'c' }, 'hello');
    expect(spanProps({ tooltip: 'tip', children: child }).children).toBe(child);
  });

  // event handler wiring
  it('wires _onMouseEnter and _onMouseLeave when tooltip is truthy', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    const p = (instance.render() as ReactElement).props as Record<string, unknown>;
    expect(p.onMouseEnter).toBe(instance._onMouseEnter);
    expect(p.onMouseLeave).toBe(instance._onMouseLeave);
    expect(p.onMouseDown).toBe(instance._onMouseLeave);
  });

  it('sets onMouseEnter/onMouseLeave/onMouseDown to falsy when tooltip is empty', () => {
    const p = spanProps({ tooltip: '' });
    expect(p.onMouseEnter).toBeFalsy();
    expect(p.onMouseLeave).toBeFalsy();
    expect(p.onMouseDown).toBeFalsy();
  });

  // initial fields
  it('initialises _id from uuid()', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    expect(instance._id).toBe('test-uuid');
  });

  it('initialises _popUp to null', () => {
    expect(new TooltipSurface({ tooltip: 'tip' })._popUp).toBeNull();
  });

  // _onMouseLeave
  it('_onMouseLeave closes and nulls _popUp', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    const mockPopUp = { close: jest.fn() };
    instance._popUp = mockPopUp;
    instance._onMouseLeave();
    expect(mockPopUp.close).toHaveBeenCalled();
    expect(instance._popUp).toBeNull();
  });

  it('_onMouseLeave does not throw when _popUp is null', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    expect(() => instance._onMouseLeave()).not.toThrow();
  });

  // _onClose
  it('_onClose sets _popUp to null', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    instance._popUp = { close: jest.fn() };
    instance._onClose();
    expect(instance._popUp).toBeNull();
  });

  // _onMouseEnter
  it('_onMouseEnter creates a popUp for IMG target', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    document.body.innerHTML = `<span id="test-uuid"></span>`;
    const e = { target: { nodeName: 'IMG', className: '' } };
    instance._onMouseEnter(e);
    expect(createPopUp).toHaveBeenCalledWith(
      expect.anything(),
      { tooltip: 'tip' },
      expect.objectContaining({ anchor: document.getElementById('test-uuid') })
    );
  });

  it('_onMouseEnter creates a popUp for czi-custom-button target', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    document.body.innerHTML = `<span id="test-uuid"></span>`;
    const e = { target: { nodeName: 'SPAN', className: 'czi-custom-button active' } };
    instance._onMouseEnter(e);
    expect(createPopUp).toHaveBeenCalled();
  });

  it('_onMouseEnter does NOT create a popUp for unrecognised target', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    const e = { target: { nodeName: 'DIV', className: 'some-other-class' } };
    instance._onMouseEnter(e);
    expect(createPopUp).not.toHaveBeenCalled();
  });

  it('_onMouseEnter does NOT create a second popUp if one already exists', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    document.body.innerHTML = `<span id="test-uuid"></span>`;
    instance._popUp = { close: jest.fn() };
    const e = { target: { nodeName: 'IMG', className: '' } };
    instance._onMouseEnter(e);
    expect(createPopUp).not.toHaveBeenCalled();
  });

  it('_onMouseEnter uses atAnchorRight for alignment tooltips', () => {
    const instance = new TooltipSurface({ tooltip: 'center align' });
    document.body.innerHTML = `<span id="test-uuid"></span>`;
    const e = { target: { nodeName: 'IMG', className: '' } };
    instance._onMouseEnter(e);
    expect(createPopUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ position: 'atAnchorRight' })
    );
  });

  it('_onMouseEnter uses atAnchorBottomCenter for non-alignment tooltips', () => {
    const instance = new TooltipSurface({ tooltip: 'bold' });
    document.body.innerHTML = `<span id="test-uuid"></span>`;
    const e = { target: { nodeName: 'IMG', className: '' } };
    instance._onMouseEnter(e);
    expect(createPopUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ position: 'atAnchorBottomCenter' })
    );
  });

  it('_onMouseEnter registers _onClose as the onClose callback', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    document.body.innerHTML = `<span id="test-uuid"></span>`;
    const e = { target: { nodeName: 'IMG', className: '' } };
    instance._onMouseEnter(e);
    expect(createPopUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ onClose: instance._onClose })
    );
  });

  // componentWillUnmount
  it('componentWillUnmount closes _popUp if open', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    const mockPopUp = { close: jest.fn() };
    instance._popUp = mockPopUp;
    instance.componentWillUnmount();
    expect(mockPopUp.close).toHaveBeenCalled();
  });

  it('componentWillUnmount does not throw when _popUp is null', () => {
    const instance = new TooltipSurface({ tooltip: 'tip' });
    expect(() => instance.componentWillUnmount()).not.toThrow();
  });

});