/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { clamp } from './clamp';
import { fromHTMlElement, fromXY, isIntersected } from './rects';
import type { PositionHandler } from './PopUpPosition';
import type { Rect } from './rects';

export type PopUpDetails = {
  anchor?: HTMLElement;
  anchorRect?: Rect;
  autoDismiss: boolean;
  body?: HTMLElement;
  bodyRect?: Rect;
  close: (val) => void;
  modal: boolean;
  position: PositionHandler;
  popupId: string;
  contextPos?: {x: number; y: number};
};

export type PopUpBridge = {
  getDetails: () => PopUpDetails;
};

const CLICK_INTERVAL = 350;
const DUMMY_RECT = { x: -10000, y: -10000, w: 0, h: 0 };
const HOVER_PADDING = 8;

export class PopUpManager {
  _bridges = new Map<PopUpBridge, number>();
  _positions = new Map<PopUpBridge, string | null>();
  isColorPicker = false;

  _mx = 0;
  _my = 0;
  _rafID = 0;

  register(bridge: PopUpBridge): void {
    this._bridges.set(bridge, Date.now());
    this._positions.set(bridge, null);
    if (this._bridges.size === 1) {
      this._observe();
    }
    this._rafID = requestAnimationFrame(this._syncPosition);
  }

  unregister(bridge: PopUpBridge): void {
    this._bridges.delete(bridge);
    this._positions.delete(bridge);
    this.isColorPicker = false;
    if (this._bridges.size === 0) {
      this._unobserve();
    }
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
    }
  }

  _observe(): void {
    this._unobserve();
    document.addEventListener('mousemove', this._onMouseChange, false);
    document.addEventListener('mouseup', this._onMouseChange, false);
    document.addEventListener('click', this._onClick, false);
    window.addEventListener('scroll', this._onScroll, true);
    window.addEventListener('resize', this._onResize, true);
  }

  _unobserve(): void {
    document.removeEventListener('mousemove', this._onMouseChange, false);
    document.removeEventListener('mouseup', this._onMouseChange, false);
    document.removeEventListener('click', this._onClick, false);
    window.removeEventListener('scroll', this._onScroll, true);
    window.removeEventListener('resize', this._onResize, true);
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
    }
  }

  _onScroll = (_e: Event): void => {
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
    }
    this._rafID = requestAnimationFrame(this._syncPosition);
  };

  _onResize = (_e: Event): void => {
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
    }
    this._rafID = requestAnimationFrame(this._syncPosition);
  };

  _onMouseChange = (e: MouseEvent): void => {
    this._mx = Math.round(e.clientX);
    this._my = Math.round(e.clientY);
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
    }
    this._rafID = requestAnimationFrame(this._syncPosition);
  };

  _isColorPickerClick(details: PopUpDetails, target: EventTarget | null): boolean {
    if (!details.autoDismiss || !details.popupId) {
      return false;
    }

    const targetName = String((target as HTMLElement | null)?.className || '');
    return targetName.startsWith('mocp');
  }

  _getModalToDismiss(now: number, target: EventTarget | null): PopUpDetails | null {
    let detailsWithModalToDismiss: PopUpDetails | null = null;

    for (const [bridge, registeredAt] of this._bridges) {
      if (now - registeredAt <= CLICK_INTERVAL) {
        continue;
      }

      const details = bridge.getDetails();
      if (details.modal && details.autoDismiss) {
        detailsWithModalToDismiss = details;
      }

      if (this._isColorPickerClick(details, target)) {
        this.isColorPicker = true;
        return null;
      }
    }

    return detailsWithModalToDismiss;
  }

  _dismissModalOnOutsideClick(e: MouseEvent, details: PopUpDetails): void {
    const { body, close } = details;
    const pointer = fromXY(e.clientX, e.clientY, 1);
    const bodyRect = body ? fromHTMlElement(body) : null;

    if (!bodyRect || !isIntersected(pointer, bodyRect)) {
      this.isColorPicker = false;
      close(undefined);
    }
  }

  _onClick = (e: MouseEvent): void => {
    const now = Date.now();
    this.isColorPicker = false;
    const detailsWithModalToDismiss = this._getModalToDismiss(now, e.target);

    if (!detailsWithModalToDismiss) {
      return;
    }

    this._dismissModalOnOutsideClick(e, detailsWithModalToDismiss);
  };

  _collectBridgeDetails(): Map<PopUpBridge, PopUpDetails> {
    const bridgeToDetails = new Map<PopUpBridge, PopUpDetails>();

    for (const [bridge] of this._bridges) {
      const details = bridge.getDetails();
      bridgeToDetails.set(bridge, details);

      const { anchor, body } = details;
      if (body instanceof HTMLElement) {
        details.bodyRect = fromHTMlElement(body);
      }
      if (anchor instanceof HTMLElement) {
        details.anchorRect = fromHTMlElement(anchor);
      }
    }

    return bridgeToDetails;
  }

  _setBodyPosition(details: PopUpDetails, x: number, y: number): void {
    const { anchorRect, body, bodyRect, contextPos } = details;
    if (!body || !bodyRect) {
      return;
    }

    const ax = anchorRect
      ? clamp(
        0,
        anchorRect.x - x + anchorRect.w / 2,
        bodyRect.w - anchorRect.w / 2
      )
      : 0;

    const bodyStyle = body.style;
    bodyStyle.position = 'absolute';
    if (contextPos) {
      bodyStyle.left = `${contextPos.x}px`;
      bodyStyle.top = `${contextPos.y}px`;
      bodyRect.x = contextPos.x;
      bodyRect.y = contextPos.y;
    } else {
      bodyStyle.left = `${x}px`;
      bodyStyle.top = `${y}px`;
      bodyRect.x = x;
      bodyRect.y = y;
    }
    bodyStyle.setProperty('--czi-pop-up-anchor-offset-left', `${ax}px`);
  }

  _syncBridgePlacement(bridge: PopUpBridge, details: PopUpDetails): void {
    const { anchorRect, bodyRect, position, body } = details;
    if (!bodyRect && !anchorRect) {
      return;
    }

    const { x, y } = position(anchorRect, bodyRect);
    const positionKey = `${x}-${y}`;
    if (!body || !bodyRect || this._positions.get(bridge) === positionKey) {
      return;
    }

    this._positions.set(bridge, positionKey);
    this._setBodyPosition(details, x, y);
  }

  _getHoveredAnchors(
    bridgeToDetails: Map<PopUpBridge, PopUpDetails>,
    pointer: Rect
  ): Set<HTMLElement> {
    const hoveredAnchors = new Set<HTMLElement>();

    for (const [bridge, details] of bridgeToDetails) {
      this._syncBridgePlacement(bridge, details);

      const { anchor, bodyRect, anchorRect } = details;
      if (
        isIntersected(pointer, bodyRect || DUMMY_RECT, HOVER_PADDING) ||
        isIntersected(pointer, anchorRect || DUMMY_RECT, HOVER_PADDING)
      ) {
        if (anchor) {
          hoveredAnchors.add(anchor);
        }
      }
    }

    return hoveredAnchors;
  }

  _expandHoveredAnchors(
    bridgeToDetails: Map<PopUpBridge, PopUpDetails>,
    hoveredAnchors: Set<HTMLElement>
  ): void {
    let size;

    do {
      size = hoveredAnchors.size;

      for (const [, details] of bridgeToDetails) {
        const { anchor, body } = details;

        for (const hoveredAnchor of hoveredAnchors) {
          if (
            anchor &&
            body &&
            !hoveredAnchors.has(anchor) &&
            body.contains(hoveredAnchor)
          ) {
            hoveredAnchors.add(anchor);
          }
        }
      }
    } while (hoveredAnchors.size !== size);
  }

  _dismissUnhoveredPopups(
    bridgeToDetails: Map<PopUpBridge, PopUpDetails>,
    hoveredAnchors: Set<HTMLElement>
  ): void {
    const now = Date.now();

    for (const [bridge, registeredAt] of this._bridges) {
      const details = bridgeToDetails.get(bridge);
      if (!details) {
        continue;
      }

      const { autoDismiss, anchor, close, modal } = details;
      if (
        autoDismiss &&
        !modal &&
        now - registeredAt > CLICK_INTERVAL &&
        !hoveredAnchors.has(anchor) &&
        !this.isColorPicker
      ) {
        close(undefined);
      }
    }
  };

  _syncPosition = (): void => {
    this._rafID = 0;
    const bridgeToDetails = this._collectBridgeDetails();
    const pointer = fromXY(this._mx, this._my, 2);
    const hoveredAnchors = this._getHoveredAnchors(bridgeToDetails, pointer);
    this._expandHoveredAnchors(bridgeToDetails, hoveredAnchors);
    this._dismissUnhoveredPopups(bridgeToDetails, hoveredAnchors);
  };
}

const instance = new PopUpManager();

export default instance;
