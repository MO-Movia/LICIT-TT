import React from 'react';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { Attrs, Fragment, ResolvedPos } from '@tiptap/pm/model';
import { EditorState, NodeSelection, Transaction } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import { EditorView } from '@tiptap/pm/view';
import { CitationDialog } from './CitationDialog';
import {
  createPopUp,
  atViewportCenter,
} from '@modusoperandi/licit-ui-commands';
import type { PopUpHandle } from '@modusoperandi/licit-ui-commands';
import { AlertInfo } from './ui/AlertInfo';
import {
  MARK_TEXT_HIGHLIGHT,
  CITATION_NOTE,
  getNode,
  MODE,
  CapcoService,
  Marking,
} from './Constants';
import { defaultCitationText } from './CitationBuilder';
import {
  citationBuilder,
  AddCitationCommandOptions,
  CitableMaterial,
  Citation,
  CitationProps,
} from './Types';
import { toISOString } from './utils';

export class AddCitationCommand extends UICommand {
  citationPositions: number[] = [];
  citationText = '';
  from = '0';
  _popUp: PopUpHandle | null = null;
  _alertPopup: PopUpHandle | null = null;
  _color?: string;
  citation: Citation;
  public capcoService: CapcoService<Marking>;
  public citationBuilder: citationBuilder;
  public citableMaterial?: CitableMaterial[];

  constructor(opt?: AddCitationCommandOptions) {
    super();
    this._color = opt?.color;
    this.capcoService = opt?.capcoService;
    this.citationBuilder = opt?.citationBuilder ?? defaultCitationText;
    this.citableMaterial = opt?.citableMaterial;
  }
  isEnabled = (state: EditorState): boolean => {
    return this._isEnabled(state);
  };

  waitForUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    view?: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<unknown> => {
    if (this._popUp) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      this._popUp = createPopUp(
        CitationDialog,
        this.createCitationObject(MODE.new, view),
        {
          modal: true,
          IsChildDialog: false,
          autoDismiss: false,
          onClose: (val) => {
            if (this._popUp) {
              this._popUp = null;
              resolve(val);
            }
          },
        }
      );
    });
  };

  executeWithUserInput = (
    state: EditorState,
    dispatch: (tr: Transaction) => void | undefined,
    view: EditorView | undefined,
    citation: Citation
  ): boolean => {
    if (dispatch) {
      this.citation = citation; // Store the citation object
      const { selection } = state;
      let { tr } = state;
      tr = tr.setSelection(selection);
      if (citation && !this.hasCitationApplied(tr)) {
        // save the citation use object to node
        this.showAlert('Please Wait!!!', 'Please wait, updating server...');
        tr = this.saveCitationUseObject(state, tr, citation) as Transaction;
        if (view) {
          tr = this.createFootNoteForCitation(
            view,
            state,
            tr,
            citation
          ) as Transaction;
          dispatch(tr);
        }
      }

      view?.focus();
    }

    return false;
  };

  // [FS] IRAD-1379 2021-05-25
  // FIX: Validation to avoid citation more than on time for a text.
  hasCitationApplied(tr: Transaction): boolean {
    const { selection } = tr;
    const { from, to } = selection;
    for (let index = from; index < to; index++) {
      const node = tr.doc.nodeAt(index);
      if (
        node?.marks?.some(
          (m) => m?.type?.name === 'mark-text-highlight' && m.attrs?.hasCitation
        )
      ) {
        return true;
      }
    }
    return false;
  }

  // To show custom alert
  showAlert(title: string, content: string): void {
    const anchor = null;
    this._alertPopup = createPopUp(
      AlertInfo,
      {
        content: content,
        title: title,
      },
      {
        anchor,
        position: atViewportCenter,
        onClose: (_val) => {
          if (this._alertPopup) {
            this._alertPopup = null;
          }
        },
      }
    );
  }

  // [FS] IRAD-1340 2021-05-11
  // FIX: Disable Citation menu for Image
  _isEnabled = (state: EditorState): boolean => {
    const tr = state.tr;
    const { selection } = tr;
    return !(
      selection &&
      (selection as NodeSelection).node &&
      'image' === (selection as NodeSelection).node.type.name
    );
  };

  createCitationObject(mode: number, editorView?: EditorView): CitationProps {
    return {
      overallDocumentCapco: 'TBD',
      author: '',
      authorTitle: 'Author',
      referenceId: 'REF-1001',
      referenceType: '',
      publishedDate: '',
      publishedDateTitle: 'Published',
      icod: '',
      declassifyDateType: '',
      declassifyDate: '',
      declassifyPeriod: '25',
      documentTitleCapco: 'TBD',
      documentTitle: '',
      dateAccessed: toISOString(new Date()),
      hyperLink: '',
      overallCitationCAPCO: 'TBD',
      pageTitle: '',
      extractedInfoCAPCO: 'TBD',
      descriptionCAPCO: 'N/A',
      description: '',
      citableMaterial: this.citableMaterial,
      citationObjectRefId: '',
      pages: '',
      mode,
      editorView,
      isCitationObject: editorView ? editorView.state.selection.empty : 'true', // if text not selected, then citationObject else citationUseObject,
      capcoService: this.capcoService,
    } as CitationProps;
  }

  getParentNodeSize(state: EditorState): number {
    return state.selection.$head.parent.nodeSize - 2;
  }

  getParentStartPos(head: ResolvedPos): number {
    return head.pos - head.parentOffset;
  }

  createFootNoteForCitation(
    view: EditorView,
    state: EditorState,
    tr: Transform,
    citation: Citation
  ): Transform {
    if (view.state.selection.empty) {
      return tr;
    }

    const citationNote = state.schema.nodes[CITATION_NOTE];
    const newattrs = {
      ...Object.keys(citationNote['attrs']).reduce((acc, key) => {
        acc[key] = key in citation ? citation[key] : null;
        return acc;
      }, {}),
      ...citation,
      from: state.tr.selection.from,
      to: state.tr.selection.to,
    } as Attrs;
    const citationNoteNode = citationNote.create(null);

    this.showCitations(citation);

    const $head = state.selection.$head;
    const { sentenceEnd, listNodeAttr, listPos } =
      this.calculateEndOfSentenceAndListAttributes(state, $head);

    tr = tr.insert(sentenceEnd, Fragment.from(citationNoteNode));
    tr = tr.setNodeMarkup(sentenceEnd, undefined, newattrs);

    if (listNodeAttr) {
      tr = tr.setNodeMarkup(listPos, undefined, listNodeAttr);
    }

    return tr;
  }

  calculateEndOfSentenceAndListAttributes(
    state: EditorState,
    $head: ResolvedPos
  ) {
    const listAttributes = this.getListAttributes($head);
    const sentenceEnd = this.findEndOfSentence(state, $head);

    return { sentenceEnd, ...listAttributes };
  }

  getListAttributes($head: ResolvedPos) {
    let listNodeAttr = null;
    let listPos = 0;

    for (let d = $head.depth; d > 0; d--) {
      if (this.isList($head, d)) {
        listNodeAttr = { ...$head.node(d).attrs };
        listPos = $head['path'][d + 4];
        break;
      }
    }

    return { listNodeAttr, listPos };
  }

  findEndOfSentence(state: EditorState, $head: ResolvedPos) {
    const sentenceDelimiter = ['.', '!', '?'];
    let hasDelimiter = false;
    const selectionEnd = state.selection.to;
    const selectionStart = state.selection.from;
    let parentStart = 0;
    const selectionText = state.doc
      .textBetween(selectionStart, selectionEnd)
      .trimEnd();

    for (const char of selectionText) {
      if (sentenceDelimiter.includes(char)) {
        parentStart = selectionEnd - 1;
        hasDelimiter = true;
      } else {
        parentStart = selectionEnd;
      }
    }
    const parentText = state.doc.textBetween(
      parentStart,
      state.selection.$to.end()
    );

    for (let i = 0; i < parentText.length; i++) {
      const char = parentText[i];
      if (sentenceDelimiter.includes(char)) {
        if (hasDelimiter) {
          return selectionEnd + i;
        } else {
          return selectionEnd + i + 1;
        }
      }
    }

    const parentStartPos = this.getParentStartPos($head);
    const parentNodeSize = this.getParentNodeSize(state);
    return parentStartPos + parentNodeSize;
  }

  showCitations(citation: Citation) {
    this.citationText = this.citationBuilder(citation);
    this.from = citation.from;
  }

  isList($head: ResolvedPos, d: number) {
    return !!(
      $head.node(d).type.name === 'ordered_list' ||
      $head.node(d).type.name === 'bullet_list'
    );
  }

  // to save the citation use object in the node attribute
  saveCitationUseObject(
    state: EditorState,
    tr: Transform,
    citation: Citation
  ): Transform {
    if (!citation.isCitationObject) {
      const from = state.selection.$from.before();
      const to = state.selection.$to.end();
      const node = getNode(from, to, tr);
      if (node) {
        const newAttrs = {
          ...node.attrs,
          ...citation,
          id: '',
          indent: 0,
        } as Attrs;

        tr = tr.setNodeMarkup(from, undefined, newAttrs);
      }
    }
    return tr;
  }

  renderLabel() {
    return;
  }

  isActive(): boolean {
    return true;
  }

  cancel(): void {
    return;
  }

  executeCustom(_state: EditorState, tr: Transform): Transform {
    return tr;
  }

  executeCustomStyleForTable(_state: EditorState, tr: Transform): Transform {
    return tr;
  }
}

export function addTexthighlightMark(
  tr: Transform,
  state: EditorState,
  from: number,
  to: number
): Transform {
  const highLightMarkType = state.schema.marks['mark-text-highlight'];
  const attrs = {
    highlightColor: '#aed0e6',
    hasCitation: true,
    markFrom: from,
  };
  tr = tr.addMark(from, to, highLightMarkType.create(attrs));
  return tr;
}

export function removeTexthighlightMark(
  tr: Transform,
  state: EditorState,
  from: number,
  to: number
): Transform {
  const highLightMarkType = state.schema.marks[MARK_TEXT_HIGHLIGHT];
  tr = tr.removeMark(from, to, highLightMarkType);
  return tr;
}
export function ShowTexteHighLightMark(
  tr: Transform,
  state: EditorState,
  nodePos: number,
  hasCitation: boolean,
  appliedHighlightColor: string,
  citationNodeTo: number
): Transform {
  const attrs = {
    highlightColor: hasCitation ? appliedHighlightColor : '#aed0e6',
    hasCitation: hasCitation,
    markFrom: nodePos,
    appliedHighlight: appliedHighlightColor,
  };
  const highLightMarkType = state.schema.marks[MARK_TEXT_HIGHLIGHT];
  tr = tr.addMark(
    nodePos,
    Number(citationNodeTo),
    highLightMarkType.create(attrs)
  );
  return tr;
}
