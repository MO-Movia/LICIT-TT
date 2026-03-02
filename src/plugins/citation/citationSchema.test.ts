/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {Schema} from 'prosemirror-model';
import {effectiveSchema} from './CitationSchema';

describe('CitationSchema',()=>{
    it('should handle effectiveSchema',()=>{
        expect(effectiveSchema({} as unknown as Schema)).toBeDefined();
    });
});