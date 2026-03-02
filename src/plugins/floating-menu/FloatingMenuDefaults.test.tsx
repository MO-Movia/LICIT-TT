/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { getDefaultMenuItems } from './FloatingMenuDefaults';
import { FloatingMenuItem, FloatingMenuContext } from './model';

describe('getDefaultMenuItems', () => {
  let handlers: Record<string, jest.Mock>;

  beforeEach(() => {
    handlers = {
      enableCitationAndComment: jest.fn(() => true),
      enableTagAndInfoicon: jest.fn(() => true),
      enableCopy: jest.fn(() => true),
      enablePaste: jest.fn(() => true),
      enablePasteAsReference: jest.fn(() => true),

      addComment: jest.fn(),
      addTag: jest.fn(),
      createCitation: jest.fn(),
      createInfoIcon: jest.fn(),
      copyRich: jest.fn(),
      copyPlain: jest.fn(),
      paste: jest.fn(),
      pastePlain: jest.fn(),
      pasteAsReference: jest.fn(),
      createSlice: jest.fn(),
      showReferences: jest.fn(),
    };
  });

  it('returns all default menu items in correct order', () => {
    const items = getDefaultMenuItems(handlers);

    const labels = items.map((i) => i.label);

    expect(labels).toEqual([
      'Add Comment',
      'Add Tag',
      'Create Citation',
      'Create Infoicon',
      'Copy (Ctrl + C)',
      'Copy Without Formatting',
      'Paste (Ctrl + V)',
      'Paste As Plain Text',
      'Paste As Reference (Ctrl + Alt + V)',
      'Create Referent',
      'Insert Reference',
    ]);
  });

  it('returns valid FloatingMenuItem objects', () => {
    const items = getDefaultMenuItems(handlers);

    items.forEach((item: FloatingMenuItem) => {
      expect(item.id).toBeDefined();
      expect(item.label).toBeDefined();
      expect(typeof item.onClick).toBe('function');
    });
  });

  it('wires enable predicates correctly', () => {
    const items = getDefaultMenuItems(handlers);

    const citation = items.find((i) => i.id === 'citation');
    const copy = items.find((i) => i.id === 'copy');
    const pasteRef = items.find((i) => i.id === 'paste-ref');

    citation.isEnabled?.({} as unknown as FloatingMenuContext);
    copy.isEnabled?.({} as unknown as FloatingMenuContext);
    pasteRef.isEnabled?.({} as unknown as FloatingMenuContext);

    expect(handlers.enableCitationAndComment).toHaveBeenCalled();
    expect(handlers.enableCopy).toHaveBeenCalled();
    expect(handlers.enablePasteAsReference).toHaveBeenCalled();
  });

  it('wires click handlers correctly', () => {
    const items = getDefaultMenuItems(handlers);

    items.find((i) => i.id === 'comment').onClick();
    items.find((i) => i.id === 'tag').onClick();
    items.find((i) => i.id === 'citation').onClick();
    items.find((i) => i.id === 'info').onClick();
    items.find((i) => i.id === 'copy').onClick();
    items.find((i) => i.id === 'copy-plain').onClick();
    items.find((i) => i.id === 'paste').onClick();
    items.find((i) => i.id === 'paste-plain').onClick();
    items.find((i) => i.id === 'paste-ref').onClick();
    items.find((i) => i.id === 'slice').onClick();
    items.find((i) => i.id === 'insert-ref').onClick();

    expect(handlers.addComment).toHaveBeenCalled();
    expect(handlers.addTag).toHaveBeenCalled();
    expect(handlers.createCitation).toHaveBeenCalled();
    expect(handlers.createInfoIcon).toHaveBeenCalled();
    expect(handlers.copyRich).toHaveBeenCalled();
    expect(handlers.copyPlain).toHaveBeenCalled();
    expect(handlers.paste).toHaveBeenCalled();
    expect(handlers.pastePlain).toHaveBeenCalled();
    expect(handlers.pasteAsReference).toHaveBeenCalled();
    expect(handlers.createSlice).toHaveBeenCalled();
    expect(handlers.showReferences).toHaveBeenCalled();
  });

  it('does not require enable predicates for items that do not define them', () => {
    const items = getDefaultMenuItems(handlers);

    const slice = items.find((i) => i.id === 'slice');
    const insertRef = items.find((i) => i.id === 'insert-ref');

    expect(slice.isEnabled).toBeUndefined();
    expect(insertRef.isEnabled).toBeUndefined();
  });
});
