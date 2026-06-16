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
    const rendered = new Icon({ type: 'video_embed', title: 'Video' }).render();

    expect(rendered.props.className).toContain('molm-czi-icon');
    expect(rendered.props.className).toContain('video_embed');
    expect(rendered.props.children).toBe('video_embed');
  });

  it('reuses cached icons for the same key', () => {
    const first = Icon.get('video_embed', 'Video');
    const second = Icon.get('video_embed', 'Video');
    const different = Icon.get('video_embed', 'Other');

    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });
});
