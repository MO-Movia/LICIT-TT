/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { AlertInfo } from './AlertInfo';
import { render } from '@testing-library/react';

describe('AlertInfo', () => {
  it('renders with provided title and content', () => {
    const alertProps = {
      initialValue: {},
      title: 'Custom Title',
      content: 'Custom Content',
      close: () => null,
    };
    const alertIns = new AlertInfo(alertProps);
    expect(alertIns.props.title).toEqual('Custom Title');
    expect(alertIns.props.content).toEqual('Custom Content');
  });

  it('renders with default title when title prop is undefined', () => {
    const alertProps = {
      initialValue: {},
      title: undefined,
      content: 'Custom Content',
      close: () => null,
    };
    const { container } = render(<AlertInfo {...alertProps} />);
    const defaultTitle = container.querySelector('strong');

    expect(defaultTitle).toBeDefined();
  });

  it('renders with default content when content prop is undefined', () => {
    const alertProps = {
      initialValue: {},
      title: 'Custom Title',
      content: undefined,
      close: () => null,
    };
    const { container } = render(<AlertInfo {...alertProps} />);
    const defaultContent = container.querySelector('span');

    expect(defaultContent).toBeDefined();
  });
});
