import { CitationNodeSpec, getAttrs } from './CitationNodeSpec';
import { Node } from '@tiptap/pm/model';

const node: Node = {
  attrs: {
    documentTitle: 'Title',
    referenceType: 'MockType',
    referenceId: 'REF-1001',
    author: 'Jerry Rodgers',
    publishedDate: '2022-07-22',
    declassifyDate: '2022-07-22',
    declassifyDateType: 'MockType',
    documentTitleCapco: 'U',
    hyperLink: 'www.google.com',
    dateAccessed: '2022-07-25',
    overallCitationCAPCO: 'C',
    extractedInfoCAPCO: 'S',
    descriptionCAPCO: 'FOUO',
    description: 'fs-tesdt',
    citationObjectRefId: 'REF-1001',
    pageTitle: 'MockType',
    pages: '1-7',
    publishedDateTitle: 'Published',
    icod: '2022-07-22',
    overallDocumentCapco: 'TS',
    authorTitle: 'Author',
    from: '0',
    isCitationObject: 'false',
    to: '9',
  },
} as unknown as Node; // ignore missing elements

describe('CitationNodeSpec', () => {
  it('dom should have matching node attributes', () => {
    expect(CitationNodeSpec.toDOM).toBeTruthy();
    if (!CitationNodeSpec.toDOM) {
      return; // failed
    }
    const outputspec = CitationNodeSpec.toDOM(node);
    const citationDom: (object | string | number)[] = [];

    const attrs = {
      ...node.attrs,
    };

    citationDom.push('citationnote');
    citationDom.push(attrs);
    citationDom.push(0);
    expect(outputspec).toStrictEqual(citationDom);
  });

  it('parse dom attributes', () => {
    expect(CitationNodeSpec.parseDOM?.length).toBeTruthy();
    if (
      !CitationNodeSpec.parseDOM?.length ||
      !CitationNodeSpec.parseDOM[0].getAttrs
    ) {
      return; //failed
    }
    const dom = document.createElement('span');
    dom.setAttribute('from', '0');
    dom.setAttribute('to', '9');
    for (const head in node.attrs) {
      dom.setAttribute(head, node.attrs[head]);
    }

    const attrs = {
      ...node.attrs,
    };

    const getAttrs = CitationNodeSpec.parseDOM[0].getAttrs(dom);
    expect(getAttrs).toStrictEqual(attrs);
  });

  it('should return false if the input is a string', () => {
    const inputString = 'SomeString';
    const result = getAttrs(inputString);
    expect(result).toBe(false);
  });
});
