/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {CitationRuntime} from './CitationRuntime';
import * as http from './http';

describe('CitationRuntime', () => {
  let citationRuntime: CitationRuntime;
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
    description: 'it description',
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

  beforeEach(() => {
    citationRuntime = new CitationRuntime('http://greathints.com:3003');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('buildRouteForCitation returns the correct URL', () => {
    const pathSegments = ['path1', 'path2'];
    const result = citationRuntime.buildRouteForCitation(...pathSegments);
    expect(result).toBe('http://greathints.com:3003/path1/path2');
  });

  it('saveCitation calls POST with the correct URL and citation', async () => {
    const mockPOST = jest.spyOn(http, 'POST').mockResolvedValueOnce(undefined);
    const mockFetchCitations = jest
      .spyOn(citationRuntime, 'fetchCitations')
      .mockResolvedValueOnce([]);
    await citationRuntime.saveCitation(citation);
    expect(mockPOST).toHaveBeenCalledWith(
      'http://greathints.com:3003/citations',
      JSON.stringify(citation),
      'application/json; charset=utf-8'
    );
    expect(mockFetchCitations).toHaveBeenCalled();
  });

  it('fetchCitations calls GET with the correct URL and updates the citations', async () => {
    const mockCitations = ['citation1', 'citation2'];
    const mockGET = jest
      .spyOn(http, 'GET')
      .mockResolvedValueOnce(JSON.stringify(mockCitations));
    const result = await citationRuntime.fetchCitations();
    expect(mockGET).toHaveBeenCalledWith(
      'http://greathints.com:3003/citations'
    );
    expect(result).toEqual(mockCitations);
    expect(citationRuntime.citations).toEqual(mockCitations);
  });

  it('fetchCitationsByRefId calls GET with the correct URL and updates citationByRefId', async () => {
    const referenceId = 'refId';
    const mockCitation = {
      /* citation object */
    };
    const mockGET = jest
      .spyOn(http, 'GET')
      .mockResolvedValueOnce(JSON.stringify(mockCitation));
    const result = await citationRuntime.fetchCitationsByRefId(referenceId);
    expect(mockGET).toHaveBeenCalledWith(
      'http://greathints.com:3003/citations/refId'
    );
    expect(result).toEqual(mockCitation);
    expect(citationRuntime.citationByRefId).toEqual(mockCitation);
  });

  it('getCitationsAsync fetches citations if the array is empty', async () => {
    citationRuntime.citations = [];

    jest
      .spyOn(citationRuntime, 'fetchCitations')
      .mockResolvedValueOnce([citation]);

    const result = await citationRuntime.getCitationsAsync();

    expect(result).toStrictEqual([]);
  });

  it('getCitationsAsync returns citations directly if the array is not empty', async () => {
    citationRuntime.citations = [citation, citation];

    const result = await citationRuntime.getCitationsAsync();

    expect(result).toEqual([citation, citation]);
  });

  it('removeCitation calls DELETE with the correct URL and citation', async () => {
    const referenceId = 'refId';
    const mockDELETE = jest
      .spyOn(http, 'DELETE')
      .mockResolvedValueOnce(undefined);
    const mockFetchCitations = jest
      .spyOn(citationRuntime, 'fetchCitations')
      .mockResolvedValueOnce([]);

    await citationRuntime.removeCitation(referenceId);

    expect(mockDELETE).toHaveBeenCalledWith(
      'http://greathints.com:3003/citations/refId',
      'text/plain'
    );
    expect(mockFetchCitations).toHaveBeenCalled();
  });

  it('should handle isArrEmpty', () => {
    citationRuntime.citations = null;
    expect(citationRuntime.isArrEmpty()).toBeTruthy();
  });

  it('fetchCitations handles errors and returns null on failure', async () => {
    const mockGET = jest.spyOn(http, 'GET').mockRejectedValueOnce(new Error('Failed to fetch data'));

    const result = await citationRuntime.fetchCitations();

    expect(mockGET).toHaveBeenCalledWith('http://greathints.com:3003/citations');
    expect(result).toBeNull();
    expect(citationRuntime.citations).toEqual([]);
  });

  it('saveCitation returns null when citationServerURI is falsy', async () => {
    citationRuntime = new CitationRuntime();

    const result = await citationRuntime.saveCitation(citation);

    expect(result).toBeNull();
  });

  it('fetchCitations returns null when citationServerURI is falsy', async () => {
    citationRuntime = new CitationRuntime();

    const result = await citationRuntime.fetchCitations();

    expect(result).toBeNull();
    expect(citationRuntime.citations).toEqual([]);
  });

  it('fetchCitationsByRefId returns null when citationServerURI is falsy', async () => {
    citationRuntime = new CitationRuntime();

    const result = await citationRuntime.fetchCitationsByRefId('refId');

    expect(result).toBeNull();
    expect(citationRuntime.citationByRefId).toBeUndefined();
  });

  it('getCitationsAsync returns empty array when citationServerURI is falsy', async () => {
    citationRuntime = new CitationRuntime();

    const result = await citationRuntime.getCitationsAsync();

    expect(result).toEqual([]);
  });

  it('removeCitation returns null when citationServerURI is falsy', async () => {
    citationRuntime = new CitationRuntime();
    const result = await citationRuntime.removeCitation('refId');

    expect(result).toBeNull();
  });
});
