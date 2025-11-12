import { Attrs, AttributeSpec, DOMOutputSpec, Node, NodeSpec } from 'prosemirror-model';
import { citationFields } from './Types';

const defaultAttrs: {[attr: string]: AttributeSpec} = {};
citationFields.forEach(field => defaultAttrs[field] = { default: null });
export const CitationNodeSpec: NodeSpec = {
  group: 'inline',
  content: 'text*',
  inline: true,
  selectable: false,
  attrs: defaultAttrs,
  toDOM,
  parseDOM: [
    {
      tag: 'citationnote',
      getAttrs,
    },
  ],
};

export function getAttrs(dom: HTMLElement | string): Attrs | false {
  if (typeof dom === 'string') {
    return false;
  }
  const attrs = {} as {[attr: string]: string | null};
  citationFields.forEach(field => attrs[field] = dom.getAttribute(field) ?? null);
  return attrs;
}

function toDOM(node: Node): DOMOutputSpec {
  const attrs = {
    ...node.attrs
  };
  return ['citationnote', attrs, 0];
}
