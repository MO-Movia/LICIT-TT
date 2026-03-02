/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {InfoIconCommand} from './infoIconCommand';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import { Schema } from 'prosemirror-model';

describe('InfoIconCommand',()=>{
    const infoCommand = new InfoIconCommand('');


const mockSchema = new Schema({
  nodes: {
    doc: {
      content: 'block+',
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [
        { tag: 'h1', attrs: { level: 1 } },
        { tag: 'h2', attrs: { level: 2 } },
        { tag: 'h3', attrs: { level: 3 } },
      ],
      toDOM: (node) => ['h' + node.attrs.level, 0],
    },
    text: {
      group: 'inline',
    },
    image: {
      inline: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
      },
      group: 'inline',
      draggable: true,
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs: (dom) => ({
            src: dom.getAttribute('src'),
            alt: dom.getAttribute('alt'),
            title: dom.getAttribute('title'),
          }),
        },
      ],
      toDOM: (node) => [
        'img',
        {
          src: node.attrs.src,
          alt: node.attrs.alt,
          title: node.attrs.title,
        },
      ],
    },
    illustration: {
      inline: false,
      attrs: {
        url: {},
        caption: { default: null },
      },
      group: 'block',
      draggable: true,
      parseDOM: [
        {
          tag: "div[data-type='illustration']",
          getAttrs: (dom) => ({
            url: dom.getAttribute('data-url'),
            caption: dom.getAttribute('data-caption'),
          }),
        },
      ],
      toDOM: (node) => [
        'div',
        { 'data-type': 'illustration', 'data-url': node.attrs.url },
        [
          'img',
          { src: node.attrs.url, alt: 'Illustration' },
        ],
        ['p', { class: 'caption' }, node.attrs.caption || ''],
      ],
    },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'],
    },
  },
  marks: {
    bold: {
      parseDOM: [{ tag: 'strong' }, { tag: 'b', getAttrs: (node) => node.style.fontWeight != 'normal' && null }],
      toDOM: () => ['strong', 0],
    },
    italic: {
      parseDOM: [{ tag: 'em' }, { tag: 'i', getAttrs: (node) => node.style.fontStyle != 'normal' && null }],
      toDOM: () => ['em', 0],
    },
    link: {
      attrs: {
        href: {},
        title: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs: (dom) => ({
            href: dom.getAttribute('href'),
            title: dom.getAttribute('title'),
          }),
        },
      ],
      toDOM: (node) => ['a', { href: node.attrs.href, title: node.attrs.title }, 0],
    },
  },
});

    it('should handle cancel',()=>{
        expect(infoCommand.cancel()).toBeNull();
    });
    it('should handle getFragm',()=>{
        jest.spyOn(infoCommand,'getDocContent').mockReturnValue([]);
        expect(infoCommand.getFragm({editorView:{state:{doc:{content:{}},schema:mockSchema}}})).toBeDefined();
    });
    it('should handle renderLabel',()=>{
        expect(infoCommand.renderLabel()).toBeUndefined();
    });
    it('should handle isActive and return true',()=>{
        expect(infoCommand.isActive()).toBeFalsy();
    });
    it('should handle isActive and return tr',()=>{
        expect(infoCommand.executeCustom({state:{schema:null}} as unknown as EditorState,{} as unknown as Transform)).toStrictEqual({});
    });
});