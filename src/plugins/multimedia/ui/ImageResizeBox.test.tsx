/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock('./Icon', () => ({
  __esModule: true,
  Icon: {
    get: jest.fn(() => null),
  },
}));

import {createEditor, doc, p} from 'jest-prosemirror';
import {ImageResizeBox, ImageResizeBoxControl} from './ImageResizeBox';
import React from 'react';

import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {schema} from 'prosemirror-schema-basic';
import {MultimediaPlugin} from '../index';

function setReadonlyProps<P>(
  component: {readonly props: P},
  props: P
): void {
  Object.defineProperty(component, 'props', {
    configurable: true,
    value: props,
  });
}

function createReactMouseEvent(
  currentTarget: HTMLElement,
  clientX = 50,
  clientY = 50
): React.MouseEvent {
  return {
    clientX,
    clientY,
    currentTarget,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  } as unknown as React.MouseEvent;
}

function setRect(
  element: HTMLElement,
  rect: Partial<DOMRect> & {height: number; width: number}
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: rect.bottom ?? (rect.top ?? 0) + rect.height,
      height: rect.height,
      left: rect.left ?? 0,
      right: rect.right ?? (rect.left ?? 0) + rect.width,
      top: rect.top ?? 0,
      width: rect.width,
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      toJSON: () => ({}),
    }),
  });
}

function setBoxMetrics(
  element: HTMLElement,
  metrics: Partial<
    Pick<
      HTMLElement,
      | 'clientHeight'
      | 'clientLeft'
      | 'clientTop'
      | 'clientWidth'
      | 'offsetHeight'
      | 'offsetWidth'
    >
  >
): void {
  Object.entries(metrics).forEach(([key, value]) => {
    Object.defineProperty(element, key, {
      configurable: true,
      value,
    });
  });
}

describe('Image Resize Box', () => {
  it('should render Image Resize Box', () => {
    const ImageResizeProps = {
      height: 150,
      onResizeEnd: () => undefined,
      src: '',
      width: 180,
      fitToParent: false,
    };
    const wrapper = new ImageResizeBox({...ImageResizeProps});
    expect(wrapper.render()).toBeDefined();
  });
});

describe('Node attribute update', () => {
  let editorView!: EditorView;

  beforeEach(() => {
    const plugin = new MultimediaPlugin();
    const editor = createEditor(doc(p()), {
      plugins: [plugin],
    });
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new MultimediaPlugin()],
    });
    const domNode = document.createElement('div');
    editorView = new EditorView(domNode, {
      state,
      dispatchTransaction(transaction) {
        editorView.updateState(editorView.state.apply(transaction));
      },
    });
  });

  afterEach(() => {
    editorView.destroy();
  });

  it('should update node attributes', () => {
    const {tr} = editorView.state;
    const nodeType = schema.nodes.heading;
    const attrs = {active: true, crop: null, rotate: null};
    const node = nodeType.create(attrs);
    const pos = 0;

    tr.insert(pos, node);
    expect(() => editorView.dispatch(tr)).not.toThrow();
  });
});

