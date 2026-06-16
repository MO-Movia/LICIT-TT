/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { Icon, SubscriptIcon, SuperscriptIcon } from './Icon';

describe('Icon', () => {
  it('renders superscript and subscript helper icons', () => {
    expect(new SuperscriptIcon({}).render()).toBeDefined();
    expect(new SubscriptIcon({}).render()).toBeDefined();
  });

  it('renders the superscript icon branch', () => {
    const rendered = new Icon({ type: 'superscript', title: '' }).render();

    expect(rendered.props.className).toBe('czi-icon superscript');
    expect(rendered.props.children.type).toBe(SuperscriptIcon);
  });

  it('renders the subscript icon branch', () => {
    const rendered = new Icon({ type: 'subscript', title: '' }).render();

    expect(rendered.props.className).toBe('czi-icon subscript');
    expect(rendered.props.children.type).toBe(SubscriptIcon);
  });

  it('renders unknown icons using the title fallback', () => {
    const rendered = new Icon({ type: '', title: 'edit' }).render();

    expect(rendered.props.className).toBe('czi-icon-unknown');
    expect(rendered.props.children).toBe('edit');
  });

  it('renders unknown icons using the raw type when the title is missing', () => {
    const rendered = new Icon({ type: 'bad icon!', title: '' }).render();

    expect(rendered.props.className).toBe('czi-icon-unknown');
    expect(rendered.props.children).toBe('bad icon!');
  });

  it('renders valid icon types as text icons', () => {
    const rendered = new Icon({ type: 'any_icon', title: '' }).render();

    expect(rendered.props.className).toBe('czi-icon any_icon');
    expect(rendered.props.children).toBe('any_icon');
  });

  it('caches icons by type and title', () => {
    const first = Icon.get('edit', 'Edit');
    const second = Icon.get('edit', 'Edit');
    const different = Icon.get('edit', 'Rename');

    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });
});
