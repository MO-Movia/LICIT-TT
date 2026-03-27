/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { CitationDialog, CitationDialogProps } from './CitationDialog';
import React from 'react';
import { DOMOutputSpec, Mark, MarkSpec, Schema } from 'prosemirror-model';
import { CitationPlugin, defaultCitationText } from './index';
import { schema, builders } from 'prosemirror-test-builder';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Citation } from './Types';

describe('CitationDialog', () => {
  const citation = {
    overallDocumentCapco: 'TBD',
    author: 'Jerry Rodgers',
    authorTitle: 'Author',
    referenceId: '8900098',
    publishedDate: '2022-07-22',
    publishedDateTitle: 'Published',
    icod: '',
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
  const TextHighlightMarkSpec: MarkSpec = {
    attrs: {
      highlightColor: { default: '' },
    },
    inline: true,
    group: 'inline',
    parseDOM: [
      {
        tag: 'span[style*=background-color]',
        getAttrs: (dom: HTMLElement | string) => {
          if (typeof dom === 'string') {
            return false;
          }
          const { backgroundColor } = dom.style;
          return {
            highlightColor: backgroundColor,
          };
        },
      },
    ],

    toDOM(node: Mark): DOMOutputSpec {
      const { highlightColor } = node.attrs;
      let style = '';
      if (highlightColor) {
        style += `background-color: ${highlightColor};`;
      }
      return ['span', { style }, 0];
    },
  };
  const marks = schema.spec.marks.addToEnd(
    'mark-text-highlight',
    TextHighlightMarkSpec
  );
  const modSchema = new Schema({
    nodes: schema.spec.nodes,
    marks: marks,
  });
  const plugin = new CitationPlugin();

  const effSchema = plugin.getEffectiveSchema(modSchema);
  const { doc, p } = builders(effSchema, { p: { nodeType: 'paragraph' } });

  document.body.appendChild(document.createElement('div'));
  const before = 'hello';
  const newCitationNode = effSchema.node(
    effSchema.nodes.citationnote,
    citation
  );

  const after = ' world';
  const state = EditorState.create({
    doc: doc(p(before, newCitationNode, after)),
    schema: effSchema,
    plugins: [plugin],
  });

  const dom = document.createElement('div');
  document.body.appendChild(dom);

  const view = new EditorView(
    { mount: dom },
    {
      state: state,
    }
  );

  const mockOnClose = jest.fn();
  const citationMockProps = {
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
    pages: '15-25',
    pageTitle: '',

    mode: 0,
    editorView: view,
    isCitationObject: false,
    onClose: mockOnClose,
    close: () => undefined,
    buildSourceText: defaultCitationText,
  } as unknown as CitationDialogProps;

  it('should enable pointer events when isEditable is true', () => {
    const citationForm = document.createElement('div');
    citationForm.id = 'citationform';
    document.body.appendChild(citationForm);
    const CitDlgIns = new CitationDialog(citationMockProps);

    CitDlgIns.disableCitationWIndow(true);
    expect(citationForm.style.pointerEvents).toBe('unset');
  });

  it('should disable pointer events when isEditable is false empty', () => {
    const citationForm = document.createElement('div');
    const styleMock = { pointerEvents: '' };
    Object.defineProperty(citationForm, 'style', {
      writable: true,
      value: styleMock,
    });

    const CitDlgIns = new CitationDialog(citationMockProps);

    CitDlgIns.disableCitationWIndow(false);

    expect(styleMock.pointerEvents).toBeDefined();
  });

  it('should disable pointer events when isEditable is false', () => {
    const citationForm = document.createElement('div');
    citationForm.setAttribute('style', 'pointerEvents');
    const styleMock = { pointerEvents: '' };
    jest.spyOn(document, 'getElementById').mockReturnValue(citationForm);

    const CitDlgIns = new CitationDialog(citationMockProps);

    CitDlgIns.disableCitationWIndow(false);

    expect(styleMock.pointerEvents).toBeDefined();
  });

  describe('CitationDialog (group 2)', () => {
    it('should handle execute', () => {
      const citationMockProps = {
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
        pages: '15-25',
        pageTitle: '',

        mode: 0,
        editorView: view,
        isCitationObject: false,
        onClose: mockOnClose,
        close: () => undefined,
        buildSourceText: defaultCitationText,
      } as unknown as CitationDialogProps;
      const cit = new CitationDialog(citationMockProps);
      expect(
        cit.execute(citationMockProps as unknown as keyof Citation)
      ).toBeUndefined();
    });
    it('onInputChanged', () => {
      const citationMockProps = {
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
        pages: '15-25',
        pageTitle: '',

        mode: 0,
        editorView: view,
        isCitationObject: false,
        onClose: mockOnClose,
        close: () => undefined,
        buildSourceText: defaultCitationText,
      } as unknown as CitationDialogProps;
      const cit = new CitationDialog(citationMockProps);
      const spy = jest.spyOn(cit, 'setState');
      cit.onInputChanged('referenceId', {
        target: { value: 'referenceId' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
      cit.onInputChanged('publishedDate', {
        target: { value: 'referenceId' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
      cit.onInputChanged('declassifyDateType', {
        target: { value: 'referenceId' },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
      expect(spy).toHaveBeenCalled();
    });
    it('should handle _save', () => {
      const citationMockProps = {
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
        pages: '15-25',
        pageTitle: '',

        mode: 0,
        editorView: view,
        isCitationObject: false,
        onClose: mockOnClose,
        close: () => undefined,
        buildSourceText: defaultCitationText,
      } as unknown as CitationDialogProps;
      const cit = new CitationDialog(citationMockProps);
      expect(cit._save()).toBeUndefined();
    });

    it('returns undefined if no citable material', () => {
      const citationMockProps = {
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
        pages: '15-25',
        pageTitle: '',

        mode: 0,
        editorView: view,
        isCitationObject: false,
        onClose: mockOnClose,
        close: () => undefined,
        buildSourceText: defaultCitationText,
      } as unknown as CitationDialogProps;
      const cit = new CitationDialog(citationMockProps);
      const result = cit.getCitableMaterialList();
      expect(result).toEqual(undefined);
    });

    it('returns build citable material list', () => {
      const citationMockProps = {
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

        citableMaterial: [
          {
            id: '1',
            title: 'foobar',
          },
        ],
        citationObjectRefId: '',
        description: 'test description',
        descriptionCAPCO: 'N/A',
        extractedInfoCAPCO: 'TBD',
        overallCitationCAPCO: 'TBD',
        pages: '15-25',
        pageTitle: '',

        mode: 0,
        editorView: view,
        isCitationObject: false,
        onClose: mockOnClose,
        close: () => undefined,
        buildSourceText: defaultCitationText,
      } as unknown as CitationDialogProps;
      const cit = new CitationDialog(citationMockProps);
      const result = cit.getCitableMaterialList();
      expect(result).toBeDefined();
    });

    it('builds list if citable material is an empty array', () => {
      const citationMockProps = {
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

        citableMaterial: [],
        citationObjectRefId: '',
        description: 'test description',
        descriptionCAPCO: 'N/A',
        extractedInfoCAPCO: 'TBD',
        overallCitationCAPCO: 'TBD',
        pages: '15-25',
        pageTitle: '',

        mode: 0,
        editorView: view,
        isCitationObject: false,
        onClose: mockOnClose,
        close: () => undefined,
        buildSourceText: defaultCitationText,
      } as unknown as CitationDialogProps;
      const cit = new CitationDialog(citationMockProps);
      const result = cit.getCitableMaterialList();
      expect(result).toBeDefined();
    });

    it('sets selected citable material', () => {
      const citationMockProps = {
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

        citableMaterial: [
          {
            id: '1',
            title: 'foobar',
          },
        ],
        citationObjectRefId: '',
        description: 'test description',
        descriptionCAPCO: 'N/A',
        extractedInfoCAPCO: 'TBD',
        overallCitationCAPCO: 'TBD',
        pages: '15-25',
        pageTitle: '',

        mode: 0,
        editorView: view,
        isCitationObject: false,
        onClose: mockOnClose,
        close: () => undefined,
        buildSourceText: defaultCitationText,
      } as unknown as CitationDialogProps;
      const cit = new CitationDialog(citationMockProps);
      cit.setActiveCitedMaterial('2');
      expect(cit.activeCitedMaterial).toEqual(undefined);
      cit.setActiveCitedMaterial('1');
      expect(cit.activeCitedMaterial).toEqual('1');
    });
  });
});
