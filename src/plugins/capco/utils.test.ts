/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import { Item } from './item';
import * as utils from './utils';
import * as item from './item';

describe('utils', () => {
  it('should handle getCursorPosition', () => {
    function eventHandler(this: HTMLInputElement, ev: MouseEvent) {
      return !!ev;
    }
    const input: HTMLInputElement = document.createElement('input');

    input.addEventListener('click', eventHandler);
    const options = {
      bubbles: true,
      cancelable: true,
      view: window,
      target: input,
    };
    const mevent = new MouseEvent('click', options);
    input.dispatchEvent(mevent);

    expect(utils.getCursorPosition(mevent)).toBe(0);
  });
  it('should handle getCursorPosition 2', () => {
    function eventHandler(this: HTMLInputElement, ev: MouseEvent) {
      return !!ev;
    }
    const input = document.createElement('input');

    input.addEventListener('click', eventHandler);
    const options = {
      code: 'ArrowRight',
      key: 'ArrowUp',
      location: 1,
    };
    const mevent = new KeyboardEvent('keydown', options);
    input.dispatchEvent(mevent);

    expect(utils.getCursorPosition(mevent)).toBe(1);
  });

  it('should handle getValueWithoutSlash', () => {
    expect(utils.getValueWithoutSlash('TEST//')).toBe('TEST');
  });
  it('should handle getValueWithoutSlash else statement', () => {
    expect(utils.getValueWithoutSlash('TEST,,')).toBe('TEST');
  });
  it('should handle getCapcoString else statement', () => {
    expect(utils.getCapcoString('CUI')).toBe('error');
  });
  it('should handle removeAnItem', () => {
    const fnitem = () => {
      return new Item('SCI', 'Sensitive Compartmented Information', 1);
    };
    const items = [new Item('SCT', 'Sensitive Compartmented Information', 2)];
    expect(item.removeAnItem('test', fnitem, items)).toEqual([
      {
        code: 'SCT',
        description: 'Sensitive Compartmented Information',
        display: 'SCT',
        order: 2,
      },
    ]);
  });
  it('should handle removeAnItem branch', () => {
    const fnitem = () => {
      return new Item('SCI', 'Sensitive Compartmented Information', 1);
    };
    const items = [new Item('SCI', 'Sensitive Compartmented Information', 2)];
    expect(item.removeAnItem('test', fnitem, items)).toStrictEqual([]);
  });
  it('should handle safeCapcoParse null', () => {
    expect(utils.safeCapcoParse(undefined).portionMarking).toBe('error');
  });
  it('should handle safeCapcoParse string', () => {
    expect(utils.safeCapcoParse('TBD').portionMarking).toBe('error');
  });
  it('should handle safeCapcoParse object', () => {
    expect(
      utils.safeCapcoParse(JSON.parse('{"portionMarking": "SECRET"}'))
        .portionMarking
    ).toBe('SECRET');
  });
  it('should handle safeCapcoParse json', () => {
    expect(
      utils.safeCapcoParse('{"portionMarking": "SECRET"}').portionMarking
    ).toBe('SECRET');
  });
});
