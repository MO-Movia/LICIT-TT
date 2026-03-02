/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {preventEventDefault} from './preventEventDefault';
import * as React from 'react';

describe('preventEventDefault', () => {
  it('calls preventDefault on the event', () => {
    const preventDefaultMock = jest.fn();
    const eventMock = {
      preventDefault: preventDefaultMock,
    } as unknown as React.SyntheticEvent;

    preventEventDefault(eventMock);

    expect(preventDefaultMock).toHaveBeenCalledTimes(1);
  });
});
