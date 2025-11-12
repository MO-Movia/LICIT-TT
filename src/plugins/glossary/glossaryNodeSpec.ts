import type {Attrs, DOMOutputSpec, Node, NodeSpec} from 'prosemirror-model';
import {GLOSSARY} from './types';

export const GlossaryNodeSpec: NodeSpec = {
  atom: true,
  group: 'inline',
  content: 'text*',
  inline: true,
  isolating: true,
  selectable: true,
  // added new attributes to this spec.
  attrs: {
    from: {default: null},
    to: {default: null},
    type: {default: 1},
    term: {default: null},
    description: {default: null},
    definition: {default: null},
    id: {default: null},
  },
  toDOM,
  parseDOM: [
    {
      tag: GLOSSARY,
      getAttrs,
    },
  ],
};

function getAttrs(dom: HTMLElement): Attrs {
  const from = dom.getAttribute('from');
  const to = dom.getAttribute('to');
  const type = dom.getAttribute('type');

  const description = dom.getAttribute('description');
  const definition = dom.getAttribute('definition');
  const term = dom.getAttribute('term');
  const id = dom.getAttribute('id');

  return {
    from,
    to,
    type,
    description,
    definition,
    term,
    id,
  };
}

function toDOM(node: Node): DOMOutputSpec {
  const {from, to, type, description, definition, term, id} = node.attrs;
  const attrs = {
    from,
    to,
    type,
    description,
    definition,
    term,
    id,
  } as Record<string, unknown>;
  return [GLOSSARY, attrs, 0];
}
