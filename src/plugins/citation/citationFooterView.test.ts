import { EditorView } from 'prosemirror-view';
import { AddCitationCommand } from './AddCitationCommand';
import { CitationFooterView } from './CitationFooterView';
import { EditorState, Transaction } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { pluginKey } from './Types';
import * as CitationBuilder from './CitationBuilder';

describe('CitationFooterView', () => {
  let view: EditorView;
  let addCitationCommand: AddCitationCommand;
  let footerView: CitationFooterView;
  beforeEach(() => {
    view = {
      dom: document.createElement('div'),
      state: {
        doc: {
          nodeAt: jest.fn(() => ({ attrs: { objectId: 'mockObjectId' } })),
          descendants: jest.fn(),
        } as unknown as ProseMirrorNode,
        tr: {
          setSelection: jest.fn(() => view.state.tr),
        } as unknown as Transaction,
        selection: {
          $from: { before: jest.fn().mockReturnValue(1) },
        } as unknown as EditorState,
      },
      dispatch: jest.fn(),
    } as unknown as EditorView;

    addCitationCommand = {
      citationText: 'Mock Citation',
      citation: {
        referenceId: 'REF-1001',
      },
    } as AddCitationCommand;

    footerView = new CitationFooterView(view, addCitationCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with the correct DOM structure', () => {
    expect(footerView.dom).toBeTruthy();
    expect((footerView.dom as Element).className).toBe('custom-view');
  });

  it('should destroy the view and remove the DOM element', () => {
    footerView.destroy();
    expect(footerView.dom?.parentNode).toBeNull();
  });

  it('should return a citation object with correct properties', () => {
    // Mock node with attrs
    const mockNode = {
      attrs: {
        author: 'John Doe',
        overallDocumentCapco: 'UNCLASSIFIED',
        authorTitle: 'Dr.',
        referenceId: '12345',
        referenceType: 'Journal',
        publishedDate: '2023-08-30',
        icod: 'IC123',
        documentTitleCapco: 'Confidential',
        documentTitle: 'Sample Document Title',
        dateAccessed: '2024-08-30',
        overallCitationCAPCO: 'TOP SECRET',
        pageTitle: 'Page Title Example',
        extractedInfoCAPCO: 'Sensitive',
        declassifyDate: '2025-01-01',
        declassifyDateType: 'Automatic',
        descriptionCAPCO: 'Top Secret Information',
        description: 'Detailed description of the document.',
        citationObjectRefId: 'ref123',
        pages: '10-15',
        publishedDateTitle: 'Published Title',
        from: '2023-01-01',
        isCitationObject: true,
        to: '2024-01-01',
      },
    };

    // Expected citation object
    const expectedCitation = {
      author: 'John Doe',
      overallDocumentCapco: 'UNCLASSIFIED',
      authorTitle: 'Dr.',
      referenceId: '12345',
      referenceType: 'Journal',
      publishedDate: '2023-08-30',
      icod: 'IC123',
      documentTitleCapco: 'Confidential',
      documentTitle: 'Sample Document Title',
      dateAccessed: '2024-08-30',
      overallCitationCAPCO: 'TOP SECRET',
      pageTitle: 'Page Title Example',
      extractedInfoCAPCO: 'Sensitive',
      declassifyDate: '2025-01-01',
      declassifyDateType: 'Automatic',
      descriptionCAPCO: 'Top Secret Information',
      description: 'Detailed description of the document.',
      citationObjectRefId: 'ref123',
      pages: '10-15',
      publishedDateTitle: 'Published Title',
      from: '2023-01-01',
      isCitationObject: true,
      to: '2024-01-01',
    };

    // Call the method under test
    const result = footerView.buildCitationObject(mockNode);

    // Verify the result matches the expected citation object
    expect(result).toEqual(expectedCitation);
  });
  it('should not call scrollToNode when the node is not found', () => {
    const scrollToNodeSpy = jest.spyOn(footerView, 'scrollToNode');
    (view.state.doc.descendants as jest.Mock).mockImplementation(() => true);
    footerView.scrollToSpecificNode(view, undefined);
    expect(scrollToNodeSpy).not.toHaveBeenCalled();
  });
  it('should return undefined if no matching object ID is found', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div>
        <p objectid="mockObjectId1"></p>
        <div class="tableWrapper" pmviewdesc='{"node": {"attrs": {"objectId": "mockObjectId2"}}}'></div>
        <ul>
          <li objectid="mockObjectId3"></li>
        </ul>
      </div>
    `;
    jest.spyOn(JSON, 'parse').mockImplementation((value) => {
      return JSON.parse(value) as unknown;
    });
    const foundElement = footerView.findElementByObjectId(
      root,
      'nonExistentObjectId'
    );
    expect(foundElement).toBeUndefined();
  });
  it('should handle selectNode', () => {
    const spy = jest.spyOn(footerView, 'findElementByObjectId');
    const e = { currentTarget: {} } as unknown as MouseEvent;
    footerView.selectNode(e);
    expect(spy).toHaveBeenCalled();
  });
  it('should handle selectNode when e?.currentTarget is null', () => {
    const spy = jest.spyOn(footerView, 'scrollToSpecificNode');
    footerView.dom = undefined;
    const e = { currentTarget: null } as unknown as MouseEvent;
    footerView.selectNode(e);
    expect(spy).toHaveBeenCalled();
  });
  it('should return plugin state from the editor state using pluginKey', () => {
    const mockPluginState = { some: 'value' };
    const mockEditorState = {};
    const spy = jest
      .spyOn(pluginKey, 'getState')
      .mockReturnValue(mockPluginState);

    const result = footerView.getPluginState(mockEditorState);
    expect(result).toBe(mockPluginState);
    expect(spy).toHaveBeenCalledWith(mockEditorState);
  });
  it('should return the matching element when found in the first tag type', () => {
    const root = document.createElement('div');
    const matchingElement = document.createElement('p');
    (matchingElement as unknown as Record<string, unknown>).pmViewDesc = {
      node: {
        attrs: {
          objectId: 'match123',
        },
      },
    };
    root.appendChild(matchingElement);

    const result = footerView.findElementByObjectId(root, 'match123');
    expect(result).toBe(matchingElement);
  });
  it('should skip nodes with no citation text in populateCitationsOnLoad', () => {
    const mockDoc = {
      descendants: (cb) => {
        cb({ type: { name: 'citation_note' }, attrs: {} }, 1); // CITATION_NOTE with no citationText
      },
    };
    jest.spyOn(footerView, 'buildCitationObject').mockReturnValue({});
    jest.spyOn(CitationBuilder, 'defaultCitationText').mockReturnValue('');

    footerView.populateCitationsOnLoad(mockDoc);
    expect((footerView.dom as HTMLElement).innerText).toBe('');
  });
  it('should not throw if destroy is called multiple times', () => {
    footerView.destroy();
    expect(() => footerView.destroy()).not.toThrow();
  });
  it('should not call populateCitationsOnLoad if no changes and plugin state not loaded', () => {
    const populateSpy = jest.spyOn(footerView, 'populateCitationsOnLoad');
    jest.spyOn(footerView, 'getPluginState').mockReturnValue({ loaded: false });

    const mockDoc = {
      descendants: jest.fn(),
    };

    footerView.update({ state: { doc: mockDoc } }, { doc: mockDoc });

    expect(populateSpy).not.toHaveBeenCalled();
  });
  it('should return undefined if pluginKey returns undefined', () => {
    jest.spyOn(pluginKey, 'getState').mockReturnValue(undefined);
    const result = footerView.getPluginState({});
    expect(result).toBeUndefined();
  });
});
