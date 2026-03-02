/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import {Item} from './item';
import {Compartment} from './compartment';
describe('CapcoCompartment', () => {
  const comp = new Compartment('div');
  it('addItem', () => {
    const item = new Item('SCI', 'Sensitive Compartmented Information');
    const c = comp.addItem(item);
    expect(c).toBeUndefined();
  });

  it('removeItem', () => {
    const item = new Item('SCI', 'Sensitive Compartmented Information');
    comp.addItem(item);
    const c = comp.removeItem('SCI');
    expect(c).toBeUndefined();
  });

    it('getItem returns the matching item by code', () => {
      const item = new Item('SCI', 'Sensitive Compartmented Information');
      comp.addItem(item);

      const result = comp.getItem('SCI');
      expect(result).toBe(item);
      expect(result?.code).toBe('SCI');
    });

    it('getItem returns undefined when code does not exist', () => {
    const item = new Item('SCI', 'Sensitive Compartmented Information');
    comp.addItem(item);

    const result = comp.getItem('UNKNOWN');

    expect(result).toBeUndefined();
  });

  it('should handle checkCode', () => {
    const item = new Item('SCI', 'Sensitive Compartmented Information');

    expect(
      item.checkCode(
        new Item('SCT', 'Sensitive Compartmented Information', 2),
        'SCI'
      )
    ).toBeFalsy();

    expect(
      item.checkCode(
        new Item('SCI', 'Sensitive Compartmented Information', 2),
        'SCI'
      )
    ).toBeTruthy();
  });
});
