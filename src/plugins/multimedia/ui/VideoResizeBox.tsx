import cx from 'classnames';
import React from 'react';

import {clamp} from '@modusoperandi/licit-ui-commands';
import {v1 as uuid} from 'uuid';

export type VideoResizeProps = {
  height: number;
  onResizeEnd: (w: number, height: number) => void;
  src: string;
  width: number;
};

export const MIN_SIZE = 20;
export const MAX_SIZE = 10000;

function setWidth(el: HTMLElement, width: number): void {
  el.style.width = width + 'px';
}

function setHeight(el: HTMLElement, height: number): void {
  el.style.height = height + 'px';
}

function setSize(el: HTMLElement, width: number, height: number): void {
  el.style.width = Math.round(width) + 'px';
  el.style.height = Math.round(height) + 'px';
}

export type ResizeHadleDirection =
  | 'top'
  | 'top_right'
  | 'right'
  | 'bottom_right'
  | 'bottom'
  | 'bottom_left'
  | 'left'
  | 'top_left';

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
type VideoResizeBoxControlProps = {
  boxID: string;
  direction: ResizeHadleDirection;
  height: number;
  onResizeEnd: (w: number, height: number) => void;
  width: number;
};
export class VideoResizeBoxControl extends React.PureComponent {
  declare props: VideoResizeBoxControlProps;

  _active = false;
  _el?: HTMLElement;
  _h = '';
  _rafID? = 0;
  _w = '';
  _x1 = 0;
  _x2 = 0;
  _y1 = 0;
  _y2 = 0;
  _ww = 0;
  _hh = 0;

  componentWillUnmount(): void {
    this._end();
  }

  render(): React.ReactElement {
    const {direction} = this.props;

    const className = cx({
      'molm-czi-image-resize-box-control': true,
      [direction]: true,
    });

    return <span className={className} onMouseDown={this._onMouseDown} />;
  }

  _syncSize = (): void => {
    if (!this._active) {
      return;
    }
    const {direction, width, height} = this.props;

    const dx = (this._x2 - this._x1) * (/left/.test(direction) ? -1 : 1);
    const dy = (this._y2 - this._y1) * (/top/.test(direction) ? -1 : 1);

    const el = this._el;
    if (!el) {
      throw new Error('Resizable element not initialized.');
    }

    const fn = ResizeDirection[direction];
    if (!fn) {
      throw new Error(
        `Resize function for direction '${direction}' not found.`
      );
    }

    const aspect = width / height;
    let ww = clamp(MIN_SIZE, width + Math.round(dx), MAX_SIZE);
    let hh = clamp(MIN_SIZE, height + Math.round(dy), MAX_SIZE);

    if (fn === setSize) {
      hh = Math.max(ww / aspect, MIN_SIZE);
      ww = hh * aspect;
    }

    fn(el, Math.round(ww), Math.round(hh));
    this._ww = ww;
    this._hh = hh;
  };

  _start(e: React.MouseEvent): void {
    if (this._active) {
      this._end();
    }

    this._active = true;

    const {boxID, direction, width, height} = this.props;
    const el = document.getElementById(boxID);
    if (!el) {
      throw new Error(`Element with ID '${boxID}' not found.`);
    }
    el.className += ' ' + direction;

    this._el = el;
    this._x1 = e.clientX;
    this._y1 = e.clientY;
    this._x2 = this._x1;
    this._y2 = this._y1;
    this._w = this._el.style.width;
    this._h = this._el.style.height;
    this._ww = width;
    this._hh = height;

    document.addEventListener('mousemove', this._onMouseMove, true);
    document.addEventListener('mouseup', this._onMouseUp, true);
  }

  _end(): void {
    if (!this._active) {
      return;
    }

    this._active = false;
    document.removeEventListener('mousemove', this._onMouseMove, true);
    document.removeEventListener('mouseup', this._onMouseUp, true);

    const el = this._el;
    if (!el) {
      throw new Error('Resizable element not initialized.');
    }
    el.style.width = this._w;
    el.style.height = this._h;
    el.className = 'molm-czi-image-resize-box';
    this._el = undefined;
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
    }
    this._rafID = undefined;
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
    this._rafID = requestAnimationFrame(this._syncSize);
  };

  _onMouseUp = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this._x2 = e.clientX;
    this._y2 = e.clientY;

    const {direction} = this.props;
    const el = this._el;
    if (!el) {
      throw new Error('Resizable element not initialized.');
    }
    el.classList.remove(direction);

    this._end();
    this.props.onResizeEnd(this._ww, this._hh);
  };
}

export class VideoResizeBox extends React.PureComponent {
  declare props: VideoResizeProps;

  _id = uuid();

  render(): React.ReactElement<VideoResizeBoxControl> {
    const {onResizeEnd, width, height} = this.props;

    const style = {
      height: height + 'px',
      width: width + 'px',
    };

    const boxID = this._id;

    const controls = Object.keys(ResizeDirection).map((key) => {
      return (
        <VideoResizeBoxControl
          boxID={boxID}
          direction={key as ResizeHadleDirection}
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
      </span>
    );
  }
}
