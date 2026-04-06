/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import {createRoot} from 'react-dom/client';
import {JSONContent} from '@tiptap/core';

jest.mock('@tiptap/react', () => {
  const actual = jest.requireActual<typeof import('@tiptap/react')>('@tiptap/react');
  return {
    ...actual,
    useEditor: () => null,
  };
});

import {Licit, LicitHandle} from '../licit';

describe('Licit with null editor', () => {
  it('handles ref methods when editor is null', async () => {
    const ref = React.createRef<LicitHandle>();
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<Licit ref={ref} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.firstChild).toBeDefined();
    expect(ref.current).not.toBeNull();

    const handle = ref.current;
    if (!handle) {
      throw new Error('Expected Licit ref to be available');
    }
    handle.goToEnd();
    handle.pageLayout();
    const emptyDoc = {type: 'doc', content: []} as JSONContent;
    handle.setContent(emptyDoc);
    handle.insertJSON(emptyDoc);
    const content = handle.getContent();
    expect(typeof content).toBe('object');
  });
});
