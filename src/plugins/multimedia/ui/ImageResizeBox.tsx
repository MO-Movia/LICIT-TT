/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import React from 'react';

import { clamp } from '../../../commands';
import {uuid} from './uuid';

import {FP_WIDTH} from '../Constants';

type Props = {
  height: number;
  onResizeEnd: (w: number, height: number) => void;
  src: string;
  width: number;
  fitToParent: boolean;
};

export const MIN_SIZE = 20;
export const MAX_SIZE = 10000;

function setWidth(
  el: HTMLElement,
  width: number,
  _height: number,
  fitToParent: boolean
): void {
  el.style.width = fitToParent ? FP_WIDTH : width + 'px';
}

function setHeight(
  el: HTMLElement,
  _width: number,
  height: number,
  _fitToParent: boolean
): void {
  el.style.height = height + 'px';
}

function setSize(
  el: HTMLElement,
  width: number,
  height: number,
  fitToParent: boolean
): void {
  el.style.width = fitToParent ? FP_WIDTH : Math.round(width) + 'px';
  el.style.height = Math.round(height) + 'px';
}

const ResizeDirection = {
  top: setHeight,
  top_right: setSize,
  right: setWidth,
  bottom_right: setSize,
  bottom: setHeight,
  bottom_left: setSize,
  left: setWidth,
  top_left: setSize,
};
type ImageResizwBoxProps = {
  boxID: string;
  config; //NOSONAR
  direction: string;
  height: number;
  onResizeEnd: (w: number, height: number) => void;
  width: number;
  fitToParent: boolean;
};

type ImageResizeBoxControlState = {
  dragging: boolean;
  height: number;
  width: number;
};

type VisibleBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type AxisPlacement = 'after' | 'before' | 'center';

const STATUS_BOUNDARY_INSET = 4;
const STATUS_GAP = 2;
const CLIPPING_OVERFLOW = new Set(['auto', 'clip', 'hidden', 'scroll']);

function getVisibleBounds(element: HTMLElement): VisibleBounds {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  const root = doc.documentElement;
  const viewport = view?.visualViewport;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportWidth =
    viewport?.width || root.clientWidth || view?.innerWidth || 0;
  const viewportHeight =
    viewport?.height || root.clientHeight || view?.innerHeight || 0;
  const bounds: VisibleBounds = {
    bottom: viewportTop + viewportHeight,
    left: viewportLeft,
    right: viewportLeft + viewportWidth,
    top: viewportTop,
  };

  for (
    let ancestor = element.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    const style = view?.getComputedStyle(ancestor);
    if (!style) {
      continue;
    }
    const clipsX = CLIPPING_OVERFLOW.has(style.overflowX);
    const clipsY = CLIPPING_OVERFLOW.has(style.overflowY);
    if (!clipsX && !clipsY) {
      continue;
    }

    const rect = ancestor.getBoundingClientRect();
    const scaleX = ancestor.offsetWidth ? rect.width / ancestor.offsetWidth : 1;
    const scaleY = ancestor.offsetHeight
      ? rect.height / ancestor.offsetHeight
      : 1;
    const clientLeft = rect.left + ancestor.clientLeft * scaleX;
    const clientTop = rect.top + ancestor.clientTop * scaleY;
    const clientRight = clientLeft + ancestor.clientWidth * scaleX;
    const clientBottom = clientTop + ancestor.clientHeight * scaleY;

    if (clipsX) {
      bounds.left = Math.max(bounds.left, clientLeft);
      bounds.right = Math.min(bounds.right, clientRight);
    }
    if (clipsY) {
      bounds.top = Math.max(bounds.top, clientTop);
      bounds.bottom = Math.min(bounds.bottom, clientBottom);
    }
  }

  const horizontalInset = Math.min(
    STATUS_BOUNDARY_INSET,
    Math.max(0, (bounds.right - bounds.left) / 2)
  );
  const verticalInset = Math.min(
    STATUS_BOUNDARY_INSET,
    Math.max(0, (bounds.bottom - bounds.top) / 2)
  );
  bounds.left += horizontalInset;
  bounds.right -= horizontalInset;
  bounds.top += verticalInset;
  bounds.bottom -= verticalInset;
  return bounds;
}

function getAxisOverflow(
  position: number,
  size: number,
  minimum: number,
  maximum: number
): number {
  return (
    Math.max(0, minimum - position) +
    Math.max(0, position + size - maximum)
  );
}

function clampAxisPosition(
  position: number,
  size: number,
  minimum: number,
  maximum: number
): number {
  return Math.max(minimum, Math.min(position, Math.max(minimum, maximum - size)));
}

