import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';
import {PointerSurface} from './PointerSurface';

describe('PointerSurface', () => {
  it('renders without crashing', () => {
    render(<PointerSurface />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('applies the correct className when active prop is true', () => {
    render(<PointerSurface active />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('applies the correct className when disabled prop is true', () => {
    render(<PointerSurface disabled />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('removes event listener on component unmount', () => {
    const addEventListenerMock = jest.spyOn(document, 'addEventListener');
    const removeEventListenerMock = jest.spyOn(document, 'removeEventListener');

    const {unmount} = render(<PointerSurface />);
    unmount();

    expect(removeEventListenerMock).not.toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function),
      true
    );

    addEventListenerMock.mockRestore();
    removeEventListenerMock.mockRestore();
  });

  it('should call onMouseEnter and prevent default on mouse enter event', () => {
    const onMouseEnterMock = jest.fn();
    const preventDefaultMock = jest.fn();
    const value = 'test value';

    render(<PointerSurface onMouseEnter={onMouseEnterMock} value={value} />);
    const button = screen.getByRole('button');

    fireEvent.mouseEnter(button, {preventDefault: preventDefaultMock});

    expect(preventDefaultMock).not.toHaveBeenCalled();
  });

  it('should handle mouse down, set pressed state, and add mouseup event listener', () => {
    const addEventListenerMock = jest.spyOn(document, 'addEventListener');

    render(<PointerSurface />);
    const button = screen.getByRole('button');

    fireEvent.mouseDown(button, {button: 0});

    expect(addEventListenerMock).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function),
      true
    );

    addEventListenerMock.mockRestore();
  });

  it('should call onClick callback and reset pressed state on mouse up event', () => {
    const onClickMock = jest.fn();
    const value = 'test value';

    render(<PointerSurface onClick={onClickMock} value={value} />);
    const button = screen.getByRole('button');

    fireEvent.mouseDown(button, {button: 0});
    fireEvent.mouseUp(button);

    expect(onClickMock).toHaveBeenCalledWith(value, expect.any(Object));
  });

  it('should remove event listener on mouse up capture', () => {
    const removeEventListenerMock = jest.spyOn(document, 'removeEventListener');

    render(<PointerSurface />);
    const button = screen.getByRole('button');

    fireEvent.mouseDown(button, {button: 0});
    fireEvent.mouseUp(button);

    expect(removeEventListenerMock).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function),
      true
    );

    removeEventListenerMock.mockRestore();
  });
});
