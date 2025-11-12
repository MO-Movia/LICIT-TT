import {GlossaryNodeSpec} from './glossaryNodeSpec';

const node = {
  attrs: {
    from: '0',
    to: '2',
    type: '1',
    term: 'term',
    id: '1',
    description: 'Test description',
  },
};
describe('GlossaryNodeSpec', () => {
  it('parse dom attributes', () => {
    const dom = document.createElement('span');
    dom.setAttribute('from', '0');
    dom.setAttribute('to', '2');
    dom.setAttribute('description', node.attrs.description);
    dom.setAttribute('type', '1');
    dom.setAttribute('term', 'term');
    dom.setAttribute('id', '1');

    const {from, to, description, id, term, type} = node.attrs;

    const attsOutput: Record<string, string | null> = {
      from,
      to,
      description,
      id,
      term,
      type,
      definition: null,
    };

    const attrs: Record<string, string | null> = {
      from,
      to,
      description,
      id,
      term,
      type,
      definition: null,
    };

    attrs.from = dom.getAttribute('from');
    attrs.to = dom.getAttribute('to');
    attrs.description = dom.getAttribute('description');
    attrs.id = dom.getAttribute('id');
    attrs.term = dom.getAttribute('term');
    attrs.type = dom.getAttribute('type');

    attsOutput.from = dom.getAttribute('from');
    attsOutput.to = dom.getAttribute('to');
    attsOutput.description = dom.getAttribute('description');
    attsOutput.id = dom.getAttribute('id');
    attsOutput.term = dom.getAttribute('term');
    attsOutput.type = dom.getAttribute('type');

    const getAttrs = GlossaryNodeSpec.parseDOM?.[0].getAttrs?.(dom);
    expect(getAttrs).toEqual(attsOutput);
  });

  it('parse dom attributes with null', () => {
    const dom = document.createElement('span');
    const {from, to, description, id, term, type} = node.attrs;

    const attrs: Record<string, string | null> = {
      from,
      to,
      description,
      id,
      term,
      type,
    };
    attrs.from = dom.getAttribute('from');
    attrs.to = dom.getAttribute('to');
    attrs.description = dom.getAttribute('description');
    attrs.id = dom.getAttribute('id');
    attrs.term = dom.getAttribute('term');
    attrs.type = dom.getAttribute('type');

    const getAttrs = GlossaryNodeSpec.parseDOM?.[0]?.getAttrs?.(dom);
    expect(getAttrs).toBeDefined();
  });
});
