/* eslint-disable */
import {SearchCitation, SearchCitationProps} from './SearchCitation';

const citation = {
  overallDocumentCapco: 'TBD',
  author: 'Jerry Rodgers',
  authorTitle: 'Author',
  referenceId: '8900098',
  publishedDate: '2022-07-22',
  publishedDateTitle: 'Published',
  icod: '2022-07-22',
  documentTitleCapco: 'TBD',
  documentTitle: 'Second document title',
  dateAccessed: '2022-07-21',
  hyperLink: 'www.google.com',
  citationObjectRefId: '',
  description: 'test description',
  descriptionCAPCO: 'N/A',
  extractedInfoCAPCO: 'TBD',
  overallCitationCAPCO: 'TBD',
  pageEnd: '25',
  pageStart: '15',
  pageTitle: '',
  sourceText:
    '(TBD) Jerry Rodgers 8900098 Date undefined 2021-07-22 ICOD Date 2022-07-22 (TBD) Second document title pp. 15-25 Extracted information is (TBD) Overall document classification is (TBD) Date Accessed 2022-07-21 www.google.com',
  mode: 0,
  editorView: undefined,
  isCitationObject: false,
};

const dom = document.createElement('div');
document.body.appendChild(dom);

const SearchProps = {
  citationObject: {},
  selectedRowRefID: '',
  citations: [],
  close: () => {
    return null;
  },
};

describe('Search Citation   ', () => {
  it('should render the component', () => {
    expect(new SearchCitation({...SearchProps}).render()).toBeDefined();
  });

  it('should call onSearch Citations ', () => {
    const SearchCitationIns = new SearchCitation(SearchProps);
    expect(SearchCitationIns.onSearchCitations()).toHaveBeenCalled;
  });
  it('should call onSearch Citations  (case 2)', () => {
    const dom = document.createElement('input');
    jest.spyOn(document, 'getElementById').mockReturnValue(dom);
    const SearchCitationIns = new SearchCitation(SearchProps);
    const spyfetchedCit = jest.spyOn(SearchCitationIns, 'fetchedCit');
    spyfetchedCit.mockReturnValue(Promise.resolve([citation, citation]));
    expect(SearchCitationIns.getCitations()).toBeUndefined();
    expect(SearchCitationIns.onSearchCitations()).toHaveBeenCalled;
  });
  it('should call onRowClick  ', () => {
    const SearchCitationIns = new SearchCitation(SearchProps);
    const spy = jest.spyOn(SearchCitationIns, 'setState');
    SearchCitationIns.onRowClick('8900098');
    expect(spy).toHaveBeenCalled();
  });
  it('should call onRowClick when selectedRowRefID == undefined', () => {
    const SearchCitationIns = new SearchCitation(SearchProps);
    const spy = jest.spyOn(SearchCitationIns, 'setState');
    SearchCitationIns.onRowClick(undefined as unknown as string);
    expect(spy).not.toHaveBeenCalled();
  });
  it('should call cancel  ', () => {
    const SearchCitationIns = new SearchCitation(SearchProps);
    expect(SearchCitationIns._cancel()).toHaveBeenCalled;
  });
  it('should call save  ', () => {
    const SearchCitationIns = new SearchCitation(SearchProps);
    expect(SearchCitationIns._save()).toHaveBeenCalled;
  });
  it('should callfetchedCit ', async () => {
    const SearchCitationIns = new SearchCitation(SearchProps);

    const spyfetchedCit = jest.spyOn(SearchCitationIns, 'fetchedCit');
    spyfetchedCit.mockReturnValue(Promise.resolve([citation, citation]));
    expect(SearchCitationIns.getCitations()).toBeUndefined();
  });
  it('should call fetchedCit when result is null ', async () => {
    const SearchCitationIns = new SearchCitation(SearchProps);
    const spyfetchedCit = jest.spyOn(SearchCitationIns, 'fetchedCit');
    spyfetchedCit.mockReturnValue(Promise.resolve(null));
    expect(SearchCitationIns.getCitations()).toBeUndefined();
  });
  it('should call fetchedCit when  publishedDateTitle: null ', async () => {
    const citation = {
      overallDocumentCapco: 'TBD',
      author: 'Jerry Rodgers',
      authorTitle: 'Author',
      referenceId: '8900098',
      publishedDate: '2022-07-22',
      publishedDateTitle: null,
      icod: '2022-07-22',
      documentTitleCapco: 'TBD',
      documentTitle: 'Second document title',
      dateAccessed: '2022-07-21',
      hyperLink: 'www.google.com',

      citationObjectRefId: '',
      description: 'test description',
      descriptionCAPCO: 'N/A',
      extractedInfoCAPCO: 'TBD',
      overallCitationCAPCO: 'TBD',
      pageEnd: '25',
      pageStart: '15',
      pageTitle: '',

      sourceText:
        '(TBD) Jerry Rodgers 8900098 Date undefined 2021-07-22 ICOD Date 2022-07-22 (TBD) Second document title pp. 15-25 Extracted information is (TBD) Overall document classification is (TBD) Date Accessed 2022-07-21 www.google.com',
      mode: 0,
      editorView: undefined,
      isCitationObject: false,
    };
    const SearchCitationIns = new SearchCitation(SearchProps);
    const spyfetchedCit = jest.spyOn(SearchCitationIns, 'fetchedCit');
    spyfetchedCit.mockReturnValue(Promise.resolve([citation, citation]));
    expect(SearchCitationIns.getCitations()).toBeUndefined();
  });

  it('should handle filteredCitations', () => {
    const SearchProps = {
      citationObject: {},
      selectedRowRefID: '',
      citations: [undefined],
      close: () => {
        return null;
      },
    } as unknown as SearchCitationProps;
    const searchcitation = new SearchCitation(SearchProps);
    expect(searchcitation.onSearchCitations()).toBeUndefined();
  });
});

describe('Search Citation - Get Custom Capco    ', () => {
  it('should not filter citations when there are no filter criteria', () => {
    const searchCitation = new SearchCitation(SearchProps);
    searchCitation.setState({citations: [citation, citation]});
    searchCitation.onSearchCitations();

    expect(searchCitation.state.citations.length).toBe(2);
  });
});
