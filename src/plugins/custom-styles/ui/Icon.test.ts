/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Icon, SubscriptIcon, SuperscriptIcon } from './Icon';

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
    const rendered = icon.render();
    expect(rendered.props.className).toBe('czi-icon superscript');
    expect(rendered.props.children.type).toBe(SuperscriptIcon);
    expect(new SuperscriptIcon({}).render()).toBeDefined();
  });
  it('should handle render when props is subscript', () => {
    const props = {
      type: 'subscript',
      title: '',
    };
    const icon = new Icon(props);
    const rendered = icon.render();
    expect(rendered.props.className).toBe('czi-icon subscript');
    expect(rendered.props.children.type).toBe(SubscriptIcon);
    expect(new SubscriptIcon({}).render()).toBeDefined();
  });

  it('should handle render when props anything else', () => {
    const props = {
      type: 'any',
      title: '',
    };
    const icon = new Icon(props);
    const rendered = icon.render();

    expect(rendered.props.className).toBe('czi-icon any');
    expect(rendered.props.children).toBe('any');
  });
  it('should handle render when props is null', () => {
    const props = {
      type: '',
      title: '',
    };
    const icon = new Icon(props);
    const rendered = icon.render();

    expect(rendered.props.className).toBe('czi-icon-unknown');
    expect(rendered.props.children).toBe('');
  });

  it('should handle render when props is null (case 2)', () => {
    expect(Icon.get('', 'edit')).toBe(Icon.get('', 'edit'));
  });

  it('should use title for invalid icon types', () => {
    const icon = new Icon({ type: 'bad icon', title: 'Bad Icon' });
    const rendered = icon.render();

    expect(rendered.props.className).toBe('czi-icon-unknown');
    expect(rendered.props.children).toBe('Bad Icon');
  });

  it('should fall back to invalid type text and cache without title', () => {
    const rendered = new Icon({ type: 'bad icon' }).render();

    expect(rendered.props.children).toBe('bad icon');
    expect(Icon.get('save')).toBe(Icon.get('save'));
  });
});
