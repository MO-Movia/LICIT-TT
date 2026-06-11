/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {observe, unobserve} from './ResizeObserver';

describe('Resize observer', () => {
  it('should handle observe', () => {
    const element = document.createElement('div');
    const callback = (_ResizeObserverEntry) => undefined;
    expect(observe(element, callback)).toBeUndefined();
    expect(unobserve(element, callback)).toBeUndefined();
  });
  it('should handle observe when nodesObserving.has(el)', () => {
    const element = document.createElement('span');
    observe(element, (_ResizeObserverEntry) => undefined);
    const element1 = document.createElement('span');

    expect(observe(element1, (_element1) => undefined)).toBeUndefined();
    expect(observe(element1, (_element1) => undefined)).toBeUndefined();
  });
  it('should handle unobserve', () => {
    const element = document.createElement('div');
    expect(
      unobserve(element, (_ResizeObserverEntry) => undefined)
    ).toBeUndefined();
  });
  it('should handle unobserve (case 2)', () => {
    const element = document.createElement('div');
    expect(unobserve(element)).toBeUndefined();
    expect(unobserve(element)).toBeUndefined();
  });
  it('should handle unobserve when nodesObserving.has(el)', () => {
    const element = document.createElement('span');
    observe(element, (_ResizeObserverEntry) => undefined);
    expect(
      unobserve(element, (_ResizeObserverEntry) => undefined)
    ).toBeUndefined();
  });
  it('should handle unobserve when callbacks length > 0', () => {
    const element = document.createElement('div');
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    observe(element, callback1);
    observe(element, callback2);
    expect(unobserve(element, callback1)).toBeUndefined();
  });
  it('should handle unobserve when callbacks length becomes 0', () => {
    const element = document.createElement('div');
    const callback = jest.fn();
    observe(element, callback);
    expect(unobserve(element, callback)).toBeUndefined();
  });
  it('should handle unobserve when nodesObserving size becomes 0', () => {
    const element = document.createElement('div');
    const callback = jest.fn();
    observe(element, callback);
    expect(unobserve(element, callback)).toBeUndefined();
  });
  it('should handle observe with multiple callbacks on same element', () => {
    const element = document.createElement('div');
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    observe(element, callback1);
    observe(element, callback2);
    expect(unobserve(element, callback1)).toBeUndefined();
    expect(unobserve(element, callback2)).toBeUndefined();
  });
});
