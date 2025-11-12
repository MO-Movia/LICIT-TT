import { EditorView } from 'prosemirror-view';
import { AddCitationCommand } from './AddCitationCommand';
import { TextSelection } from 'prosemirror-state';
import { CITATION_NOTE } from './Constants';
import { defaultCitationText } from './CitationBuilder';
import { Citation, pluginKey } from './Types';

type ViewDescNode = {
  attrs?: {
    objectId?: string;
  };
};

type PmViewDesc = {
  node?: ViewDescNode;
};

type ElementWithPmViewDesc = {
  pmViewDesc?: PmViewDesc;
};

export class CitationFooterView {
  addCitationCommand: AddCitationCommand;
  dom?: globalThis.Node;
  view?: EditorView;
  lastAddedCitation?: string;

  constructor(view, addCitationCommand: AddCitationCommand) {
    this.view = view;
    this.addCitationCommand = addCitationCommand;
    this.dom = document.createElement('div');
    (this.dom as Element).className = 'custom-view';
    view.dom.parentNode?.insertBefore(this.dom, view.dom.nextSibling);
    this.dom?.addEventListener('click', this.selectNode.bind(this));
  }

  selectNode(e: MouseEvent): void {
    const attrsFrom = (e.target as Element)?.getAttribute('citation-from');
    const editor = document.querySelector('.czi-editor-frame-body-scroll');
    const element = this.findElementByObjectId(editor, attrsFrom);
    this.scrollToSpecificNode(this.view, element?.['pmViewDesc'].node);
  }

  findElementByObjectId(root: Element, id: string): Element {
    const tags = ['p', 'div.tableWrapper', 'ul'];
    let element: Element;
    tags.forEach((tag) => {
      const elements: Element[] = Array.from(root?.querySelectorAll(tag) || []);
      const e = elements.find((value) => {
        const elementWithDesc = value as ElementWithPmViewDesc;
        return elementWithDesc?.['pmViewDesc']?.node?.attrs?.objectId === id;
      });

      if (e) {
        element = e;
      }
    });

    return element;
  }

  scrollToNode(view, pos) {
    const transaction = view.state.tr.setSelection(
      TextSelection.create(view.state.doc, pos)
    );
    view.dispatch(transaction.scrollIntoView(true));
  }

  scrollToSpecificNode(view, node) {
    const { doc } = view.state;
    doc.descendants((n, pos) => {
      if (n === node) {
        this.scrollToNode(view, pos);
        return false;
      }
      return true;
    });
  }

  update(view, prevState) {
    if (view.state.doc !== prevState.doc) {
      this.populateCitationsOnLoad(view.state.doc);
    } else if (this.getPluginState(view.state).loaded) {
      this.populateCitationsOnLoad(view.state.doc);
      this.getPluginState(view.state).loaded = false;
    }
  }

  getPluginState(state) {
    return pluginKey.getState(state) as Record<string, unknown>;
  }

  buildCitationObject(node): Citation {
    return {
      author: node.attrs.author,
      overallDocumentCapco: node.attrs.overallDocumentCapco,
      authorTitle: node.attrs.authorTitle,
      referenceId: node.attrs.referenceId,
      referenceType: node.attrs.referenceType,
      publishedDate: node.attrs.publishedDate,
      icod: node.attrs.icod,
      documentTitleCapco: node.attrs.documentTitleCapco,
      documentTitle: node.attrs.documentTitle,
      dateAccessed: node.attrs.dateAccessed,
      overallCitationCAPCO: node.attrs.overallCitationCAPCO,
      pageTitle: node.attrs.pageTitle,
      extractedInfoCAPCO: node.attrs.extractedInfoCAPCO,
      declassifyDate: node.attrs.declassifyDate,
      declassifyDateType: node.attrs.declassifyDateType,
      descriptionCAPCO: node.attrs.descriptionCAPCO,
      description: node.attrs.description,
      citationObjectRefId: node.attrs.citationObjectRefId,
      pages: node.attrs.pages,
      publishedDateTitle: node.attrs.publishedDateTitle,
      from: node.attrs.from,
      isCitationObject: node.attrs.isCitationObject,
      to: node.attrs.to,
    };
  }

  populateCitationsOnLoad(doc) {
    const citations = [];
    doc.descendants((child, pos) => {
      if (child.type.name === CITATION_NOTE) {
        const citationText = defaultCitationText(
          this.buildCitationObject(child)
        );
        if (citationText) {
          citations.push({
            citationText,
            pos,
            refId: child.attrs.referenceId,
            citationId: child.attrs.citationId,
            objectId: this.view?.state?.tr?.doc?.nodeAt(pos)?.attrs?.objectId,
          });
        }
      }
    });
    citations.sort((a, b) => a.pos - b.pos);
    (this.dom as HTMLElement).innerText = '';
    citations.forEach((citation) => {
      const content = document.createElement('p');
      content.innerText = citation.citationText;
      content.setAttribute('refID', citation.refId);
      content.setAttribute('citationID', citation.citationId);
      content.setAttribute('citation-from', citation.objectId);
      this.dom.appendChild(content);
    });
    if (citations.length > 0) {
      this.lastAddedCitation = citations[citations.length - 1].citationText;
    }
  }

  destroy() {
    (this.dom as Element).remove();
  }
}
