/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {p} from 'jest-prosemirror';
import {DOMOutputSpec} from 'prosemirror-model';
import {toMarkDOM, getMarkAttrs} from './CitationHighlightMarkSpec';

describe('CommentHighlightMarkSpec', () => {
  it('toMarkDOM with properties', () => {
    const mockToDOM = jest.fn((node) => {
      node.attrs.hasComment = true;
      node.attrs.markFrom = 12;
      node.attrs.highlightColor = 'green';
      node.attrs.hasCitation = false;
      return [
        'one',
        [
          {
            hasComment: true,
            markFrom: 11,
            style: 'color: blue',
            hasCitation: false,
          },
        ],
      ] as DOMOutputSpec;
    });
    const node = p('bold');
    const newNode = toMarkDOM(mockToDOM, node);

    expect(newNode).not.toBe(node);
  });

  it('toMarkDOM without properties', () => {
    const mockToDOM = jest.fn((node) => {
      node.attrs.hasComment = true;
      node.attrs.markFrom = 12;
      node.attrs.highlightColor = 'green';
      node.attrs.hasCitation = false;
      return [
        'one',
        [
          {
            hasComment: false,
            markFrom: 0,
            style: 'color: blue',
            hasCitation: false,
          },
        ],
      ] as DOMOutputSpec;
    });
    const node = p('bold');
    const newNode = toMarkDOM(mockToDOM, node);

    expect(newNode).not.toBe(node);
  });

  it('getMarkAttrs transparent', () => {
    const mockGetAttrs = jest.fn((dom) => {
      return {
        hasComment: dom.getAttribute('hasComment'),
        markFrom: dom.getAttribute('markFrom'),
      };
    });
    const dom = document.createElement('span');
    dom.setAttribute('hasComment', 'true');
    dom.setAttribute('markFrom', '1');
    dom.style.backgroundColor = 'transparent';
    dom.style.zIndex = '1';
    dom.style.opacity = '0.25';

    const attrs = getMarkAttrs(mockGetAttrs, dom);

    expect(attrs.highlightColor).toBe('');
    expect(attrs.markFrom).toBe('0.25');
    expect(attrs.appliedHighlight).toBe('rgba(0,0,0,0)');
    expect(attrs.hasCitation).toBe(true);
  });

  it('getMarkAttrs solid color', () => {
    const mockGetAttrs = jest.fn((dom) => {
      return {
        hasComment: dom.getAttribute('hasComment'),
        markFrom: dom.getAttribute('markFrom'),
      };
    });
    const dom = document.createElement('span');
    dom.setAttribute('hasComment', 'true');
    dom.setAttribute('markFrom', '1');
    dom.style.backgroundColor = '#c40df2';
    dom.style.zIndex = '2';
    dom.style.opacity = '0.25';

    const attrs = getMarkAttrs(mockGetAttrs, dom);

    expect(attrs.highlightColor).toBe('#c40df2');
    expect(attrs.markFrom).toBe('0.25');
    expect(attrs.appliedHighlight).toBe('transparent');
    expect(attrs.hasCitation).toBe(false);
  });
});
