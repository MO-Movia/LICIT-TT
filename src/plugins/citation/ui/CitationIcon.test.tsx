/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { CitationIcon } from './CitationIcon';

jest.mock('./CitationIcon', () => {
  const originalModule = jest.requireActual('./CitationIcon');
  return {
    ...originalModule,
    cached: {},
    CitationIcon: class extends originalModule.CitationIcon {
      static getCachedInstance(key: string): React.ReactNode | undefined {
        return originalModule.CitationIcon.cached[key] as undefined;
      }
    },
  } as unknown;
});

const citIconProps = {};
describe('CitationIcon', () => {
  it('should render the component', () => {
    const wrapper = new CitationIcon({ ...citIconProps });
    const CitationIconRender = wrapper.render();
    expect(CitationIconRender).toBeDefined();
  });
});