describe('image resizebox control', () => {
  const imageresizeboxcontrol = new ImageResizeBoxControl({
    boxID: 'boxid',
    config: 'any',
    direction: 'bottom',
    height: 10,
    onResizeEnd: (_w: 1, _height: 1) => undefined,
    width: 10,
    fitToParent: true,
  });

  it('should be defined', () => {
    expect(imageresizeboxcontrol).toBeDefined();
  });

  beforeEach(() => {
    imageresizeboxcontrol._active = false;
    imageresizeboxcontrol._el = null;
    imageresizeboxcontrol._ownerDocument = null;
    imageresizeboxcontrol._rafID = 0;
    imageresizeboxcontrol._statusPlacementRafID = 0;
  });

  it('should handle componentWillUnmount', () => {
    const spy = jest.spyOn(imageresizeboxcontrol, '_end');
    imageresizeboxcontrol.componentWillUnmount();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle render', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'bottom',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    });
    imageresizeboxcontrol._onMouseDown(createReactMouseEvent(mockElement));
    expect(imageresizeboxcontrol.render()).toBeDefined();
  });
  it('should handle _syncSize', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    });
    imageresizeboxcontrol._onMouseDown(createReactMouseEvent(mockElement));
    expect(imageresizeboxcontrol._syncSize()).toBeUndefined();
  });

  it('should handle _syncSize branch coverage', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    });
    imageresizeboxcontrol._onMouseDown(createReactMouseEvent(mockElement));
    imageresizeboxcontrol._active = false;
    expect(imageresizeboxcontrol._syncSize()).toBeUndefined();
  });

  it('should handle _start', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    });
    imageresizeboxcontrol._onMouseDown(createReactMouseEvent(mockElement));
    expect(
      imageresizeboxcontrol._start(createReactMouseEvent(mockElement))
    ).toBeUndefined();
  });
  it('should handle _onMouseMove', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    });
    imageresizeboxcontrol._onMouseDown(createReactMouseEvent(mockElement));
    imageresizeboxcontrol._onMouseMove(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      })
    );
    expect(imageresizeboxcontrol._x2).toBe(50);
    expect(imageresizeboxcontrol._y2).toBe(50);
  });

  it('should handle _onMouseUp', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    });
    imageresizeboxcontrol._onMouseDown(createReactMouseEvent(mockElement));
    const spy1 = jest.spyOn(imageresizeboxcontrol, '_end');
    imageresizeboxcontrol._onMouseUp(
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
  it('should handle render (case 2)',()=>{
    const irb = new ImageResizeBox({
      height: 150,
      onResizeEnd: () => undefined,
      src: '',
      width: 180,
      fitToParent: true,
    });
    setReadonlyProps(irb, {
      height: 150,
      onResizeEnd: () => undefined,
      src: '',
      width: 180,
      fitToParent: true,
    });
    expect(irb.render()).toBeDefined();
  });

  it('should throw when _syncSize runs without an element', () => {
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: false,
    });
    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = null;

    expect(() => imageresizeboxcontrol._syncSize()).toThrow(
      'Element is not initialized.'
    );
  });

  it('should throw when _syncSize receives an invalid direction', () => {
    const mockElement = document.createElement('div');
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'diagonal',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: false,
    });
    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = mockElement;

    expect(() => imageresizeboxcontrol._syncSize()).toThrow(
      'Invalid resize direction: diagonal'
    );
  });

  it('should throw when _start cannot find the resize element', () => {
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    imageresizeboxcontrol._active = false;

    expect(() =>
      imageresizeboxcontrol._start(
        createReactMouseEvent(document.createElement('button'), 10, 10)
      )
    ).toThrow("Element with ID 'boxid' not found.");
  });

  it('should throw when _end is active but element is missing', () => {
    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = null;

    expect(() => imageresizeboxcontrol._end()).toThrow(
      'Resizable element not initialized.'
    );
  });

  it('should throw when _onMouseUp is called without an active element', () => {
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    });
    imageresizeboxcontrol._el = null;

    expect(() =>
      imageresizeboxcontrol._onMouseUp(
        new MouseEvent('mouseup', {
          clientX: 20,
          clientY: 20,
        })
      )
    ).toThrow('Resizable element not initialized.');
  });

  it('should cancel the animation frame when ending an active resize', () => {
    const mockElement = document.createElement('div');
    const cancelSpy = jest.spyOn(global, 'cancelAnimationFrame');
    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = mockElement;
    imageresizeboxcontrol._rafID = 7;

    imageresizeboxcontrol._end();

    expect(cancelSpy).toHaveBeenCalledWith(7);
  });

  it('should position resize status within clipped visible bounds', () => {
    const control = document.createElement('button');
    const status = document.createElement('span');
    const clipper = document.createElement('div');
    clipper.style.overflow = 'hidden';
    clipper.appendChild(control);
    control.appendChild(status);
    document.body.appendChild(clipper);
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_left',
      height: 80,
      onResizeEnd: () => undefined,
      width: 100,
      fitToParent: false,
    });
    setRect(clipper, {height: 80, left: 10, top: 10, width: 120});
    setRect(control, {height: 20, left: 30, top: 30, width: 20});
    setRect(status, {height: 20, left: 0, top: 0, width: 50});
    setBoxMetrics(clipper, {
      clientHeight: 70,
      clientLeft: 2,
      clientTop: 3,
      clientWidth: 100,
      offsetHeight: 80,
      offsetWidth: 120,
    });
    setBoxMetrics(control, {
      offsetHeight: 20,
      offsetWidth: 20,
    });
    imageresizeboxcontrol._onStatusRef(status);

    imageresizeboxcontrol._positionStatus();

    expect(status.style.right).toBe('auto');
    expect(status.style.bottom).toBe('auto');
    expect(status.style.transform).toBe('none');
    expect(status.style.left).toBeTruthy();
    expect(status.style.top).toBeTruthy();

    clipper.remove();
  });

  it('should skip status positioning without geometry', () => {
    const status = document.createElement('span');
    imageresizeboxcontrol._onStatusRef(status);
    expect(imageresizeboxcontrol._positionStatus()).toBeUndefined();

    const control = document.createElement('button');
    control.appendChild(status);
    setRect(control, {height: 0, width: 0});
    setRect(status, {height: 0, width: 0});

    expect(imageresizeboxcontrol._positionStatus()).toBeUndefined();
  });

  it('should schedule status placement only when active and unscheduled', () => {
    const requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(1);
        return 8;
      });
    const positionStatus = jest.spyOn(imageresizeboxcontrol, '_positionStatus');

    imageresizeboxcontrol._active = false;
    imageresizeboxcontrol._scheduleStatusPlacement();
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();

    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._ownerDocument = null;
    imageresizeboxcontrol._scheduleStatusPlacement();
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();

    imageresizeboxcontrol._ownerDocument = document;
    imageresizeboxcontrol._statusPlacementRafID = 3;
    imageresizeboxcontrol._scheduleStatusPlacement();
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();

    imageresizeboxcontrol._statusPlacementRafID = 0;
    imageresizeboxcontrol._onViewportChange();

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    expect(positionStatus).toHaveBeenCalled();
    expect(imageresizeboxcontrol._statusPlacementRafID).toBe(8);
  });

  it('should resize width and height handles independently', () => {
    const mockElement = document.createElement('div');
    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = mockElement;
    imageresizeboxcontrol._startWidth = 100;
    imageresizeboxcontrol._startHeight = 80;
    imageresizeboxcontrol._x1 = 10;
    imageresizeboxcontrol._x2 = 45;
    imageresizeboxcontrol._y1 = 10;
    imageresizeboxcontrol._y2 = 50;

    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'right',
      height: 80,
      onResizeEnd: () => undefined,
      width: 100,
      fitToParent: false,
    });
    imageresizeboxcontrol._syncSize();
    expect(mockElement.style.width).toBe('135px');
    expect(mockElement.style.height).toBe('');

    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'bottom',
      height: 80,
      onResizeEnd: () => undefined,
      width: 100,
      fitToParent: false,
    });
    imageresizeboxcontrol._syncSize();
    expect(mockElement.style.height).toBe('120px');
  });

  it('should resize opposite and diagonal handles with clamping', () => {
    const mockElement = document.createElement('div');
    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = mockElement;
    imageresizeboxcontrol._startWidth = 100;
    imageresizeboxcontrol._startHeight = 100;
    imageresizeboxcontrol._x1 = 50;
    imageresizeboxcontrol._x2 = 1000;
    imageresizeboxcontrol._y1 = 50;
    imageresizeboxcontrol._y2 = 1000;

    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_left',
      height: 100,
      onResizeEnd: () => undefined,
      width: 100,
      fitToParent: false,
    });
    imageresizeboxcontrol._syncSize();
    expect(mockElement.style.width).toBe('20px');
    expect(mockElement.style.height).toBe('20px');

    imageresizeboxcontrol._x2 = -1000;
    imageresizeboxcontrol._y2 = -1000;
    imageresizeboxcontrol._syncSize();
    expect(mockElement.style.width).toBe('1150px');
    expect(mockElement.style.height).toBe('1150px');
  });

  it('should call onResizeEnd only when dimensions changed', () => {
    const mockElement = document.createElement('div');
    const onResizeEnd = jest.fn();
    setReadonlyProps(imageresizeboxcontrol, {
      boxID: 'boxid',
      config: 'any',
      direction: 'right',
      height: 80,
      onResizeEnd,
      width: 100,
      fitToParent: false,
    });
    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = mockElement;
    imageresizeboxcontrol._ownerDocument = document;
    imageresizeboxcontrol._startWidth = 100;
    imageresizeboxcontrol._startHeight = 80;
    imageresizeboxcontrol._x1 = 10;
    imageresizeboxcontrol._y1 = 10;
    imageresizeboxcontrol._ww = 100;
    imageresizeboxcontrol._hh = 80;

    imageresizeboxcontrol._onMouseUp(
      new MouseEvent('mouseup', {clientX: 10, clientY: 10})
    );
    expect(onResizeEnd).not.toHaveBeenCalled();

    imageresizeboxcontrol._active = true;
    imageresizeboxcontrol._el = mockElement;
    imageresizeboxcontrol._ownerDocument = document;
    imageresizeboxcontrol._x1 = 10;
    imageresizeboxcontrol._y1 = 10;

    imageresizeboxcontrol._onMouseUp(
      new MouseEvent('mouseup', {clientX: 40, clientY: 10})
    );
    expect(onResizeEnd).toHaveBeenCalledWith(130, 80);
  });
});
