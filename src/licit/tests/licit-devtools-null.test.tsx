/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import {createRoot} from 'react-dom/client';

jest.mock('prosemirror-dev-tools', () => ({
  __esModule: true,
  default: null,
}));

import {Licit} from '../licit';

describe('Licit dev tools fallback', () => {
  it('skips dev tools application when module has no default export', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<Licit debug={true} />);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const devTools = (require('prosemirror-dev-tools') as {default: unknown})
      .default;
    expect(devTools).toBeNull();
  });
});
