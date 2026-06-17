/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState} from 'prosemirror-state';
import {builders} from 'prosemirror-test-builder';
import {schema} from 'jest-prosemirror';
import {MultimediaPlugin} from '../index';
import {Icon} from './Icon';

describe('initialize icon', () => {
  it('renders the superscript branch', () => {
    const rendered = new Icon({ type: 'superscript', title: 'Super' }).render();

    expect(rendered.props.className).toContain('molm-czi-icon');
    expect(rendered.props.className).toContain('superscript');
  });

  it('renders the subscript branch', () => {
    const rendered = new Icon({ type: 'subscript', title: 'Sub' }).render();

    expect(rendered.props.className).toContain('molm-czi-icon');
    expect(rendered.props.className).toContain('subscript');
  });

  it('renders an unknown icon when the type is empty', () => {
    const rendered = new Icon({ type: '' as never, title: 'Fallback' }).render();

    expect(rendered.props.className).toBe('czi-icon-unknown');
    expect(rendered.props.children).toBe('Fallback');
  });

  it('renders an unknown icon when the type is invalid', () => {
    const rendered = new Icon({ type: 'INVALID-TYPE', title: '' }).render();

    expect(rendered.props.className).toBe('czi-icon-unknown');
    expect(rendered.props.children).toBe('INVALID-TYPE');
  });

  it('should handle Icon (case 2)', () => {
    const rendered = icon.render();
    expect(rendered.props.className).toContain('molm-czi-icon');
    expect(rendered.props.children).toBe('type');
  });

  test.each([
    ['superscript', 'molm-czi-icon superscript'],
    ['subscript', 'molm-czi-icon subscript'],
    ['', 'czi-icon-unknown'],
    ['123', 'czi-icon-unknown'],
  ])(
    'should handle Icon type',
    (type, className) => {
      const props = {type, title: 'title'};
      const icon = new Icon(props);
      const rendered = icon.render();
      expect(rendered.props.className).toBe(className);
    }
  );

  it('should cache static icons by type and title', () => {
    expect(Icon.get('image', 'Image')).toBe(Icon.get('image', 'Image'));
    expect(Icon.get('', 'Unknown').props.title).toBe('Unknown');
    expect(Icon.get('image')).toBe(Icon.get('image'));
  });
});
