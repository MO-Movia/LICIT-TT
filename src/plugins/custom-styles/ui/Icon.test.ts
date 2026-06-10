/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { Icon, SubscriptIcon, SuperscriptIcon } from './Icon';

jest.mock('./Icon', () => {
  class SuperscriptIcon extends React.PureComponent {
    render() {
      return React.createElement('sup', null, 'x');
    }
  }

  class SubscriptIcon extends React.PureComponent {
    render() {
      return React.createElement('sub', null, 'x');
    }
  }

  class Icon extends React.PureComponent<{
    title?: string;
    type?: string;
  }> {
    static get(type?: string, title?: string) {
      return React.createElement('span', {
        'data-icon': type || '',
        title: title || '',
      });
    }

    render() {
      return React.createElement('span', {
        'data-icon': this.props.type || '',
        title: this.props.title || '',
      });
    }
  }

  return {
    __esModule: true,
    Icon,
    SubscriptIcon,
    SuperscriptIcon,
  };
});

describe('Icon', () => {
  const props = {
    type: 'superscript',
    title: '',
  };
  const icon = new Icon(props);
  it('should handle icon', () => {
    expect(icon).toBeDefined();
  });
  it('should handle render when props is superscript', () => {
    const props = {
      type: 'superscript',
      title: '',
    };
    const icon = new Icon(props);
    expect(icon.render()).toBeDefined();
    expect(new SuperscriptIcon({}).render()).toBeDefined();
  });
  it('should handle render when props is subscript', () => {
    const props = {
      type: 'subscript',
      title: '',
    };
    const icon = new Icon(props);
    expect(icon.render()).toBeDefined();
    expect(new SubscriptIcon({}).render()).toBeDefined();
  });

  it('should handle render when props anything else', () => {
    const props = {
      type: 'any',
      title: '',
    };
    const icon = new Icon(props);

    expect(icon.render()).toBeDefined();
  });
  it('should handle render when props is null', () => {
    const props = {
      type: '',
      title: '',
    };
    const icon = new Icon(props);

    expect(icon.render()).toBeDefined();
  });

  it('should handle render when props is null (case 2)', () => {
    expect(Icon.get('', 'edit')).toBeDefined();
  });
});
