/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { EditorState } from 'prosemirror-state';
import { builders } from 'prosemirror-test-builder';
import { schema } from 'jest-prosemirror';
import { EnhancedTableFigure } from '../index';
import { Icon } from './Icon';

jest.mock('./Icon', () => {
  const React = require('react');

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
  };
});

describe('initialize icon', () => {
  const plugin = new EnhancedTableFigure();
  const effSchema = plugin.getEffectiveSchema(schema);
  const { doc, p } = builders(effSchema, { p: { nodeType: 'paragraph' } });

  const state = EditorState.create({
    doc: doc(p('Hello World!!')),
    schema: schema,
  });
  state.plugins.concat([plugin]);

  const props = { type: 'type', title: 'title' };
  const icon = new Icon(props);
  it('should handle Icon', () => {
    expect(icon).toBeDefined();
  });

  it('should handle Icon (case 2)', () => {
    expect(icon.render()).toBeDefined();
  });

  test.each(['superscript', 'subscript', undefined])(
    'should handle Icon type',
    (type) => {
      const props = { type, title: 'title' };
      const icon = new Icon(props);
      expect(icon.render()).toBeDefined();
    }
  );
});
