import React from 'react';
import {
  VideoResizeBox,
  ResizeHadleDirection,
  VideoResizeBoxControl,
} from './VideoResizeBox';

describe('Video Resize Box', () => {
  it('should render Video Resize Box', () => {
    const VideoResizeProps = {
      height: 150,
      onResizeEnd: () => undefined,
      src: '',
      width: 180,
    };
    const wrapper = new VideoResizeBox({...VideoResizeProps});
    expect(wrapper.render()).toBeDefined();
  });
});
describe('Video Resize Box control', () => {
  const videoresizeboxcontrol = new VideoResizeBoxControl({
    height: 150,
    onResizeEnd: () => undefined,
    src: '',
    width: 180,
  });
  it('should be defined', () => {
    expect(videoresizeboxcontrol).toBeDefined();
  });

  it('should handle componentWillUnmount', () => {
    const spy = jest.spyOn(videoresizeboxcontrol, '_end');
    videoresizeboxcontrol.componentWillUnmount();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle render ', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    videoresizeboxcontrol.props = {
      boxID: 'boxid',
      direction: 'bottom',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
    };
    videoresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    expect(videoresizeboxcontrol.render()).toBeDefined();
  });
  it('should handle _syncSize ', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    videoresizeboxcontrol.props = {
      boxID: 'boxid',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
    };
    videoresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    expect(videoresizeboxcontrol._syncSize()).toBeUndefined();
  });
  const directions: ResizeHadleDirection[] = [
    'top',
    'top_right',
    'right',
    'bottom_right',
    'bottom',
    'bottom_left',
    'left',
    'top_left',
  ];
  test.each(directions)(
    'should handle _syncSize each direction',
    (direction) => {
      const mockElement = document.createElement('div');
      mockElement.className = 'boxid';

      jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
      videoresizeboxcontrol.props = {
        boxID: 'boxid',
        direction: direction,
        height: 10,
        onResizeEnd: () => undefined,
        width: 10,
      };
      videoresizeboxcontrol._onMouseDown(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          screenX: 100,
          screenY: 100,
          clientX: 50,
          clientY: 50,
        }) as unknown as React.MouseEvent
      );
      expect(videoresizeboxcontrol._syncSize()).toBeUndefined();
    }
  );
  it('should handle _syncSize when !this._active', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    videoresizeboxcontrol.props = {
      boxID: 'boxid',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
    };
    videoresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    videoresizeboxcontrol._active = false;
    expect(videoresizeboxcontrol._syncSize()).toBeUndefined();
  });
  it('should handle _onMouseMove   ', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    videoresizeboxcontrol.props = {
      boxID: 'boxid',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
    };
    videoresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    videoresizeboxcontrol._onMouseMove(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      })
    );
    expect(videoresizeboxcontrol._x2).toBe(50);
    expect(videoresizeboxcontrol._y2).toBe(50);
  });

  it('should handle _onMouseUp', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    videoresizeboxcontrol.props = {
      boxID: 'boxid',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
    };
    videoresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    const spy1 = jest.spyOn(videoresizeboxcontrol, '_end');
    videoresizeboxcontrol._onMouseUp(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      })
    );
    expect(spy1).toHaveBeenCalled();
  });

  it('should handle _start', () => {
    const spy = jest.spyOn(videoresizeboxcontrol, '_end');

    const mockElement = document.createElement('div');
    videoresizeboxcontrol._el = mockElement;

    videoresizeboxcontrol.props = {
      boxID: 'boxid',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
    };
    videoresizeboxcontrol._active = true;
    videoresizeboxcontrol._start(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    expect(spy).toHaveBeenCalled();
  });
});
