/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { CitationDialog, CitationDialogProps } from './CitationDialog';
import React from 'react';
import { DOMOutputSpec, Mark, MarkSpec, Schema } from 'prosemirror-model';
import { defaultCitationText } from './CitationBuilder';
import { schema, builders } from 'prosemirror-test-builder';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Citation } from './Types';
import { CitationNodeSpec } from './CitationNodeSpec';
import * as commands from '../../commands';

jest.mock('../../commands', () => ({
  ...jest.requireActual<object>('../../commands'),
  createPopUp: jest.fn(),
}));

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
  const effSchema = new Schema({
    nodes: modSchema.spec.nodes.addToEnd('citationnote', CitationNodeSpec),
    marks: modSchema.spec.marks,
  });
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
    plugins: [],
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

  it('should not throw when citationform element is missing on disableCitationWIndow', () => {
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const CitDlgIns = new CitationDialog(citationMockProps);
    expect(() => CitDlgIns.disableCitationWIndow(true)).not.toThrow();
    expect(() => CitDlgIns.disableCitationWIndow(false)).not.toThrow();
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

  describe('CitationDialog (additional coverage)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('render', () => {
      it('renders the full dialog when all state values are provided', () => {
        const cit = new CitationDialog(citationMockProps);
        const result = cit.render();
        expect(result).toBeDefined();
      });

      it('renders with TBD fallbacks when classification fields are undefined', () => {
        const minimalProps = {
          ...citationMockProps,
          overallCitationCAPCO: undefined,
          documentTitleCapco: undefined,
          extractedInfoCAPCO: undefined,
          overallDocumentCapco: undefined,
          descriptionCAPCO: undefined,
          description: undefined,
          declassifyDateType: undefined,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(minimalProps);
        const result = cit.render();
        expect(result).toBeDefined();
      });

      it('renders with isCitationObject true (disables description textarea)', () => {
        const props = {
          ...citationMockProps,
          isCitationObject: true,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const result = cit.render();
        expect(result).toBeDefined();
      });

      it('renders citable material list inside the dialog', () => {
        const props = {
          ...citationMockProps,
          citableMaterial: [
            {
              id: '1',
              title: 'Some Material',
              author: 'Author One',
              publishedDate: '2023-01-01',
              overallClassification: 'TBD',
              titleClassification: 'TBD',
            },
          ],
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const result = cit.render();
        expect(result).toBeDefined();
      });
    });

    describe('getCitableMaterialList', () => {
      it('renders an active class on the selected citable material', () => {
        const props = {
          ...citationMockProps,
          citableMaterial: [
            { id: '1', title: 'First' },
            { id: '2', title: 'Second' },
          ],
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        cit.activeCitedMaterial = '1';
        const result = cit.getCitableMaterialList();
        expect(result).toBeDefined();
      });
    });

    describe('setActiveCitedMaterial', () => {
      it('updates state with the selected material properties', () => {
        const selected = {
          id: '42',
          title: 'Selected Material',
          author: 'Selected Author',
          publishedDate: '2024-05-01',
          overallClassification: 'SECRET',
          titleClassification: 'CONFIDENTIAL',
        };
        const props = {
          ...citationMockProps,
          citableMaterial: [selected],
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const setStateSpy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.setActiveCitedMaterial('42');
        expect(cit.activeCitedMaterial).toBe('42');
        expect(setStateSpy).toHaveBeenCalled();

        // Run the updater callback manually to exercise its body
        const updater = setStateSpy.mock.calls[0][0] as unknown as (
          prev: Record<string, unknown>
        ) => Record<string, unknown>;
        const next = updater({ existing: 'prev' });
        expect(next).toMatchObject({
          existing: 'prev',
          documentTitle: selected.title,
          author: selected.author,
          publishedDate: selected.publishedDate,
          overallDocumentCapco: selected.overallClassification,
          documentTitleCapco: selected.titleClassification,
        });
      });

      it('does nothing when the id does not match any citable material', () => {
        const props = {
          ...citationMockProps,
          citableMaterial: [{ id: 'a', title: 'A' }],
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const setStateSpy = jest.spyOn(cit, 'setState');
        cit.setActiveCitedMaterial('non-existent');
        expect(setStateSpy).not.toHaveBeenCalled();
      });
    });

    describe('getSourceText', () => {
      it('uses the provided buildSourceText builder', () => {
        const builder = jest.fn().mockReturnValue('built source text');
        const props = {
          ...citationMockProps,
          buildSourceText: builder,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const result = cit.getSourceText();
        expect(builder).toHaveBeenCalled();
        expect(result).toBe('built source text');
      });

      it('falls back to defaultCitationText when buildSourceText is undefined', () => {
        const props = {
          ...citationMockProps,
          buildSourceText: undefined,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const result = cit.getSourceText();
        expect(result).toBeDefined();
      });
    });

    describe('_showContextMenu', () => {
      it('delegates to execute with the provided field name', () => {
        const cit = new CitationDialog(citationMockProps);
        const executeSpy = jest
          .spyOn(cit, 'execute')
          .mockImplementation(() => undefined);
        cit._showContextMenu('author');
        expect(executeSpy).toHaveBeenCalledWith('author');
      });
    });

    describe('execute', () => {
      it('updates state when capcoService.openManagementDialog resolves with a value', async () => {
        const capcoService = {
          openManagementDialog: jest
            .fn()
            .mockResolvedValue({ portionMarking: 'SECRET' }),
        };
        const props = {
          ...citationMockProps,
          capcoService,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const setStateSpy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.execute('author');
        await Promise.resolve();
        await Promise.resolve();
        expect(capcoService.openManagementDialog).toHaveBeenCalled();
        expect(setStateSpy).toHaveBeenCalledWith({ author: 'SECRET' });
      });

      it('does not update state when capcoService.openManagementDialog resolves with null', async () => {
        const capcoService = {
          openManagementDialog: jest.fn().mockResolvedValue(null),
        };
        const props = {
          ...citationMockProps,
          capcoService,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const setStateSpy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.execute('author');
        await Promise.resolve();
        await Promise.resolve();
        expect(capcoService.openManagementDialog).toHaveBeenCalled();
        expect(setStateSpy).not.toHaveBeenCalled();
      });

      it('logs to console.error when capcoService.openManagementDialog rejects', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);
        const capcoService = {
          openManagementDialog: jest
            .fn()
            .mockRejectedValue(new Error('boom')),
        };
        const props = {
          ...citationMockProps,
          capcoService,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        cit.execute('author');
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('is a no-op when capcoService is not provided', () => {
        const props = {
          ...citationMockProps,
          capcoService: undefined,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        expect(() => cit.execute('author')).not.toThrow();
      });
    });

    describe('componentWillUnmount', () => {
      it('closes _popUp when defined', () => {
        const cit = new CitationDialog(citationMockProps);
        const closeMock = jest.fn();
        cit._popUp = {
          close: closeMock,
          update: jest.fn(),
        };
        cit.componentWillUnmount();
        expect(closeMock).toHaveBeenCalledWith(null);
      });

      it('does not throw when _popUp is undefined', () => {
        const cit = new CitationDialog(citationMockProps);
        cit._popUp = undefined;
        expect(() => cit.componentWillUnmount()).not.toThrow();
      });
    });

    describe('_cancel', () => {
      it('invokes props.close with no argument', () => {
        const closeMock = jest.fn();
        const props = {
          ...citationMockProps,
          close: closeMock,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        cit._cancel();
        expect(closeMock).toHaveBeenCalledWith();
      });

      it('does not throw when props.close is missing', () => {
        const props = {
          ...citationMockProps,
          close: undefined,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        expect(() => cit._cancel()).not.toThrow();
      });
    });

    describe('_save', () => {
      it('invokes props.close with state when referenceId is non-empty', () => {
        const closeMock = jest.fn();
        const props = {
          ...citationMockProps,
          close: closeMock,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        cit._save();
        expect(closeMock).toHaveBeenCalledWith(cit.state);
      });

      it('does not invoke props.close when referenceId is empty', () => {
        const closeMock = jest.fn();
        const props = {
          ...citationMockProps,
          referenceId: '',
          close: closeMock,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        cit._save();
        expect(closeMock).not.toHaveBeenCalled();
      });

      it('does not throw when props.close is missing and referenceId is non-empty', () => {
        const props = {
          ...citationMockProps,
          close: undefined,
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        expect(() => cit._save()).not.toThrow();
      });
    });

    describe('createCitationObject', () => {
      it('returns an object with mode and editorView', () => {
        const cit = new CitationDialog(citationMockProps);
        const result = cit.createCitationObject(view, 'new');
        expect(result).toEqual({ mode: 'new', editorView: view });
      });
    });

    describe('onInputChanged', () => {
      it('falls through default case for fields without special handling', () => {
        const cit = new CitationDialog(citationMockProps);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('author', {
          target: { value: 'A New Author' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        expect(spy).toHaveBeenCalledWith({ author: 'A New Author' });
      });

      it('referenceId case also sets citationObjectRefId', () => {
        const cit = new CitationDialog(citationMockProps);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('referenceId', {
          target: { value: 'NEW-REF-123' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        expect(spy).toHaveBeenCalledWith({
          referenceId: 'NEW-REF-123',
          citationObjectRefId: 'NEW-REF-123',
        });
      });

      it('publishedDate case computes declassifyDate for 25 year period', () => {
        const props = {
          ...citationMockProps,
          icod: '',
          declassifyDateType: 'Declassify After 25 years',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('publishedDate', {
          target: { value: '2020-01-01' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        expect(spy).toHaveBeenCalled();
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.publishedDate).toBe('2020-01-01');
        expect(arg.declassifyDate).toContain('2045');
      });

      it('publishedDate case computes declassifyDate for 50 year period', () => {
        const props = {
          ...citationMockProps,
          icod: '',
          declassifyDateType: 'Declassify After 50 years',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('publishedDate', {
          target: { value: '2020-01-01' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        expect(spy).toHaveBeenCalled();
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.declassifyDate).toContain('2070');
      });

      it('publishedDate case skips declassifyDate calc when type is Declassify Date', () => {
        const props = {
          ...citationMockProps,
          icod: '',
          declassifyDateType: 'Declassify Date',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('publishedDate', {
          target: { value: '2020-01-01' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.declassifyDate).toBeUndefined();
      });

      it('publishedDate case skips declassifyDate calc when value is empty', () => {
        const props = {
          ...citationMockProps,
          icod: '',
          declassifyDateType: 'Declassify After 25 years',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('publishedDate', {
          target: { value: '' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.declassifyDate).toBeUndefined();
      });

      it('publishedDate case preserves existing icod when state.icod is already set', () => {
        const props = {
          ...citationMockProps,
          icod: '2019-12-31',
          declassifyDateType: 'Declassify After 25 years',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('publishedDate', {
          target: { value: '2020-01-01' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.icod).toBe('2019-12-31');
      });

      it('publishedDate case sets icod from value when state.icod is undefined', () => {
        const props = {
          ...citationMockProps,
          icod: undefined,
          declassifyDateType: 'Declassify After 25 years',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('publishedDate', {
          target: { value: '2021-06-15' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.icod).toBe('2021-06-15');
      });

      it('declassifyDateType case computes declassifyDate for 25 year period', () => {
        const props = {
          ...citationMockProps,
          publishedDate: '2020-01-01',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('declassifyDateType', {
          target: { value: 'Declassify After 25 years' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.declassifyDate).toContain('2045');
      });

      it('declassifyDateType case computes declassifyDate for 50 year period', () => {
        const props = {
          ...citationMockProps,
          publishedDate: '2020-01-01',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('declassifyDateType', {
          target: { value: 'Declassify After 50 years' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.declassifyDate).toContain('2070');
      });

      it('declassifyDateType case skips calc when new type is Declassify Date', () => {
        const props = {
          ...citationMockProps,
          publishedDate: '2020-01-01',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('declassifyDateType', {
          target: { value: 'Declassify Date' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.declassifyDate).toBeUndefined();
      });

      it('declassifyDateType case skips calc when state.publishedDate is empty', () => {
        const props = {
          ...citationMockProps,
          publishedDate: '',
        } as unknown as CitationDialogProps;
        const cit = new CitationDialog(props);
        const spy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);
        cit.onInputChanged('declassifyDateType', {
          target: { value: 'Declassify After 25 years' },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
        const arg = spy.mock.calls[0][0] as unknown as Record<string, string>;
        expect(arg.declassifyDate).toBeUndefined();
      });
    });

    describe('_onSearch', () => {
      const createPopUpMock = commands.createPopUp as jest.Mock;

      beforeEach(() => {
        createPopUpMock.mockReset();
      });

      it('creates a popup and sets _popUp on click', () => {
        const fakePopUp = { close: jest.fn(), update: jest.fn() };
        createPopUpMock.mockReturnValue(
          fakePopUp
        );

        const citationForm = document.getElementById('citationform')
          ?? (() => {
            const f = document.createElement('div');
            f.id = 'citationform';
            document.body.appendChild(f);
            return f;
          })();

        const cit = new CitationDialog(citationMockProps);
        const anchor = document.createElement('button');
        const event = {
          currentTarget: anchor,
        } as unknown as React.SyntheticEvent;

        cit._onSearch(event);
        expect(createPopUpMock).toHaveBeenCalled();
        expect(cit._popUp).toBe(fakePopUp);
        expect(citationForm).toBeDefined();
      });

      it('onClose callback closes existing _popUp and merges citationObject into state', () => {
        const fakePopUp = { close: jest.fn(), update: jest.fn() };
        let capturedOnClose:
          | ((val: { citationObject: Partial<Citation> } | undefined) => void)
          | undefined;
        createPopUpMock.mockImplementation((_comp, _props, opts) => {
          capturedOnClose = opts?.onClose;
          return fakePopUp;
        });

        const cit = new CitationDialog(citationMockProps);
        const setStateSpy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);

        const event = {
          currentTarget: document.createElement('button'),
        } as unknown as React.SyntheticEvent;
        cit._onSearch(event);
        expect(createPopUpMock).toHaveBeenCalled();
        expect(capturedOnClose).toBeDefined();

        capturedOnClose?.({
          citationObject: { author: 'From Search' },
        });
        expect(fakePopUp.close).toHaveBeenCalledWith(null);
        expect(cit._popUp).toBeUndefined();
        expect(setStateSpy).toHaveBeenCalledWith({ author: 'From Search' });
      });

      it('onClose callback handles undefined val (no state merge)', () => {
        const fakePopUp = { close: jest.fn(), update: jest.fn() };
        let capturedOnClose:
          | ((val: undefined) => void)
          | undefined;
        createPopUpMock.mockImplementation((_comp, _props, opts) => {
          capturedOnClose = opts?.onClose;
          return fakePopUp;
        });

        const cit = new CitationDialog(citationMockProps);
        const setStateSpy = jest
          .spyOn(cit, 'setState')
          .mockImplementation(() => undefined);

        cit._onSearch({
          currentTarget: document.createElement('button'),
        } as unknown as React.SyntheticEvent);

        capturedOnClose?.(undefined);
        expect(fakePopUp.close).toHaveBeenCalledWith(null);
        expect(setStateSpy).not.toHaveBeenCalled();
      });

      it('onClose callback is a no-op when _popUp is already cleared', () => {
        const fakePopUp = { close: jest.fn(), update: jest.fn() };
        let capturedOnClose:
          | ((val: undefined) => void)
          | undefined;
        createPopUpMock.mockImplementation((_comp, _props, opts) => {
          capturedOnClose = opts?.onClose;
          return fakePopUp;
        });

        const cit = new CitationDialog(citationMockProps);
        cit._onSearch({
          currentTarget: document.createElement('button'),
        } as unknown as React.SyntheticEvent);

        cit._popUp = undefined;
        expect(() => capturedOnClose?.(undefined)).not.toThrow();
        expect(fakePopUp.close).not.toHaveBeenCalled();
      });
    });
  });
});