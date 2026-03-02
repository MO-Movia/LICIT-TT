/* eslint-disable */

import {InfoIconNodeSpec} from './infoIconNodeSpec';


const node = {
  attrs: {
    from: 0,
    to: 9,
    description: 'Test description',
    // "{"name":"fa fa-adn","unicode":"&#xf170;","selected":false}"
    infoIcon: {
      'name'
        :
        "fa fa-adn",
      'selected': false,
      'unicode'
        :
        "&#xf170"
    }
  },
};

describe('InfoIconNodeSpec', () => {
  it('dom should have matching node attributes', () => {
    const outputspec = InfoIconNodeSpec.toDOM(node as any);
    const infoDom = [];
    const { from, to, description, infoIcon } = node.attrs;

    const attrs: any = {
      from,
      to,
      description, infoIcon
    };
    attrs.from = from;
    attrs.to = to;
    attrs.description = description;
    attrs.infoIcon = JSON.stringify(infoIcon);

    infoDom.push('infoicon');
    infoDom.push(attrs);
    infoDom.push(0);
    expect(outputspec).toEqual(infoDom);
  });
  it('parse dom attributes', () => {
    const dom = document.createElement('span');
    dom.setAttribute('from', '0' as any);
    dom.setAttribute('to', '9' as any);
    dom.setAttribute('description', node.attrs.description);
    dom.setAttribute('infoIcon', JSON.stringify(node.attrs.infoIcon));

    const { from, to, description, infoIcon } = node.attrs;

    const attsOutput: any = {
      from,
      to,
      description,
      infoIcon
    };
    const attrs: any = {
      from,
      to,
      description,
      infoIcon
    };
    attrs.from = dom.getAttribute('from');
    attrs.to = dom.getAttribute('to');
    attrs.description = dom.getAttribute('description');
    attrs.infoIcon = dom.getAttribute('infoIcon');

    attsOutput.from = dom.getAttribute('from');
    attsOutput.to = dom.getAttribute('to');
    attsOutput.description = dom.getAttribute('description');
    attsOutput.infoIcon = JSON.parse(JSON.stringify(node.attrs.infoIcon));

    const getAttrs = InfoIconNodeSpec.parseDOM[0].getAttrs(dom);
    expect(getAttrs).toEqual(attsOutput);
  });

  it('parse dom attributes with null', () => {
    const dom = document.createElement('span');
    const { from, to, description, infoIcon } = node.attrs;

    const attrs: any = {
      from,
      to,
      description,
      infoIcon
    };
    attrs.from = dom.getAttribute('from');
    attrs.to = dom.getAttribute('to');
    attrs.description = dom.getAttribute('description');
    attrs.infoIcon = dom.getAttribute('infoIcon');

    const getAttrs = InfoIconNodeSpec.parseDOM[0].getAttrs(dom);
    expect(getAttrs).toStrictEqual(attrs);
  });

});
