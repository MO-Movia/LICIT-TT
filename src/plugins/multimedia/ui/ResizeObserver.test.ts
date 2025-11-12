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
  it('should handle unobserve', () => {
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
});
