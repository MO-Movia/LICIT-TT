/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {getDefaultMenuItems} from './FloatingMenuDefaults';

describe('FloatingMenuDefaults', () => {
  it('should return default menu items', () => {
    const handlers = {
      enableCopy: () => true,
      enablePaste: () => true,
      enablePasteAsReference: () => false,
      enableCitationAndComment: () => true,
      enableTagAndInfoicon: () => true,
      copyRich: () => undefined,
      copyPlain: () => undefined,
      paste: () => undefined,
      pastePlain: () => undefined,
      pasteAsReference: () => undefined,
      createCitation: () => undefined,
      createInfoIcon: () => undefined,
      createSlice: () => undefined,
      showReferences: () => undefined,
      addComment: () => undefined,
      addTag: () => undefined,
    };

    const items = getDefaultMenuItems(handlers);
    expect(items.length).toBeGreaterThan(0);
    expect(items.map((item) => item.id)).toContain('copy');
    expect(items.map((item) => item.id)).toContain('paste');
  });
});
