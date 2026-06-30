/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { Node } from 'prosemirror-model';
import {
  VideoNodeSpec,
  getAlign,
  getAttrs,
  getCropRotate,
} from './VideoNodeSpec';

const node = {
  attrs: {
    id: '',
    align: null,
    alt: '',
    crop: null,
    height: 113,
    rotate: null,
    src: 'https://www.youtube.com/embed/ru60J99ojJw',
    title: '',
    width: 200,
  },
} as unknown as Node;

describe('VideoNodeSpec', () => {
  it('dom should have matching node attributes', () => {
    const outputspec = VideoNodeSpec.toDOM(node);
    expect(outputspec).toEqual([
      'iframe',
      {
        align: null,
        allow: 'autoplay',
        allowFullScreen: true,
        alt: '',
        crop: null,
        frameBorder: '0',
        height: 113,
        id: '',
        rotate: null,
        src: 'https://www.youtube.com/embed/ru60J99ojJw',
        title: '',
        width: 200,
      },
    ]);
  });

  it('should not parse string attributes', () => {
    expect(getAttrs('html stuff')).toBeFalsy();
  });
  it('parse dom attributes', () => {
    const dom = document.createElement('span');

    dom.setAttribute('height', '113');
    dom.setAttribute('src', 'https://www.youtube.com/embed/ru60J99ojJw');
    dom.setAttribute('width', '200');
    dom.setAttribute('align', 'right');

    const { id, align, alt, crop, height, rotate, src, title, width } =
      node.attrs;

    const attrs: Record<string, unknown> = {
      id,
      align,
      alt,
      crop,
      height,
      rotate,
      src,
      title,
      width,
    };
    attrs.alt = null;
    attrs.align = dom.getAttribute('align');
    attrs.height = dom.getAttribute('height');

    attrs.src = dom.getAttribute('src');
    attrs.width = dom.getAttribute('width');
    const getAttrs = VideoNodeSpec.parseDOM[0].getAttrs(dom);
    expect(getAttrs).toEqual({
      align: 'right',
      alt: null,
      crop: null,
      height: 113,
      id: null,
      marginLeft: null,
      marginTop: null,
      rotate: null,
      src: 'https://www.youtube.com/embed/ru60J99ojJw',
      title: null,
      width: 200,
    });
  });

  it('parse dom attributes (case 2)', () => {
    const dom = document.createElement('span');

    dom.setAttribute('height', '113');
    dom.setAttribute('src', 'https://www.youtube.com/embed/ru60J99ojJw');
    dom.setAttribute('width', '200');

    dom.style.cssFloat = 'left';
    const { id, align, alt, crop, height, rotate, src, title, width } =
      node.attrs;

    const attrs: Record<string, unknown> = {
      id,
      align,
      alt,
      crop,
      height,
      rotate,
      src,
      title,
      width,
    };
    attrs.alt = null;
    attrs.align = dom.getAttribute('align');
    attrs.height = dom.getAttribute('height');

    attrs.src = dom.getAttribute('src');
    attrs.width = dom.getAttribute('width');

    const getAttrs = VideoNodeSpec.parseDOM[0].getAttrs(dom);
    expect(getAttrs).toEqual({
      align: 'left',
      alt: null,
      crop: null,
      height: 113,
      id: null,
      marginLeft: null,
      marginTop: null,
      rotate: null,
      src: 'https://www.youtube.com/embed/ru60J99ojJw',
      title: null,
      width: 200,
    });
  });
  it('parse dom attributes (case 3)', () => {
    const dom = document.createElement('span');

    dom.setAttribute('height', '113');
    dom.setAttribute('src', 'https://www.youtube.com/embed/ru60J99ojJw');
    dom.setAttribute('width', '200');

    dom.style.display = 'block';
    const { id, align, alt, crop, height, rotate, src, title, width } =
      node.attrs;

    const attrs: Record<string, unknown> = {
      id,
      align,
      alt,
      crop,
      height,
      rotate,
      src,
      title,
      width,
    };
    attrs.alt = null;
    attrs.align = dom.getAttribute('align');
    attrs.height = dom.getAttribute('height');

    attrs.src = dom.getAttribute('src');
    attrs.width = dom.getAttribute('width');

    const getAttrs = VideoNodeSpec.parseDOM[0].getAttrs(dom);
    expect(getAttrs).toEqual({
      align: 'block',
      alt: null,
      crop: null,
      height: 113,
      id: null,
      marginLeft: null,
      marginTop: null,
      rotate: null,
      src: 'https://www.youtube.com/embed/ru60J99ojJw',
      title: null,
      width: 200,
    });
  });

  it('parse dom attributes (case 4)', () => {
    const dom = document.createElement('span');

    dom.setAttribute('height', '113');
    dom.setAttribute('src', 'https://www.youtube.com/embed/ru60J99ojJw');
    dom.setAttribute('width', '200');

    dom.style.cssFloat = 'right';
    const { id, align, alt, crop, height, rotate, src, title, width } =
      node.attrs;

    const attrs: Record<string, unknown> = {
      id,
      align,
      alt,
      crop,
      height,
      rotate,
      src,
      title,
      width,
    };
    attrs.alt = null;
    attrs.align = dom.getAttribute('align');
    attrs.height = dom.getAttribute('height');

    attrs.src = dom.getAttribute('src');
    attrs.width = dom.getAttribute('width');

    const getAttrs = VideoNodeSpec.parseDOM[0].getAttrs(dom);
    expect(getAttrs).toEqual({
      align: 'right',
      alt: null,
      crop: null,
      height: 113,
      id: null,
      marginLeft: null,
      marginTop: null,
      rotate: null,
      src: 'https://www.youtube.com/embed/ru60J99ojJw',
      title: null,
      width: 200,
    });
  });
});
describe('getalign', () => {
  it('should handle getAllign', () => {
    const dom = document.createElement('div');
    dom.setAttribute('align', 'top');
    expect(getAlign(dom, '', '')).toBeNull();
  });
});
describe('getAttrs', () => {
  it('should handle getAllign (case 2)', () => {
    const dom = document.createElement('image');
    dom.setAttribute('align', 'top');
    dom.setAttribute('height', null!);
    dom.setAttribute('width', null!);

    expect(getAttrs(dom)).toStrictEqual({
      align: null,
      alt: null,
      crop: null,
      height: null,
      id: null,
      marginLeft: null,
      marginTop: null,
      rotate: null,
      src: null,
      title: null,
      width: null,
    });
  });
});
describe('getCropRotate', () => {
  it('should handle getcroprotate', () => {
    const parent = document.createElement('div');
    parent.style.display = 'inline-block';
    parent.style.overflow = 'hidden';
    parent.style.width = '10px';
    parent.style.height = '10px';
    const dom = document.createElement('div');
    dom.style.marginLeft = '10px';
    dom.style.marginTop = '10px';
    parent.appendChild(dom);
    dom.setAttribute('fitToParent', '10');
    const getcroprotate = getCropRotate(dom, '10px', '10px');
    expect(getcroprotate).toBeDefined();
  });
  it('should handle getcroprotate (case 2)', () => {
    const parent = document.createElement('div');
    parent.style.display = 'inline-block';
    parent.style.overflow = 'hidden';
    parent.style.width = '0';
    parent.style.height = '0';
    parent.style.transform = 'rotate(1.23rad)';
    const dom = document.createElement('div');
    dom.style.marginLeft = '-1';
    dom.style.marginTop = '-1';
    parent.appendChild(dom);
    dom.setAttribute('fitToParent', '10');
    const getcroprotate = getCropRotate(dom, '-1', '-1');
    expect(getcroprotate).toBeDefined();
  });
  it('should handle getcroprotate (case 3)', () => {
    const parent = document.createElement('div');
    parent.style.display = 'inline-block';
    parent.style.overflow = 'hidden';
    parent.style.width = '0';
    parent.style.height = '0';
    parent.style.transform = 'rotate(0rad)';
    const dom = document.createElement('div');
    dom.style.marginLeft = '10px';
    dom.style.marginTop = '10px';
    parent.appendChild(dom);
    dom.setAttribute('fitToParent', '10');
    const getcroprotate = getCropRotate(dom, '10px', '10px');
    expect(getcroprotate).toBeDefined();
  });
});
