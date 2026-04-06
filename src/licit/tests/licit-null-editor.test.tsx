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
  const actual = jest.requireActual('@tiptap/react');
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
    expect(ref.current).toBeDefined();

    if (ref.current) {
      ref.current.goToEnd();
      ref.current.pageLayout();
      const emptyDoc = {type: 'doc', content: []} as JSONContent;
      ref.current.setContent(emptyDoc);
      ref.current.insertJSON(emptyDoc);
      const content = ref.current.getContent();
      expect(typeof content).toBe('object');
    }
  });
});
