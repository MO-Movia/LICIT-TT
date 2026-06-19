/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Icon } from './Icon';

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

  it('renders a normal icon when the type is valid', () => {
    const rendered = new Icon({ type: 'table_row', title: 'Rows' }).render();

    expect(rendered.props.className).toContain('molm-czi-icon');
    expect(rendered.props.className).toContain('table_row');
    expect(rendered.props.children).toBe('table_row');
  });

  it('reuses cached icons for the same key', () => {
    const first = Icon.get('table_row', 'Rows');
    const second = Icon.get('table_row', 'Rows');
    const different = Icon.get('table_row', 'Other');

    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });
});
