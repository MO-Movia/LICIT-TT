/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {LoadingIndicator} from './LoadingIndicator';

describe('Loading Indicator',()=>{
  const loadingindicator = new LoadingIndicator({});
    it('should handle loading indicator',()=>{
        expect(loadingindicator).toBeDefined();
    });
    it('should handle loading indicator',()=>{
        expect(loadingindicator.render()).toBeDefined();
    });
});