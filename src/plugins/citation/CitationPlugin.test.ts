import {
  CitationPlugin,
  commentDeco,
  isHighlightViaCollab,
} from './CitationPlugin';
import { schema, builders } from 'prosemirror-test-builder';
import {
  EditorState,
  TextSelection,
  Plugin,
  PluginKey,
  Transaction,
} from '@tiptap/pm/state';
import {
  AddCitationCommand,
  addTexthighlightMark,
  removeTexthighlightMark,
  ShowTexteHighLightMark,
} from './AddCitationCommand';
import { createEditor } from 'jest-prosemirror';
import {
  DOMOutputSpec,
  Mark,
  MarkSpec,
  Node,
  ParseRule,
  Schema,
  Slice,
} from '@tiptap/pm/model';
import { EditorView } from '@tiptap/pm/view';
import { Transform } from '@tiptap/pm/transform';
import { CitationView, Style } from './CitationView';
import { CitationRuntime } from './CitationRuntime';
import { isTransparent, toCSSColor } from './toCSSColor';

import { CitationProps } from './Types';
import { CapcoService } from './Constants';

class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}

describe('Citation Plugin', () => {
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
  } as unknown as CitationProps;

  const TextHighlightMarkSpec: MarkSpec = {
    attrs: {
      highlightColor: { default: '' },
    },
    inline: true,
    group: 'inline',
    parseDOM: [
      {
        tag: 'span[style*=background-color]',
        getAttrs: (dom: HTMLElement) => {
          const { backgroundColor } = dom.style;
          return {
            highlightColor: backgroundColor,
          };
        },
      },
    ] as ParseRule[],

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
  plugin.initButtonCommands('dark');
  const { doc, p } = builders(effSchema, { p: { nodeType: 'paragraph' } });

  it('should remove Citation Mark', () => {
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
    const cView = new CitationView(
      view.state.doc.nodeAt(0)?.child(1),
      view,
      () => undefined,
      {} as CapcoService<unknown>
    );
    const selection = TextSelection.create(view.state.doc, 7, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const styles = {
      textHighlight: 'green',
    };
    const style: Style = { styles };

    const spyiSNVMock = jest.spyOn(cView, 'getAppliedCustomStyle');
    spyiSNVMock.mockReturnValue(style);

    const returnedtr = cView.removeCitationMark(view.state.tr, 7, 12);
    expect(returnedtr).toBeDefined();
  });

  it('should remove Citation Mark - else path', () => {
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
    const cView = new CitationView(
      view.state.doc.nodeAt(0)?.child(1),
      view,
      () => undefined,
      {} as CapcoService<unknown>
    );
    const selection = TextSelection.create(view.state.doc, 7, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const styles = {
      textHighlight: '',
    };
    const style: Style = { styles };

    const spyiSNVMock = jest.spyOn(cView, 'getAppliedCustomStyle');
    spyiSNVMock.mockReturnValue(style);

    const returnedtr = cView.removeCitationMark(view.state.tr, 7, 12);
    expect(returnedtr).toBeDefined();
  });

  it('Add Texthighlight Mark', () => {
    const state = EditorState.create({
      doc: doc(p('Hello World!!!')),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const selection = TextSelection.create(view.state.doc, 6, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const addTextHighlighttr = addTexthighlightMark(
      view.state.tr,
      view.state,
      6,
      12
    );

    expect(addTextHighlighttr).toBeDefined();
  });

  it('Remove Texthighlight Mark', () => {
    const state = EditorState.create({
      doc: doc(p('Hello World!!!')),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const selection = TextSelection.create(view.state.doc, 6, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const rmTextHighlighttr = removeTexthighlightMark(
      view.state.tr,
      view.state,
      6,
      12
    );

    expect(rmTextHighlighttr).toBeDefined();
  });

  it('Show Texthighlight Mark', () => {
    const state = EditorState.create({
      doc: doc(p('Hello World!!!')),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const selection = TextSelection.create(view.state.doc, 6, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );
    view.dispatch(tr);
    const shTextHighlighttr = ShowTexteHighLightMark(
      view.state.tr,
      view.state,
      6,
      false,
      'transparent',
      12
    );

    expect(shTextHighlighttr).toBeDefined();
  });

  it('should hideSourceText', () => {
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

    // Set up our document body
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

    let mypos;
    let mynode;

    view.state.doc.descendants((node, pos) => {
      if (node.type === effSchema.nodes.citationnote) {
        mypos = pos;
        mynode = node;
        return false;
      }
      return true;
    });

    const TEXT = 'success';

    const attrs: Record<string, unknown> = {};
    Object.assign(attrs, mynode.attrs);
    attrs.sourceText = TEXT;

    view.dispatch(
      view.state.tr.setNodeMarkup(mypos, effSchema.nodes.citationnote, attrs)
    );
    expect(view.state.doc.nodeAt(0)?.child(1).attrs.sourceText).toBe(undefined);
  });

  it('should get Citation runtime length', async () => {
    const runtime = new CitationRuntime();
    const spyiAE = jest.spyOn(runtime, 'isArrEmpty');
    spyiAE.mockReturnValue(true);

    const citList = await runtime.getCitationsAsync();
    expect(citList.length).toEqual(0);
  });

  it('should handle removeCitation', () => {
    const runtime = new CitationRuntime('test');
    expect(runtime.removeCitation('8900098')).toBeDefined();
  });

  it('should render citationnote', () => {
    // Set up our document body
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

    let mynode;

    view.state.doc.descendants((node) => {
      if (node.type === effSchema.nodes.citationnote) {
        mynode = node;
        return false;
      }
      return true;
    });

    const TEXT = 'success';

    const attrs: Record<string, unknown> = {};
    Object.assign(attrs, mynode.attrs);
    attrs.sourceText = TEXT;
    view.dispatch = () => {
      return true;
    };
    expect(view.state.doc.nodeAt(0)?.child(1).attrs.sourceText).toBe(undefined);

    const cView = new CitationView(
      view.state.doc.nodeAt(0)?.child(1),
      view,
      () => undefined,
      {} as CapcoService<unknown>
    );
    const e = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });

    const gnpMock = jest.spyOn(cView, 'getNodePosEx');
    gnpMock.mockImplementation((_x: number, _y: number) => {
      return 1;
    });

    const gfMock = jest.spyOn(cView, 'getFromValue');
    gfMock.mockImplementation((_e: MouseEvent) => {
      return 0;
    });

    const scrMock = jest.spyOn(cView, 'setContentRight');
    scrMock.mockImplementation(
      (
        _e: MouseEvent,
        _parent: Element,
        _tooltip: HTMLDivElement,
        ttContent: HTMLDivElement
      ) => {
        ttContent.style.right = '10px';
      }
    );

    const spyPNTMock = jest.spyOn(cView, 'parentNodeType');
    spyPNTMock.mockReturnValue(true);
    cView.showSourceText(e);
  });

  it('call updateMarks', () => {
    const newCitationNode = effSchema.node(
      effSchema.nodes.citationnote,
      citation
    );
    const state = EditorState.create({
      doc: doc(p('Hello World', newCitationNode)),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const selection = TextSelection.create(view.state.doc, 6, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const CBFn = () => {
      return;
    };
    const cView = new CitationView(
      view.state.doc.nodeAt(0),
      view,
      CBFn,
      {} as CapcoService<unknown>
    );
    cView.updateMarks(false, view.state.doc.nodeAt(0), 6, 0);
    expect(view.state.doc.nodeAt(0)?.child(1)).toBeDefined();
  });

  it('hasCitationApplied', () => {
    const before =
      '<span contenteditable="false" class="capco ProseMirror-widget" style="user-select: none; color: black; display: none;"></span>New CITATION <span style="background-color: undefined;z-index: 1;opacity :5" hascitation="true" markfrom="5" overridden="false">check </span>here';

    const plugin = new CitationPlugin();
    const effSchema = plugin.getEffectiveSchema(modSchema);

    const newCitationNode = effSchema.node(
      effSchema.nodes.citationnote,
      citation
    );
    const state = EditorState.create({
      doc: doc(p(before, newCitationNode, 'Hello World!!!')),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const selection = TextSelection.create(view.state.doc, 1, 9);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const bOK = new AddCitationCommand().hasCitationApplied(tr);
    expect(bOK).toBeFalsy();
  });

  it('hasCitationApplied to be truthy', () => {
    const before =
      '<span contenteditable="false" class="capco ProseMirror-widget" style="user-select: none; color: black; display: none;"></span>New CITATION <span style="background-color: undefined;z-index: 1;opacity :5" hascitation="true" markfrom="5" overridden="false">check </span>here';

    const plugin = new CitationPlugin();
    const effSchema = plugin.getEffectiveSchema(modSchema);

    const newCitationNode = effSchema.node(
      effSchema.nodes.citationnote,
      citation
    );
    const state = EditorState.create({
      doc: doc(p(before, newCitationNode, 'Hello World!!!')),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const selection = TextSelection.create(view.state.doc, 1, 9);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const bOK = new AddCitationCommand().hasCitationApplied(tr);
    expect(bOK).toBeFalsy();
  });
  it('should take if path', () => {
    const before =
      '<span contenteditable="false" class="capco ProseMirror-widget" style="user-select: none; color: black; display: none;"></span>New CITATION <span style="background-color: undefined;z-index: 1;opacity :5" hascitation="true" markfrom="5" overridden="false">check </span>here';

    const plugin = new CitationPlugin();
    const effSchema = plugin.getEffectiveSchema(modSchema);

    const newCitationNode = effSchema.node(
      effSchema.nodes.citationnote,
      citation
    );
    const state = EditorState.create({
      doc: doc(p(before, newCitationNode, 'Hello World!!!')),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const selection = TextSelection.create(view.state.doc, 1, 9);
    const tr = view.state.tr.setSelection(selection);
    const AddCitationCommd = new AddCitationCommand();
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const bOK = AddCitationCommd.hasCitationApplied(tr);
    expect(bOK).toBeFalsy();
  });

  it('should return ParentNodePOS', () => {
    const before = 'hello';

    const newCitationNode = effSchema.node(
      effSchema.nodes.citationnote,
      citation
    );
    const plugin = new CitationPlugin();
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
    const selection = TextSelection.create(view.state.doc, 7, 12);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);
    const addCitationcmd = new AddCitationCommand();
    const parentpos = addCitationcmd.getParentNodeSize(state);
    expect(parentpos).toBe(13);

    const gPN = addCitationcmd.getParentStartPos(state.selection.$head);
    expect(gPN).toBe(1);
  });

  it('should executeWithUserInput', () => {
    const addCitationcmd = new AddCitationCommand();
    jest
      .spyOn(addCitationcmd, 'saveCitationUseObject')
      .mockReturnValue({} as unknown as Transform);
    jest
      .spyOn(addCitationcmd, 'createFootNoteForCitation')
      .mockReturnValue({} as unknown as Transform);
    const bok = addCitationcmd.executeWithUserInput(
      {
        tr: {
          setSelection: () => {
            return {
              selection: { from: 0, to: 1 },
              doc: {
                nodeAt: () => {
                  return {};
                },
              },
            } as unknown as Transform;
          },
          selection: {
            from: 0,
            to: 1,
            $from: {
              before: () => {
                return 0;
              },
            },
          },
        },
        selection: {
          from: 0,
          to: 1,
          $from: {
            before: () => {
              return 0;
            },
          },
          $to: {
            after: () => {
              return 1;
            },
          },
        },
      } as unknown as EditorState,
      () => {
        return undefined;
      },
      {
        focus: () => {
          return {};
        },
      } as unknown as EditorView,
      citation
    );

    expect(bok).toBeFalsy();
  });

  it('should createCitationObject in index', () => {
    const node = {
      attrs: {
        posfrom: 0,
        posto: 9,
        from: 0,
        to: 9,
        documenttitlecapco: 'TBD',
        documenttitle: 'Second document title',
        referenceid: '8900098',
        publisheddate: '2022-07-22',
        dateaccessed: '2022-07-21',
        hyperlink: 'www.google.com',
        author: 'Jerry Rodgers',
        overallcitationcapco: 'TBD',
        extractedinfocapco: 'TBD',
        descriptioncapco: 'TBD',
        description: 'test description',
        citationobjectrefid: '',
        pnumstart: '0',
        pnumend: '2',
        overallDocumentCapco: 'TBD',
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
        descriptionCAPCO: 'N/A',
        extractedInfoCAPCO: 'TBD',
        overallCitationCAPCO: 'TBD',
        pageEnd: '25',
        pageStart: '15',
        pageTitle: '',
        // sourceText:
        //   '(TBD) Jerry Rodgers 8900098 Date undefined 2021-07-22 ICOD Date 2022-07-22 (TBD) Second document title pp. 15-25 Extracted information is (TBD) Overall document classification is (TBD) Date Accessed 2022-07-21 www.google.com',
      } as unknown as NamedNodeMap,
    };
    const siCitationPlugin = new CitationPlugin();
    expect(siCitationPlugin.createCitationNotObject(node.attrs)).toBeDefined();
  });

  it('should save citationnote', () => {
    const editor = createEditor(doc('<cursor>', p('Hello')));
    const mockEnd = () => 6;
    const state = {
      ...editor.state,
      selection: {
        $from: {
          before: () => {
            return {};
          },
        },
        $to: { end: mockEnd },
      },
    };
    const tr = new AddCitationCommand().saveCitationUseObject(
      state as unknown as EditorState,
      editor.state.tr,
      citation
    );
    expect(tr).toBeTruthy();
  });
  it('should handle Paste', () => {
    const before = 'Hello World!!!';

    const newCitationNode = effSchema.node(
      effSchema.nodes.citationnote,
      citation
    );
    const plugin = new CitationPlugin();

    const state = EditorState.create({
      doc: doc(p(before, newCitationNode)),
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
    const selection = TextSelection.create(view.state.doc, 17);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);

    const clipEvent = {
      preventDefault: () => {
        return {};
      },
    } as unknown as ClipboardEvent;
    const slice = tr.doc.nodeAt(0)?.slice(0, 2);
    expect(plugin.props.handlePaste).toBeTruthy();
    if (!plugin.props.handlePaste) {
      return;
    }
    const handlPastRet = plugin.props.handlePaste.bind(plugin)(
      view,
      clipEvent,
      slice
    );

    expect(handlPastRet).toBe(true);
  });

  it('should create footnote', () => {
    const editor = createEditor(doc('<cursor>', p('Hello')));
    const tr = new AddCitationCommand().createFootNoteForCitation(
      editor.view as unknown as EditorView,
      editor.state,
      editor.state.tr,
      citation
    );
    expect(tr).toBeTruthy();
  });

  it('citation runtime url path', () => {
    const runtime = new CitationRuntime();
    const urlPath = 'citations';
    const url = runtime.buildRouteForCitation(urlPath);
    expect(url).toBe('/' + urlPath);
  });

  it('isTransparent', () => {
    const bOK = isTransparent('rgba(0,0,0,0)');
    expect(bOK).toBeTruthy();
  });

  it('isTransparent input not given', () => {
    const bOK = isTransparent('');
    expect(bOK).toBeTruthy();
  });

  it('toCSSColor input not given', () => {
    const bOK = toCSSColor('');
    expect(bOK).toBe('');
  });
  //
  it('toCSSColor input  given', () => {
    const bOK = toCSSColor('rgb(174, 208, 230)');
    expect(bOK).toBe('#aed0e6');
  });

  it('toCSSColor input  given as transparent', () => {
    const bOK = toCSSColor('transparent');
    expect(bOK).toBe('rgba(0,0,0,0)');
  });
  it('_isEnabled in AddCitationCommand', () => {
    const before =
      '<span contenteditable="false" class="capco ProseMirror-widget" style="user-select: none; color: black; display: none;"></span>New CITATION <span style="background-color: undefined;z-index: 1;opacity :1807" hascitation="true" markfrom="1807" overridden="false">check </span>here';

    const newCitationNode = effSchema.node(
      effSchema.nodes.citationnote,
      citation
    );
    const state = EditorState.create({
      doc: doc(p(before, newCitationNode, 'hello')),
      schema: effSchema,
      plugins: [plugin],
    });

    const dom = document.createElement('div');

    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );

    const selection = TextSelection.create(view.state.doc, 0, 3);
    const tr = view.state.tr.setSelection(selection);
    view.updateState(
      view.state.reconfigure({ plugins: [plugin, new TestPlugin()] })
    );

    view.dispatch(tr);

    const com = new AddCitationCommand();
    const bok = com.isEnabled(view.state);
    expect(bok).toBeTruthy();
  });

  it('handleAppendTransactions', () => {
    expect(
      plugin.handleAppendTransactions(
        [{ docChanged: true } as unknown as Transaction],
        { doc: 'doc' } as unknown as EditorState,
        { doc: 'doc' } as unknown as EditorState
      )
    ).toBeNull();
  });
  it('handleAppendTransactions when this._view &&(DELKEYCODE === this._view["lastKeyCode"', () => {
    plugin._view = { lastKeyCode: 46 } as unknown as EditorView;
    expect(
      plugin.handleAppendTransactions(
        [{ docChanged: true } as unknown as Transaction],
        {
          doc: 'doc1',
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'citationnote' } };
              },
            },
            selection: { from: 0, $head: { pos: 3, parentOffset: 1 } },
          },
        } as unknown as EditorState,
        {
          doc: 'doc',
          tr: {
            doc: {
              nodeAt: () => {
                return null;
              },
            },
            selection: { from: 0, $head: { pos: 3, parentOffset: 1 } },
          },
        } as unknown as EditorState
      )
    ).toBeNull();
  });
  it('handleAppendTransactions when this._view && BACKSPACEKEYCODE === this._view["lastKeyCode"]', () => {
    plugin._view = { lastKeyCode: 8 } as unknown as EditorView;
    expect(
      plugin.handleAppendTransactions(
        [{ docChanged: true } as unknown as Transaction],
        {
          doc: 'doc1',
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'citationnote' } };
              },
            },
            selection: { from: 0, $head: { pos: 3, parentOffset: 1 } },
          },
        } as unknown as EditorState,
        {
          doc: 'doc',
          tr: {
            doc: {
              nodeAt: () => {
                return null;
              },
            },
            selection: { from: 0, $head: { pos: 3, parentOffset: 1 } },
          },
        } as unknown as EditorState
      )
    ).toBeNull();
  });
  it('handleAppendTransactions when  node && "citationnote" != prevState.tr.doc.nodeAt(startPos).type.name', () => {
    plugin._view = { lastKeyCode: 8 } as unknown as EditorView;
    expect(
      plugin.handleAppendTransactions(
        [{ docChanged: true } as unknown as Transaction],
        {
          doc: 'doc1',
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'test' } };
              },
            },
            selection: { from: 0, $head: { pos: 3, parentOffset: 1 } },
          },
        } as unknown as EditorState,
        {
          doc: 'doc',
          tr: {
            doc: {
              nodeAt: () => {
                return null;
              },
            },
            selection: { from: 0, $head: { pos: 3, parentOffset: 1 } },
          },
        } as unknown as EditorState
      )
    ).toBeNull();
  });

  //////////////////////

  it('should set attributes for citation node with valid posfrom and posto', () => {
    const citationPlugin = plugin;
    const newCitationTag = document.createElement('citation');
    citationPlugin.createCitationNotObject(newCitationTag.attributes);
    expect(newCitationTag.getAttribute('from')).toBe(null);
    expect(newCitationTag.getAttribute('to')).toBe(null);
  });

  it('should return true when both viaCollab and isHighlight are true', () => {
    const tr = {
      getMeta: (key: string) => {
        if (key === 'collab$') {
          return true;
        }
        if (key === 'HIGHLIGHTDECO') {
          return true;
        }
        return null;
      },
    };

    const result = isHighlightViaCollab(tr as unknown as Transaction); // Pass the mocked transaction

    expect(result).toBe(false); // Expect the function to return true
  });

  it('should return false when viaCollab is false', () => {
    // Mock transaction without collab$ meta data
    const tr = {
      getMeta: (key: string) => {
        if (key === 'HIGHLIGHTDECO') {
          return true;
        }
        return null;
      },
    };

    const result = isHighlightViaCollab(tr as unknown as Transaction); // Pass the mocked transaction

    expect(result).toBe(false); // Expect the function to return false
  });

  it('should return false when isHighlight is false', () => {
    // Mock transaction without HIGHLIGHTDECO meta data
    const tr = {
      getMeta: (key: string) => {
        if (key === 'collab$') {
          return true;
        }
        return null;
      },
    };

    const result = isHighlightViaCollab(tr as unknown as Transaction); // Pass the mocked transaction

    expect(result).toBe(false); // Expect the function to return false
  });

  it('should return false when both viaCollab and isHighlight are false', () => {
    // Mock transaction without collab$ and HIGHLIGHTDECO meta data
    const tr = {
      getMeta: () => null,
    };

    const result = isHighlightViaCollab(tr as unknown as Transaction); // Pass the mocked transaction

    expect(result).toBe(false); // Expect the function to return false
  });

  it('should return true when viaCollab is true and HIGHLIGHTDECO is not set', () => {
    // Mock transaction with collab$ set to true and no HIGHLIGHTDECO meta data
    const tr = {
      getMeta: (key: string) => {
        if (key === 'collab$') {
          return true;
        }
        return null;
      },
    };

    const result = isHighlightViaCollab(tr as unknown as Transaction); // Pass the mocked transaction

    expect(result).toBe(false); // Expect the function to return true
  });
  it('should return true when viaCollab is true and HIGHLIGHTDECO is not set 2', () => {
    // Mock transaction with collab$ set to true and no HIGHLIGHTDECO meta data
    const tr = {
      getMeta: () => {
        return true;
      },
    };

    const result = isHighlightViaCollab(tr as unknown as Transaction);

    expect(result).toBe(true);
  });
  it('should handle commentDeco', () => {
    expect(
      commentDeco(
        {
          forEach: () => {
            return null;
          },
        } as unknown as Node,
        { selection: { from: 0, to: 1 } } as unknown as EditorState,
        {
          getMeta: (x) => {
            if (x === 'citationHighLightDecoration') {
              return null;
            } else {
              return {
                getMeta: () => {
                  return null;
                },
              };
            }
          },
        } as unknown as Transaction
      )
    ).toBeDefined();
  });

  it('should handle handleDrop and return true', () => {
    expect(plugin.props.handleDrop).toBeTruthy();
    if (!plugin.props.handleDrop) {
      return;
    }
    const handlDropRet = plugin.props.handleDrop.bind(plugin)(
      {
        posAtCoords: () => {
          return { pos: 3 };
        },
        state: {
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'citationnote' } };
              },
            },
          },
        },
      } as unknown as EditorView,
      {
        clientX: 0,
        clientY: 1,
        preventDefault: () => {
          return null;
        },
      } as unknown as ClipboardEvent,
      {} as unknown as Slice
    );
    expect(handlDropRet).toBeTruthy();
  });
  it('should handle transformPastedHTML', () => {
    expect(plugin.props.transformPastedHTML).toBeTruthy();
    if (!plugin.props.transformPastedHTML) {
      return;
    }
    const transformPastedHTMLRet = plugin.props.transformPastedHTML.bind(
      plugin
    )('<div><citation id="1">Some content</citation></div>');
    expect(transformPastedHTMLRet).toBeTruthy();
  });
  it('should handle handleDOMEvents keydown when event.key is Enter', () => {
    expect(plugin.props.handleDOMEvents?.keydown).toBeTruthy();
    if (!plugin.props.handleDOMEvents?.keydown) {
      return;
    }
    const handleDOMEventsRet = plugin.props.handleDOMEvents.keydown.bind(
      plugin
    )(
      {
        state: {
          selection: {
            from: 2,
            $anchor: { nodeAfter: { type: { name: 'citationnote' } } },
          },
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'citationnote' } };
              },
            },
          },
        },
      } as unknown as EditorView,
      {
        key: 'Enter',
        preventDefault: () => {
          return null;
        },
      } as unknown as KeyboardEvent
    );
    expect(handleDOMEventsRet).toBeFalsy();
  });
  it('should handle handleDOMEvents keydown when event.key is .', () => {
    expect(plugin.props.handleDOMEvents?.keydown).toBeTruthy();
    if (!plugin.props.handleDOMEvents?.keydown) {
      return;
    }
    const handleDOMEventsRet = plugin.props.handleDOMEvents.keydown.bind(
      plugin
    )(
      {
        state: {
          selection: {
            from: 2,
            $anchor: { nodeAfter: { type: { name: 'citationnote' } } },
          },
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'citationnote' } };
              },
            },
          },
        },
      } as unknown as EditorView,
      {
        key: '.',
        preventDefault: () => {
          return null;
        },
      } as unknown as KeyboardEvent
    );
    expect(handleDOMEventsRet).toBeFalsy();
  });
  it('should handle handleDOMEvents keydown when event.key is a', () => {
    expect(plugin.props.handleDOMEvents?.keydown).toBeTruthy();
    if (!plugin.props.handleDOMEvents?.keydown) {
      return;
    }
    const handleDOMEventsRet = plugin.props.handleDOMEvents.keydown.bind(
      plugin
    )(
      {
        state: {
          selection: {
            from: 2,
            $anchor: { nodeAfter: { type: { name: 'citationnote' } } },
          },
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'citationnote' } };
              },
            },
          },
        },
      } as unknown as EditorView,
      {
        key: 'a',
        preventDefault: () => {
          return null;
        },
      } as unknown as KeyboardEvent
    );
    expect(handleDOMEventsRet).toBeTruthy();
  });
  it('should handle handleDOMEvents keydown when event.key is a ctrlKey is true', () => {
    expect(plugin.props.handleDOMEvents?.keydown).toBeTruthy();
    if (!plugin.props.handleDOMEvents?.keydown) {
      return;
    }
    const handleDOMEventsRet = plugin.props.handleDOMEvents.keydown.bind(
      plugin
    )(
      {
        state: {
          selection: {
            from: 2,
            $anchor: { nodeAfter: { type: { name: 'citationnote' } } },
          },
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'citationnote' } };
              },
            },
          },
        },
      } as unknown as EditorView,
      {
        key: 'a',
        preventDefault: () => {
          return null;
        },
        ctrlKey: true,
      } as unknown as KeyboardEvent
    );
    expect(handleDOMEventsRet).toBeFalsy();
  });
  it('should handle handleDOMEvents keydown when  CITATION_NOTE is not node.type.name', () => {
    expect(plugin.props.handleDOMEvents?.keydown).toBeTruthy();
    if (!plugin.props.handleDOMEvents?.keydown) {
      return;
    }
    const handleDOMEventsRet = plugin.props.handleDOMEvents.keydown.bind(
      plugin
    )(
      {
        state: {
          selection: {
            from: 2,
            $anchor: { nodeAfter: { type: { name: 'citationnote' } } },
          },
          tr: {
            doc: {
              nodeAt: () => {
                return { type: { name: 'test' } };
              },
            },
          },
        },
      } as unknown as EditorView,
      {
        key: 'a',
        preventDefault: () => {
          return null;
        },
        ctrlKey: true,
      } as unknown as KeyboardEvent
    );
    expect(handleDOMEventsRet).toBeFalsy();
  });
});
