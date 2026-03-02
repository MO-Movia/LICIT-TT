/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import { Item } from './item';

describe('item',()=>{
    it('should handle item',()=>{
        const item = new Item('code','description');
        item.addChild(new Item('SCT', 'Sensitive Compartmented Information',2));
        item.removeChild('SCT');
        expect(item).toBeDefined();
    });
    it('should handle getChild',()=>{
        const item = new Item('code','description');
        item.children = [new Item('code', 'Sensitive Compartmented Information',2)];

        expect(item.getChild('string')).toBeUndefined();
    });
    it('should handle checkCode', () => {
    const item = new Item('code', 'description');
    const otherItem = new Item('SCT', 'Sensitive Compartmented Information', 2);

    expect(item.checkCode(otherItem, 'code')).toBeFalsy();
    });
    it('should return true when codes match', () => {
    const item = new Item('SCI', 'Sensitive Compartmented Information');
    const otherItem = new Item('SCI', 'Sensitive Compartmented Information');

    expect(item.checkCode(otherItem, 'SCI')).toBeTruthy();
    });
});