/* eslint-disable */

import { CitationPlugin } from './CitationPlugin';
import { schema, builders } from 'prosemirror-test-builder';
import { EditorState } from 'prosemirror-state';
import { DOMOutputSpec, Mark, MarkSpec, Schema } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { CitationView } from './CitationView';
import { CitationSubMenu } from './CitationSubMenu';
import React from 'react';
import { CapcoService } from './Constants';

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
        getAttrs: (dom: string | HTMLElement) => {
          if (typeof dom === 'string') {
            return null;
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
  plugin.initButtonCommands('dark');
  const { doc, p } = builders(effSchema, { p: { nodeType: 'paragraph' } });

  it('should render Citation Sub Menu', () => {
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
      view.state.doc.nodeAt(0)!.child(1),
      view,
      () => undefined,
      {} as CapcoService<unknown>
    );
    let citIconProps = {
      editorView: view,
      href: '',
      onCancel: cView.onCancel,
      onEdit: cView.onEditCitation,
      onRemove: cView.onRemoveCitation,
      onMouseOut: cView.onCitationMouseOut,
    };

    expect(new CitationSubMenu({ ...citIconProps }).render()).toBeDefined();
  });
  it('should handle _openLink ', () => {
    jest.spyOn(window, 'open').mockImplementation(() => {
      return {} as unknown as Window;
    });
    const props = {
      editorView: {} as unknown as EditorView,
      href: '',
      onCancel: () => undefined,
      onEdit: () => undefined,
      onRemove: () => undefined,
      onMouseOut: () => undefined,
    };
    const csubmenu = new CitationSubMenu(props);
    expect(csubmenu._openLink('test')).toBeUndefined();
  });
  it('should handle _openLink when isBookMarkHref(href)', () => {
    const props = {
      editorView: {} as unknown as EditorView,
      href: '',
      onCancel: () => undefined,
      onEdit: () => undefined,
      onRemove: () => undefined,
      onMouseOut: () => undefined,
    };
    const csubmenu = new CitationSubMenu(props);
    expect(csubmenu._openLink('#t')).toBeUndefined();
  });
  it('should handle _openLink when isBookMarkHref(href) and document.getelement.id returns value', () => {
    const dom = document.createElement('div');
    jest.spyOn(document, 'getElementById').mockReturnValue(dom);
    const props = {
      editorView: { editable: true } as unknown as EditorView,
      href: '',
      onCancel: () => undefined,
      onEdit: () => undefined,
      onRemove: () => undefined,
      onMouseOut: () => undefined,
    };
    const csubmenu = new CitationSubMenu(props);
    csubmenu.props = {
      editorView: { editable: true } as unknown as EditorView,
      href: '',
      onCancel: () => undefined,
      onEdit: () => undefined,
      onRemove: () => undefined,
      onMouseOut: () => undefined,
    };
    expect(csubmenu._openLink('#t')).toBeUndefined();
  });
  it('should handle _openLink when href is null ', () => {
    const props = {
      editorView: {} as unknown as EditorView,
      href: '',
      onCancel: () => undefined,
      onEdit: () => undefined,
      onRemove: () => undefined,
      onMouseOut: () => undefined,
    };
    const csubmenu = new CitationSubMenu(props);
    expect(csubmenu._openLink(null as unknown as string)).toBeUndefined();
  });
});
