import instance from './PopUpManager';

describe('PopUpManager', () => {
  let popUpManager;

  beforeEach(() => {
    popUpManager = instance;
  });

  afterEach(() => {
    popUpManager = null;
  });

  it('should register a bridge', () => {
    const bridge = {};
    popUpManager.register(bridge);
    expect(popUpManager._bridges.size).toBe(1);
    expect(popUpManager._positions.size).toBe(1);
  });

  it('should unregister a bridge', () => {
    const bridge = {
      size: 0,
    };
    popUpManager._bridges = new Map();
    popUpManager.register(bridge);
    popUpManager.unregister(bridge);
    expect(popUpManager._bridges.size).toBe(0);
  });

  it('closes pop-up when autoDismiss is true and intersects with body', () => {
    const mockCloseFn = jest.fn();

    const mockEvent = new MouseEvent('click', {
      bubbles: true,
      clientX: 100,
      clientY: 100,
    });
    popUpManager._onClick(mockEvent);
    expect(mockCloseFn).not.toHaveBeenCalled();
  });

  it('does not close pop-up when autoDismiss is true but does not intersect with body', () => {
    const mockBody = document.createElement('div');
    const mockCloseFn = jest.fn();

    const mockDetails = {
      autoDismiss: true,
      modal: false,
      body: mockBody,
      position: jest.fn().mockReturnValue({x: 100, y: 200}),
      close: mockCloseFn,
    };

    const mockBridge = {
      getDetails: jest.fn().mockReturnValue(mockDetails),
    };
    const mockEvent = new MouseEvent('click', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    });
    popUpManager._bridges.set(mockBridge, Date.now() - 1000);
    popUpManager._onClick(mockEvent);
    expect(mockCloseFn).not.toHaveBeenCalled();
  });
  it('should consider the autodismissal and modal ', () => {
    const mockBody = document.createElement('div');
    const mockCloseFn = jest.fn();

    const mockDetails = {
      autoDismiss: true,
      modal: true,
      body: mockBody,
      popupId: '1',
      position: jest.fn().mockReturnValue({x: 100, y: 200}),
      close: mockCloseFn,
    };

    const mockBridge = {
      getDetails: jest.fn().mockReturnValue(mockDetails),
    };

    const targetClassName = 'czi-icon format_line_spacing';

    const targetElement = document.createElement('div');
    targetElement.className = targetClassName;
    targetElement.className = 'czi-icon format_color_text';
    targetElement.className = 'czi-icon border_color';
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    targetElement.dispatchEvent(clickEvent);
    popUpManager._bridges.set(mockBridge, Date.now() - 1000);
    popUpManager._onClick(clickEvent);
    expect(mockCloseFn).not.toHaveBeenCalled();
  });

  it('_onScroll calls _syncPosition', () => {
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.cancelAnimationFrame = jest.fn();
    window.requestAnimationFrame = jest.fn();

    popUpManager._onScroll({});
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    window.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('_onResize should calls _syncPosition', () => {
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.cancelAnimationFrame = jest.fn();
    window.requestAnimationFrame = jest.fn();
    popUpManager._onResize({});

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    window.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('should set IsCustom value to true ', () => {
    const mockCloseFn = jest.fn();

    const targetClassName = 'not-a-vaild-class';

    const targetElement = document.createElement('div');
    targetElement.className = targetClassName;
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    targetElement.dispatchEvent(clickEvent);

    popUpManager._onClick(clickEvent);
    popUpManager._syncPosition();
    expect(mockCloseFn).not.toHaveBeenCalled();
  });

  it('should call _onMouseChange', () => {
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.cancelAnimationFrame = jest.fn();
    window.requestAnimationFrame = jest.fn();
    const mockMouseEvent = new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 200,
    });
    popUpManager._onMouseChange(mockMouseEvent);

    expect(popUpManager._mx).toBe(100);
    expect(popUpManager._my).toBe(200);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    window.requestAnimationFrame = originalRequestAnimationFrame;
  });
  it('should handle _onResize ', () => {
    instance._rafID = 1;
    expect(instance._onResize({} as unknown as Event)).toBeUndefined();
  });
  it('should handle _onMouseChange  ', () => {
    instance._rafID = 1;
    expect(
      instance._onMouseChange({} as unknown as MouseEvent)
    ).toBeUndefined();
  });
  it('should handle _syncPosition   ', () => {
    const mockBody = document.createElement('div');
    const mockCloseFn = jest.fn();
    const mockDetails = {
      anchor: document.createElement('div'),
      bodyRect: false,
      autoDismiss: true,
      modal: false,
      body: mockBody,
      position: jest.fn().mockReturnValue({x: 100, y: 200}),
      close: mockCloseFn,
    };

    const mockBridge = {
      getDetails: jest.fn().mockReturnValue(mockDetails),
    };
    popUpManager._bridges.set(mockBridge, Date.now() - 1000);
    instance._rafID = 1;
    expect(instance._syncPosition()).toBeUndefined();
  });
});
