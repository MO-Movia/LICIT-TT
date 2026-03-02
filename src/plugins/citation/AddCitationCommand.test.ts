/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState, NodeSelection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Transform } from 'prosemirror-transform';
import {
  AddCitationCommand,
  ShowTexteHighLightMark,
} from './AddCitationCommand';
import { PopUpHandle } from '@modusoperandi/licit-ui-commands';
import { Node, ResolvedPos, Schema } from 'prosemirror-model';
import { AddCitationCommandOptions } from './Types';

type CitationProps = {
  documentTitle: string;
  referenceId: string;
  author: string;
  publishedDate: string;
  documentTitleCapco: string;
  hyperLink: string;
  dateAccessed: string;
  overallCitationCAPCO: string;
  pageTitle: string;
  extractedInfoCAPCO: string;
  descriptionCAPCO: string;
  description: string;
  citationObjectRefId: string;
  pageStart: string;
  pageEnd: string;
  publishedDateTitle: string;
  icod: string;
  overallDocumentCapco: string;
  authorTitle: string;
  mode;
  editorView: EditorView;
  isCitationObject: boolean;
  sourceText: string;
};
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

describe('AddCitationCommand', () => {
  const addctcomd = new AddCitationCommand({
    color: 'blue',
  } as AddCitationCommandOptions);
  it('should handle saveCitationUseObject', () => {
    const mockschema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          attrs: {
            styleName: { default: 'test' },
          },
          toDOM() {
            return ['p', 0];
          },
        },
        heading: {
          attrs: { level: { default: 1 }, styleName: { default: '' } },
          content: 'inline*',
          marks: '',
          toDOM(node) {
            return [
              'h' + node.attrs.level,
              { 'data-style-name': node.attrs.styleName },
              0,
            ];
          },
        },
        text: {
          group: 'inline',
        },
      },
    });

    // Create a sample document
    const mockdoc = mockschema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, styleName: 'test' },
          content: [
            {
              type: 'text',
              text: 'Hello, ProseMirror!',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a mock dummy document.',
              attrs: { styleName: 'test' },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'It demonstrates the structure of a ProseMirror document.',
            },
          ],
        },
      ],
    });
    const mockselection = {
      $from: {
        before: (x) => {
          return x - 1;
        },
      },
      $to: {
        after: (x: number) => {
          return x + 1;
        },
        end: () => {
          return 2;
        },
      },
    };
    const setNodeMarkupMock = () => {
      return {
        removeTextAlignAndLineSpacing: () => {
          return {
            createEmptyElement: () => ({}),
          };
        },
      };
    };
    const mockeditorstate = {
      schema: mockschema,
      doc: mockdoc,
      selection: mockselection,
      tr: {
        setSelection: () => {
          return {
            setNodeMarkup: setNodeMarkupMock,
            doc: mockdoc,
          };
        },
      },
    };
    const tr = {
      setSelection: () => {
        return {
          setNodeMarkup: setNodeMarkupMock,
          doc: mockdoc,
          selection: {
            $from: {
              before: (x: number) => {
                return x - 1;
              },
            },
            $to: {
              after: () => {
                return 1;
              },
              end: () => {
                return 2;
              },
            },
          },
        };
      },
      doc: {
        doc: { type: { name: 'paragraph' } },
        nodesBetween: () => {
          return { value: 'selctednode_dummy' };
        },
      },
    };

    expect(
      addctcomd.saveCitationUseObject(
        mockeditorstate as unknown as EditorState,
        tr as unknown as Transform,
        { isCitationObject: false } as unknown as CitationProps
      )
    ).toStrictEqual(tr);
  });
  it('should handle hasCitationApplied', () => {
    expect(
      addctcomd.hasCitationApplied({
        selection: { from: 0, to: 1 },
        doc: {
          nodeAt: () => {
            return {
              marks: [
                {
                  type: { name: 'mark-text-highlight' },
                  attrs: { hasCitation: true },
                },
              ],
            };
          },
        },
      } as unknown as Transaction)
    ).toBeDefined();
  });
  it('should handle hasCitationApplied when hasCitation:false', () => {
    expect(
      addctcomd.hasCitationApplied({
        selection: { from: 0, to: 1 },
        doc: {
          nodeAt: () => {
            return {
              marks: [
                {
                  type: { name: 'mark-text-highlight' },
                  attrs: { hasCitation: false },
                },
              ],
            };
          },
        },
      } as unknown as Transaction)
    ).toBeDefined();
  });
  it('should handle hasCitationApplied when node.length = 0', () => {
    expect(
      addctcomd.hasCitationApplied({
        selection: { from: 0, to: 1 },
        doc: {
          nodeAt: () => {
            return { marks: [] };
          },
        },
      } as unknown as Transaction)
    ).toBeDefined();
  });
  it('should handle hasCitationApplied when m.type not mark-text-highlight', () => {
    expect(
      addctcomd.hasCitationApplied({
        selection: { from: 0, to: 1 },
        doc: {
          nodeAt: () => {
            return {
              marks: [
                { type: { name: 'test' }, attrs: { hasCitation: false } },
              ],
            };
          },
        },
      } as unknown as Transaction)
    ).toBeDefined();
  });
  it('should handle executeWithUserInput when dispatch undefined', () => {
    addctcomd._popUp = {} as unknown as PopUpHandle;
    expect(
      addctcomd.executeWithUserInput(
        {
          tr: {
            setSelection: () => {
              return {};
            },
          },
          selection: {},
        } as unknown as EditorState,
        undefined as unknown as () => undefined,
        {} as unknown as EditorView,
        citation as unknown as CitationProps
      )
    ).toBeFalsy();
  });
  it('should handle executeWithUserInput when citation null', () => {
    addctcomd._popUp = {} as unknown as PopUpHandle;
    expect(
      addctcomd.executeWithUserInput(
        {
          tr: {
            setSelection: () => {
              return {};
            },
          },
          selection: {},
        } as unknown as EditorState,
        () => undefined,
        {
          focus: () => undefined,
        } as unknown as EditorView,
        null as unknown as CitationProps
      )
    ).toBeDefined();
  });
  it('should handle executeWithUserInput when typeofSaveCitation is not function', () => {
    jest
      .spyOn(addctcomd, 'saveCitationUseObject')
      .mockReturnValue({} as unknown as Transaction);
    jest.spyOn(addctcomd, 'hasCitationApplied').mockReturnValue(false);
    addctcomd._popUp = {} as unknown as PopUpHandle;
    expect(
      addctcomd.executeWithUserInput(
        {
          tr: {
            setSelection: () => {
              return {};
            },
          },
          selection: {},
        } as unknown as EditorState,
        () => undefined,
        {
          focus: () => undefined,
        } as unknown as EditorView,
        null as unknown as CitationProps
      )
    ).toBeDefined();
  });
  it('should handle executeWithUserInput when typeofSaveCitation is not function 2', () => {
    jest
      .spyOn(addctcomd, 'saveCitationUseObject')
      .mockReturnValue({} as unknown as Transaction);
    jest.spyOn(addctcomd, 'hasCitationApplied').mockReturnValue(false);
    addctcomd._popUp = {} as unknown as PopUpHandle;
    expect(
      addctcomd.executeWithUserInput(
        {
          tr: {
            setSelection: () => {
              return {};
            },
          },
          selection: {},
        } as unknown as EditorState,
        () => undefined,
        undefined as unknown as EditorView,
        {} as unknown as CitationProps
      )
    ).toBeDefined();
  });
  it('should handle _isEnabled', () => {
    expect(
      addctcomd._isEnabled({
        tr: {
          selection: {
            node: { type: { name: 'image' } },
          } as unknown as NodeSelection,
        },
      } as unknown as EditorState)
    ).toBe(false);
  });
  it('should handle isList when ordered_list', () => {
    expect(
      addctcomd.isList(
        {
          node: () => {
            return { type: { name: 'ordered_list' } } as unknown as Node;
          },
        } as ResolvedPos,
        0
      )
    ).toBe(true);
  });
  it('should handle isList when bullet_list', () => {
    expect(
      addctcomd.isList(
        {
          node: () => {
            return { type: { name: 'bullet_list' } };
          },
        } as ResolvedPos,
        0
      )
    ).toBe(true);
  });
  it('should handle isList when anythingelse', () => {
    expect(
      addctcomd.isList(
        {
          node: () => {
            return { type: { name: '' } };
          },
        } as ResolvedPos,
        0
      )
    ).toBe(false);
  });
  it('should handle createCitationObject 1 arg', () => {
    expect(addctcomd.createCitationObject(0)).toBeDefined();
  });
  it('should handle createCitationObject 2 arg', () => {
    expect(
      addctcomd.createCitationObject(0, {
        state: { selection: { empty: false } },
      } as unknown as EditorView)
    ).toBeDefined();
  });
  it('should handle createCitationObject with citable material', () => {
    addctcomd.citableMaterial = [
      {
        id: '1',
        title: 'foobar',
      },
    ];
    const result = addctcomd.createCitationObject(0) as unknown as Record<
      string,
      string
    >;
    expect(result.citableMaterial).toEqual(addctcomd.citableMaterial);
  });
  it('should handle waitForUserInput', () => {
    expect(
      addctcomd.waitForUserInput(
        {} as unknown as EditorState,
        () => {
          return {};
        },
        {} as unknown as EditorView
      )
    ).toBeDefined();
    expect(
      addctcomd.waitForUserInput(
        {} as unknown as EditorState,
        () => {
          return {};
        },
        {} as unknown as EditorView
      )
    ).toBeDefined();
  });
  it('should handle ShowTexteHighLightMark', () => {
    expect(
      ShowTexteHighLightMark(
        {
          addMark: () => {
            return {};
          },
        } as unknown as Transform,
        {
          schema: {
            marks: {
              'mark-text-highlight': {
                create: () => {
                  return {};
                },
              },
            },
          },
        } as unknown as EditorState,
        0,
        true,
        'blue',
        1
      )
    ).toBeDefined();
  });
  it('should render label', () => {
    expect(addctcomd.renderLabel()).toBeFalsy();
  });
  it('should cancel', () => {
    expect(addctcomd.cancel()).toBeFalsy();
  });
  it('should be active', () => {
    expect(addctcomd.isActive()).toBeFalsy();
  });
  it('should execute Custom', () => {
    const state = {} as unknown as EditorState;
    const tr = {} as unknown as Transform;
    expect(addctcomd.executeCustom(state, tr)).toBe(tr);
  });
  it('should handle showCitations correctly', () => {
    const mockEditorView = {} as unknown as EditorView;
    const mockCitation = {
      documentTitle: 'Test Title',
      referenceId: '12345',
      author: 'John Doe',
      publishedDate: '2023-01-01',
      documentTitleCapco: 'Test Title Capco',
      hyperLink: 'http://example.com',
      dateAccessed: '2023-02-01',
      overallCitationCAPCO: 'Test Citation Capco',
      pageTitle: 'Test Page Title',
      extractedInfoCAPCO: 'Extracted Info',
      descriptionCAPCO: 'Description Capco',
      description: 'Test Description',
      citationObjectRefId: 'abc123',
      pageStart: '1',
      pageEnd: '10',
      publishedDateTitle: 'Published Date',
      icod: 'ICOD123',
      overallDocumentCapco: 'Overall Document Capco',
      authorTitle: 'Author Title',
      mode: 1,
      editorView: mockEditorView,
      isCitationObject: true,
      sourceText: 'Source Text',
    } as unknown as CitationProps;
    addctcomd.citationBuilder = jest.fn().mockReturnValue('Mock citation text');
    addctcomd.showCitations(mockCitation);

    expect(addctcomd.citationBuilder).toHaveBeenCalledWith(mockCitation);
    expect(addctcomd.citationText).toBe('Mock citation text');
  });
  it('should handle createCitationObject with EditorView', () => {
    expect(
      addctcomd.createCitationObject(0, {
        state: { selection: { empty: false } },
      } as unknown as EditorView)
    ).toBeDefined();
  });
  it('should handle createCitationObject with EditorView and invalid pos', () => {
    expect(
      addctcomd.createCitationObject(-1, {
        state: { selection: { empty: false } },
      } as unknown as EditorView)
    ).toBeDefined();
  });
});