function chooseAxisPosition({
  anchorEnd,
  anchorStart,
  maximum,
  minimum,
  placement,
  size,
}: {
  anchorEnd: number;
  anchorStart: number;
  maximum: number;
  minimum: number;
  placement: AxisPlacement;
  size: number;
}): number {
  const before = anchorStart - STATUS_GAP - size;
  const after = anchorEnd + STATUS_GAP;
  const centered = (anchorStart + anchorEnd - size) / 2;
  if (placement === 'center') {
    return clampAxisPosition(centered, size, minimum, maximum);
  }

  const preferred = placement === 'before' ? before : after;
  const inverted = placement === 'before' ? after : before;
  const preferredOverflow = getAxisOverflow(
    preferred,
    size,
    minimum,
    maximum
  );
  const invertedOverflow = getAxisOverflow(
    inverted,
    size,
    minimum,
    maximum
  );
  const position =
    invertedOverflow < preferredOverflow ? inverted : preferred;
  return clampAxisPosition(position, size, minimum, maximum);
}

function getHorizontalPlacement(direction: string): AxisPlacement {
  if (/left/.test(direction)) {
    return 'before';
  }
  if (/right/.test(direction)) {
    return 'after';
  }
  return 'center';
}

function ResizeAspectIcon({locked}: {locked: boolean}): React.ReactElement {
  return locked ? (
    <svg
      aria-hidden="true"
      className="molm-czi-image-resize-box-status-icon"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m6.15 9.85-1.1 1.1a2.1 2.1 0 0 1-2.97-2.97l2-2a2.1 2.1 0 0 1 2.97 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="m9.85 6.15 1.1-1.1a2.1 2.1 0 1 1 2.97 2.97l-2 2a2.1 2.1 0 0 1-2.97 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="m5.75 10.25 4.5-4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="molm-czi-image-resize-box-status-icon"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m5.6 10.4-.55.55a2.1 2.1 0 0 1-2.97-2.97l2-2a2.1 2.1 0 0 1 2.97 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="m10.4 5.6.55-.55a2.1 2.1 0 1 1 2.97 2.97l-2 2a2.1 2.1 0 0 1-2.97 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="m4 4 8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export class ImageResizeBoxControl extends React.PureComponent<
  ImageResizwBoxProps,
  ImageResizeBoxControlState
> {
  state: ImageResizeBoxControlState = {
    dragging: false,
    height: Math.round(this.props.height),
    width: Math.round(this.props.width),
  };

  _active = false;
  _el: HTMLElement | null = null;
  _h = '';
  _mounted = false;
  _ownerDocument: Document | null = null;
  _rafID = 0;
  _statusEl: HTMLSpanElement | null = null;
  _statusPlacementRafID = 0;
  _startHeight = 0;
  _startWidth = 0;
  _w = '';
  _x1 = 0;
  _x2 = 0;
  _y1 = 0;
  _y2 = 0;
  _ww = 0;
  _hh = 0;

  componentDidMount(): void {
    this._mounted = true;
  }

  componentDidUpdate(): void {
    if (this.state.dragging) {
      this._positionStatus();
    }
  }

  componentWillUnmount(): void {
    this._mounted = false;
    this._end();
  }

  render(): React.ReactElement {
    const {direction} = this.props;
    const {dragging, height, width} = this.state;
    const aspectLocked = ResizeDirection[direction] === setSize;

    const className = cx({
      'molm-czi-image-resize-box-control': true,
      active: dragging,
      [direction]: true,
    });

    return (
      <button
        aria-label={`Resize image ${direction.replace('_', ' ')}`}
        className={className}
        onMouseDown={this._onMouseDown}
        tabIndex={-1}
        type="button"
      >
        {dragging ? (
          <span
            className="molm-czi-image-resize-box-status"
            ref={this._onStatusRef}
          >
            <ResizeAspectIcon locked={aspectLocked} />
            <strong className="molm-czi-image-resize-box-status-size">
              {width} × {height} px
            </strong>
            <span className="molm-czi-image-resize-box-status-mode">
              {aspectLocked ? 'Aspect locked' : 'Free stretch'}
            </span>
          </span>
        ) : null}
      </button>
    );
  }

  _onStatusRef = (ref: HTMLSpanElement | null): void => {
    this._statusEl = ref;
  };

  _positionStatus(): void {
    const status = this._statusEl;
    const control = status?.parentElement;
    if (!status || !control) {
      return;
    }

    const statusRect = status.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();
    if (
      !statusRect.width ||
      !statusRect.height ||
      !controlRect.width ||
      !controlRect.height
    ) {
      return;
    }

    const bounds = getVisibleBounds(status);
    const {direction} = this.props;
    const horizontalPlacement = getHorizontalPlacement(direction);
    const verticalPlacement: AxisPlacement = /top/.test(direction)
      ? 'before'
      : 'after';
    const viewportLeft = chooseAxisPosition({
      anchorEnd: controlRect.right,
      anchorStart: controlRect.left,
      maximum: bounds.right,
      minimum: bounds.left,
      placement: horizontalPlacement,
      size: statusRect.width,
    });
    const viewportTop = chooseAxisPosition({
      anchorEnd: controlRect.bottom,
      anchorStart: controlRect.top,
      maximum: bounds.bottom,
      minimum: bounds.top,
      placement: verticalPlacement,
      size: statusRect.height,
    });
    const scaleX = control.offsetWidth
      ? controlRect.width / control.offsetWidth
      : 1;
    const scaleY = control.offsetHeight
      ? controlRect.height / control.offsetHeight
      : 1;
    const localLeft = (viewportLeft - controlRect.left) / scaleX;
    const localTop = (viewportTop - controlRect.top) / scaleY;

    status.style.left = `${localLeft}px`;
    status.style.top = `${localTop}px`;
    status.style.right = 'auto';
    status.style.bottom = 'auto';
    status.style.transform = 'none';
  }

  _scheduleStatusPlacement = (): void => {
    if (!this._active || this._statusPlacementRafID) {
      return;
    }
    const view = this._ownerDocument?.defaultView;
    if (!view) {
      return;
    }
    this._statusPlacementRafID = view.requestAnimationFrame(() => {
      this._statusPlacementRafID = 0;
      this._positionStatus();
    });
  };

  _onViewportChange = (): void => {
    this._scheduleStatusPlacement();
  };

  _setDragStatus(dragging: boolean, width: number, height: number): void {
    if (!this._mounted) {
      return;
    }
    this.setState({
      dragging,
      height: Math.round(height),
      width: Math.round(width),
    });
  }

  _syncSize = (): void => {
    if (!this._active) {
      return;
    }
    this._rafID = 0;
    const {direction} = this.props;
    const width = this._startWidth;
    const height = this._startHeight;

    const dx = (this._x2 - this._x1) * (/left/.test(direction) ? -1 : 1);
    const dy = (this._y2 - this._y1) * (/top/.test(direction) ? -1 : 1);

    const el = this._el;
    if (!el) {
      throw new Error('Element is not initialized.');
    }

    const fn = ResizeDirection[direction];
    if (!fn) {
      throw new Error(`Invalid resize direction: ${direction}`);
    }
    let ww = width;
    let hh = height;
    if (fn === setWidth) {
      ww = clamp(MIN_SIZE, width + Math.round(dx), MAX_SIZE);
    } else if (fn === setHeight) {
      hh = clamp(MIN_SIZE, height + Math.round(dy), MAX_SIZE);
    } else {
      // Project the pointer movement onto the aspect-ratio diagonal. This
      // responds smoothly to both axes without jumping when one axis briefly
      // moves in the opposite direction.
      const baseWidth = Math.max(width, 1);
      const baseHeight = Math.max(height, 1);
      const scaleDelta =
        (dx * baseWidth + dy * baseHeight) /
        (baseWidth * baseWidth + baseHeight * baseHeight);
      const minScale = Math.max(
        MIN_SIZE / baseWidth,
        MIN_SIZE / baseHeight
      );
      const maxScale = Math.min(
        MAX_SIZE / baseWidth,
        MAX_SIZE / baseHeight
      );
      const scale = clamp(minScale, 1 + scaleDelta, maxScale);
      ww = baseWidth * scale;
      hh = baseHeight * scale;
    }

    ww = clamp(MIN_SIZE, Math.round(ww), MAX_SIZE);
    hh = clamp(MIN_SIZE, Math.round(hh), MAX_SIZE);

    // A fit-to-parent image must become a numeric preview as soon as it is
    // dragged. The parent clears fitToParent when these dimensions commit.
    fn(el, ww, hh, false);
    this._ww = ww;
    this._hh = hh;
    this._setDragStatus(true, ww, hh);
  };

  _start(e: React.MouseEvent): void {
    if (this._active) {
      this._end();
    }

    this._active = true;

    const {boxID, direction, fitToParent, width, height} = this.props;
    const ownerDocument = e.currentTarget.ownerDocument;
    const el = ownerDocument.getElementById(boxID);
    if (!el) {
      throw new Error(`Element with ID '${boxID}' not found.`);
    }
    this._ownerDocument = ownerDocument;
    el.className += ' ' + direction;

    this._el = el;
    this._x1 = e.clientX;
    this._y1 = e.clientY;
    this._x2 = this._x1;
    this._y2 = this._y1;
    this._w = this._el.style.width;
    this._h = this._el.style.height;
    const renderedWidth = fitToParent
      ? this._el.getBoundingClientRect().width
      : width;
    this._startWidth = clamp(
      MIN_SIZE,
      Math.round(renderedWidth || width),
      MAX_SIZE
    );
    this._startHeight = clamp(MIN_SIZE, Math.round(height), MAX_SIZE);
    this._ww = this._startWidth;
    this._hh = this._startHeight;

    // Replace a percentage-based fit-to-parent preview before the first move,
    // so the drag starts from the displayed numeric dimensions.
    setSize(this._el, this._ww, this._hh, false);
    this._setDragStatus(true, this._ww, this._hh);

    ownerDocument.addEventListener('mousemove', this._onMouseMove, true);
    ownerDocument.addEventListener('mouseup', this._onMouseUp, true);
    ownerDocument.addEventListener('scroll', this._onViewportChange, true);
    ownerDocument.defaultView?.addEventListener(
      'resize',
      this._onViewportChange
    );
  }

  _end(): void {
    if (!this._active) {
      return;
    }

    this._active = false;
    const ownerDocument = this._ownerDocument;
    const view = ownerDocument?.defaultView;
    ownerDocument?.removeEventListener('mousemove', this._onMouseMove, true);
    ownerDocument?.removeEventListener('mouseup', this._onMouseUp, true);
    ownerDocument?.removeEventListener('scroll', this._onViewportChange, true);
    view?.removeEventListener('resize', this._onViewportChange);

    const el = this._el;
    if (!el) {
      throw new Error('Resizable element not initialized.');
    }
    el.style.width = this._w;
    el.style.height = this._h;
    el.className = 'molm-czi-image-resize-box';
    this._el = null;
    if (this._rafID) {
      (view || globalThis).cancelAnimationFrame(this._rafID);
    }
    if (this._statusPlacementRafID) {
      view?.cancelAnimationFrame(this._statusPlacementRafID);
    }
    this._rafID = 0;
    this._statusPlacementRafID = 0;
    this._ownerDocument = null;
    this._setDragStatus(false, this._ww, this._hh);
  }

  _onMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this._end();
    this._start(e);
  };

  _onMouseMove = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this._x2 = e.clientX;
    this._y2 = e.clientY;
    const view = this._ownerDocument?.defaultView;
    if (this._rafID) {
      (view || globalThis).cancelAnimationFrame(this._rafID);
    }
    this._rafID = (view || globalThis).requestAnimationFrame(this._syncSize);
  };

  _onMouseUp = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this._x2 = e.clientX;
    this._y2 = e.clientY;
    const view = this._ownerDocument?.defaultView;
    if (this._rafID) {
      (view || globalThis).cancelAnimationFrame(this._rafID);
      this._rafID = 0;
    }
    // Apply the release position before _end() restores the preview box.
    this._syncSize();
    const didResize =
      this._ww !== this._startWidth || this._hh !== this._startHeight;

    const {direction} = this.props;
    const el = this._el;
    if (!el) {
      throw new Error('Resizable element not initialized.');
    }
    el.classList.remove(direction);

    this._end();
    if (didResize) {
      this.props.onResizeEnd(this._ww, this._hh);
    }
  };
}

export class ImageResizeBox extends React.PureComponent {
  declare props: Props;

  _id = uuid();

  render(): React.ReactElement {
    const {onResizeEnd, width, height, src, fitToParent} = this.props;

    const style: React.CSSProperties = {
      height: height + 'px',
      width: fitToParent ? FP_WIDTH : width + 'px',
    };

    if (fitToParent) {
      style.padding = '0';
      style.margin = '0';
    }

    const boxID = this._id;

    const controls = Object.keys(ResizeDirection).map((key) => {
      return (
        <ImageResizeBoxControl
          boxID={boxID}
          config={ResizeDirection[key]}
          direction={key}
          fitToParent={fitToParent}
          height={height}
          key={key}
          onResizeEnd={onResizeEnd}
          width={width}
        />
      );
    });

    return (
      <span className="molm-czi-image-resize-box" id={boxID} style={style}>
        {controls}
        <img
          alt="unavailable"
          className="molm-czi-image-resize-box-image"
          src={src}
          style={{height: '100%', width: '100%'}}
        />
      </span>
    );
  }
}
