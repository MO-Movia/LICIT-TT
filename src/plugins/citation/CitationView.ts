import { Transform } from 'prosemirror-transform';
import { DOMSerializer, Node, Mark, Attrs } from 'prosemirror-model';
import { EditorView, Decoration } from 'prosemirror-view';
import { Transaction, Selection } from 'prosemirror-state';
import { findParentNodeOfTypeClosestToPos } from 'prosemirror-utils';
import {
  createPopUp,
  atAnchorTopCenter,
} from '@modusoperandi/licit-ui-commands';
import type { PopUpHandle } from '@modusoperandi/licit-ui-commands';
import { CitationRuntime } from './CitationRuntime';
import {
  MARK_UNDERLINE,
  MARK_TEXT_HIGHLIGHT,
  CITATION_NOTE,
  PARAGRAPH,
  HIGHLIGHTDECO,
  CapcoService,
  Marking,
} from './Constants';
import {
  CitationDialog,
  CitationDialogProps,
  CitationDialogState,
} from './CitationDialog';
import { CitationSubMenu } from './CitationSubMenu';
import { citationBuilder, CitableMaterial, Citation } from './Types';
import { defaultCitationText } from './CitationBuilder';

type CBFn = () => void;

export type Style = {
  styles?: {
    underline?: string;
    textHighlight?: string; // Text highlight
  };
};

export class CitationView {
  node?: Node;
  outerView?: EditorView;
  getPos?: CBFn;
  _popUp?: PopUpHandle;
  _popUp_subMenu?: PopUpHandle;
  dom?: globalThis.Node;
  offsetLeft?: Element;
  constructor(
    node: Node,
    view: EditorView,
    getPos: CBFn,
    private readonly capcoService: CapcoService<Marking>,
    private readonly citationBuilder?: citationBuilder,
    private readonly citableMaterial?: CitableMaterial[]
  ) {
    // We'll need these later
    this.node = node;
    this.outerView = view;
    this.getPos = getPos;

    // Use PM DomSerializer to create element so that attributes including dataset are properly created.
    const spec = DOMSerializer.renderSpec(
      document,
      this.node.type.spec.toDOM(this.node)
    );
    this.dom = spec.dom;
    (this.dom as Element).className = CITATION_NOTE;
    // show citation source text on hover the citation numbering
    this.addEventListenerToView();
    // These are used when the citationnote is selected
  }

  // to underline and highlight the selected text for citation on hover
  showSourceText(e: MouseEvent): void {
    if (!(this.dom as Element).classList) {
      return;
    }
    this.open(e);
    // To adjust the mouse postion on mouse hover from top to bottom
    const clientY = this.adjustClientY(e);

    // end
    // To get the node position from  mouse postion

    const pos = this.getNodePosEx(e.clientX, clientY);
    const doc = this.outerView?.state.tr.doc;
    // get the parent node here paragraph node from citation applied node
    if (!pos || !doc) {
      return;
    }
    let themarkPos: number | undefined = 0;
    let parentNode = this.outerView?.state.tr.doc.nodeAt(pos); // parent node is not paragraph take the closest node from current position

    if (parentNode && parentNode.type.name !== PARAGRAPH) {
      const resp = doc.resolve(pos);
      const nodeAtPos = findParentNodeOfTypeClosestToPos(
        resp,
        this.outerView?.state.schema.nodes[PARAGRAPH] ?? []
      );
      parentNode = nodeAtPos?.node;
      themarkPos = nodeAtPos?.pos;
    } // if we didnt get the parent node position from above,
    // Iterating the node backword until we get a paragraph node which have citation

    if (parentNode === null) {
      for (let index = pos; index > 0; index--) {
        parentNode = doc.nodeAt(index);

        if (parentNode && this.parentNodeType(parentNode)) {
          const newRes = doc.resolve(index);
          parentNode = newRes.parent;
          themarkPos = newRes.pos;
          break;
        }
      }
    }

    if (parentNode) {
      this.updateMarks(false, parentNode, this.getFromValue(e), themarkPos);
    }
  }

  adjustClientY(e) {
    let clientY: number = e.clientY;
    if (e.offsetY < 1) {
      clientY += Math.abs(e.offsetY);
    }
    return clientY;
  }

  parentNodeType(pNode: Node): boolean {
    return pNode && pNode.type.name === CITATION_NOTE;
  }

  getFromValue(e: MouseEvent): number {
    return Number(
      (e?.currentTarget as Element)?.attributes?.getNamedItem('from')?.value
    );
  }

  getNodePosEx(left: number, top: number): number {
    const objPos = this.outerView.posAtCoords({ left, top });
    return objPos ? objPos.pos : null;
  }

  updateMarks(
    hasCitation: boolean,
    parentNode: Node,
    selectedMarkPos: number,
    markPos: number
  ): void {
    const citationNode: { pos: number; attrs: Attrs }[] = [];
    if (parentNode) {
      const tr = this.outerView?.state.tr;
      parentNode.descendants((child, pos, _parent) => {
        if (child.type.name === CITATION_NOTE) {
          citationNode.push({
            pos: pos + markPos,
            attrs: child.attrs,
          });
        }
      });
      if (citationNode.length > 0) {
        const MARK_TEXT_HIGHLIGHT_COLOR = hasCitation ? '' : '#aed0e6';
        citationNode.forEach((cit) => {
          // to check the mouse is over correct citation if a paragraph have multiple citation
          // Copy and paste CITATION applied paragraph, CITATION highlight not showing
          if (selectedMarkPos === Number(cit.attrs.from)) {
            // Citation text not highlighting when apply custom style
            tr?.setMeta(
              HIGHLIGHTDECO,
              Decoration.inline(cit.attrs.from, cit.attrs.to, {
                style: `background-color: ${MARK_TEXT_HIGHLIGHT_COLOR};`,
              })
            );
          }
        });
        this.scrollAction(tr);
      }
    }
  }

  scrollAction(tr) {
    if (tr) {
      this.outerView?.dispatch(tr.scrollIntoView());
    }
  }

  addEventListenerToView(): void {
    this.dom?.addEventListener('mouseover', this.showSourceText.bind(this));
    this.dom?.addEventListener('mouseout', this.hideSourceText.bind(this));
    this.dom?.addEventListener('keypress', this.hideSourceText.bind(this));
    this.dom?.addEventListener('click', this.selectNode.bind(this));
  }

  removeEventListenerToView(): void {
    this.dom?.removeEventListener('mouseover', this.showSourceText.bind(this));
    this.dom?.removeEventListener('mouseout', this.hideSourceText.bind(this));
    this.dom?.removeEventListener('click', this.selectNode.bind(this));
  }

  hideSourceText(e: MouseEvent): void {
    this.close();
    let newPos: number = null;

    newPos = this.calculateNewPosOrSelectionPos(e);

    // To adjust the mouse postion on mouse hover from top to bottom and viceversa

    let parentNode: Node;

    if (null !== newPos) {
      let themarkPos = 0;
      parentNode = this.outerView?.state.tr.doc.nodeAt(newPos);

      if (parentNode && parentNode.type.name !== PARAGRAPH) {
        const resp = this.outerView?.state.tr.doc.resolve(newPos);
        const nodeAtPos = findParentNodeOfTypeClosestToPos(
          resp,
          this.outerView?.state.schema.nodes[PARAGRAPH]
        );
        parentNode = nodeAtPos.node;
        themarkPos = nodeAtPos.pos;
        newPos = resp.pos;
      }

      if (parentNode === null) {
        for (let index = newPos ?? 0; index > 0; index--) {
          parentNode = this.outerView?.state.tr.doc.nodeAt(index);

          if (this.parentNodeType(parentNode)) {
            const newRes = this.outerView?.state.tr.doc.resolve(index);
            parentNode = newRes.parent;
            themarkPos = newRes.pos - newRes.parentOffset - 1;
            break;
          }
        }
      }
      this.updateNode(parentNode, themarkPos, e);
    }

    // prevent hiding the edit menu

    this.handlePopUpSubMenu(e, this.outerView);
  }

  calculateNewPosOrSelectionPos(e) {
    if (null === e) {
      return this.outerView?.state.selection.$head.pos;
    } else {
      const nodePos = this.calculateNewPos(e);
      return nodePos ?? null;
    }
  }

  handlePopUpSubMenu(e, outerView) {
    let _dom;
    if (
      this._popUp_subMenu ||
      (e?.target as HTMLElement).className === 'molcit-citation-submenu-body'
    ) {
      _dom = outerView.domAtPos(outerView.state.selection.from + 1).node;
      this.selectNode(_dom);
    }
  }

  calculateNewPos(e) {
    let xToadd = 0;
    let yToadd = 0;

    xToadd = e.offsetX < 0 ? Math.abs(e.offsetX) : 0;

    yToadd = e.offsetY < 0 ? Math.abs(e.offsetY) : 0;

    if (e.offsetY > 0 && e.offsetX < 10) {
      yToadd = -e.offsetX;
    } // end

    return this.getNodePosEx(e.clientX + xToadd, e.clientY + yToadd);
  }

  updateNode(parentNode, themarkPos, e) {
    if (parentNode) {
      this.updateMarks(true, parentNode, this.getFromValue(e), themarkPos);
    }
  }

  getAppliedHighlightCustomStyle(from: number, eachMark: Mark): string {
    const parent = this.outerView?.state.tr.doc.resolve(from).parent;
    let appliedHighlightcolor = 'transparent';
    if (parent?.attrs.styleName && 'None' !== parent.attrs.styleName) {
      appliedHighlightcolor = eachMark.attrs.highlightColor;
    }
    return appliedHighlightcolor;
  }

  // Removes the text highlight and text underline of citation applied text
  removeCitationMark(tr: Transform, from: number, to: number): Transform {
    const markType = this.outerView?.state.schema.marks[MARK_UNDERLINE];
    const highLightMarkType =
      this.outerView?.state.schema.marks[MARK_TEXT_HIGHLIGHT];
    const style = this.getAppliedCustomStyle(from);
    // if the parent has custom style
    if (style?.styles) {
      // underline marks shall not be removed if the node has underline style
      if (
        undefined === style.styles.underline ||
        '' === style.styles.underline
      ) {
        tr = tr.removeMark(from, to, markType);
      }
      // appply custom style text highlight color if the node has textHighlight style
      if (style.styles.textHighlight && '' !== style.styles.textHighlight) {
        const attrs = {
          highlightColor: style.styles.textHighlight,
        };
        tr = tr.addMark(from, to, highLightMarkType.create(attrs));
      } else {
        tr = tr.removeMark(from, to, highLightMarkType);
      }
    } else {
      // if custom style is not applied
      tr = tr.removeMark(from, to, markType);
      tr = tr.removeMark(from, to, highLightMarkType);
    }
    return tr;
  }

  // fetch  Applied Custom Style from the parent Node
  getAppliedCustomStyle(from: number): Style {
    let parentNode = this.outerView?.state.selection.$anchor.parent;
    if (from) {
      parentNode = this.outerView?.state.tr.doc.resolve(from).parent;
    }
    if (CITATION_NOTE === parentNode.type.name) {
      parentNode = this.outerView?.state.tr.doc.nodeAt(
        this.outerView.state.tr.selection.$from.before()
      );
    }
    let style: Style = null;
    if (
      'Normal' !== parentNode.attrs.styleName &&
      this.outerView['runtime'] &&
      typeof this.outerView['runtime']?.getStylesAsync === 'function'
    ) {
      this.outerView['runtime']?.getStylesAsync()?.then((result) => {
        style = result.find((s) => s.styleName === parentNode.attrs.styleName);
      });
    }
    return style;
  }

  selectNode(e: MouseEvent): void {
    // to show the sub menu popup to Edit, delte and go to the link for citation.
    if (undefined === e) {
      return;
    }
    let anchorEl = this.dom;
    if (e?.currentTarget) {
      anchorEl = e.currentTarget as globalThis.Node;
    }
    if (!anchorEl) {
      this.destroyPopup();
      return;
    }
    const popup = this._popUp_subMenu;
    this.createCitationObjFromNode(this.node.attrs);
    const viewPops = {
      editorState: this.outerView.state,
      editorView: this.outerView,
      href: this.node.attrs ? this.node.attrs.hyperLink : '',

      onCancel: this.onCancel,
      onEdit: this.onEditCitation,
      onRemove: this.onRemoveCitation,
      onMouseOut: this.onCitationMouseOut,
    };
    popup?.close('');
    this._popUp_subMenu = createPopUp(CitationSubMenu, viewPops, {
      anchor: anchorEl,
      autoDismiss: false,
      onClose: this._onClose,
      position: atAnchorTopCenter,
    });
  }

  _onClose = (): void => {
    this._popUp_subMenu = undefined;
  };

  onCancel = (view: EditorView): void => {
    this.destroyPopup();
    view.focus();
  };

  createCitationObjFromNode(Nodeattrs: {
    [k: string]: string;
  }): CitationDialogProps {
    return {
      ...(Nodeattrs as unknown as CitationDialogProps),
    };
  }

  async getCitationByRefID(referenceId: string): Promise<Citation> {
    const runtime = new CitationRuntime();
    return runtime.fetchCitationsByRefId?.(referenceId);
  }

  createCitationObject(): CitationDialogProps {
    return {
      ...this.node.attrs,
      buildSourceText: this.citationBuilder ?? defaultCitationText,
      citableMaterial: this.citableMaterial,
      capcoService: this.capcoService,
    } as CitationDialogState;
  }

  onEditCitation = (view: EditorView): void => {
    this._popUp_subMenu?.close('');
    this._popUp = createPopUp(CitationDialog, this.createCitationObject(), {
      modal: true,
      IsChildDialog: false,
      autoDismiss: false,
      onClose: (val: Citation) => {
        if (this._popUp) {
          this._popUp = undefined;
          if (undefined !== val) {
            this.updateCitation(view, val);
          }
        }
      },
    });
  };

  getNameAfter(selection: Selection): string | undefined {
    return selection.$head?.nodeAfter?.type.name;
  }

  // delete citation from a paragraph
  onRemoveCitation = (view: EditorView): void => {
    const { state } = view;
    let { tr } = state;
    const { selection } = tr;

    if (CITATION_NOTE === this.getNameAfter(selection)) {
      tr = this.removeCitationMark(
        tr,
        selection.$head.nodeAfter?.attrs.from,
        selection.$head.nodeAfter?.attrs.to
      ) as Transaction;
      tr = tr.delete(selection.$head.pos, selection.$head.pos + 2);
      const parentPos = selection.$head.pos - selection.$head.parentOffset - 1;
      const parentNode = selection.$head.parent;
      if (parentNode) {
        const newattrs = {};
        Object.assign(newattrs, parentNode.attrs);
        newattrs['citationUseObject'] = null;
        tr = tr.setNodeMarkup(parentPos, undefined, newattrs);
      }
      view.dispatch(tr);
    }
  };

  onCitationMouseOut = (): void => {
    this.destroyPopup();
  };

  // Edit citation from a paragraph
  updateCitation(view: EditorView, citation: Citation): void {
    if (view.dispatch) {
      const runtime = new CitationRuntime();
      const { selection } = view.state;
      let { tr } = view.state;
      tr = tr.setSelection(selection);
      if (citation) {
        tr = this.updateCitationObjectInCitationNote(
          tr,
          citation
        ) as Transaction;
        view.dispatch(tr);
        // save the citation use object to node
        if (typeof runtime.saveCitation === 'function') {
          runtime.saveCitation(citation).catch((e) => console.error(e));
        }
      }
    }
  }

  updateCitationObjectInCitationNote(
    tr: Transform,
    citation: Citation
  ): Transform {
    const newattrs = {
      ...this.node?.attrs,
      ...citation,
    };

    // removed view getpos(), it returns undefined in some scenario
    // took the position from state
    tr = tr.setNodeMarkup(
      this.outerView?.state.selection.from,
      undefined,
      newattrs
    );
    return tr;
  }

  destroyPopup(): void {
    this._popUp?.close('');
    this._popUp_subMenu?.close('');
  }

  open(e: MouseEvent): void {
    // Append a tooltip to the outer node
    // get the editor div
    const parent = document.getElementsByClassName(
      'ProseMirror czi-prosemirror-editor'
    )[0];
    const tooltip = this.dom.appendChild(document.createElement('div'));
    tooltip.className = 'molcit-citationnote-tooltip';
    const ttContent = tooltip.appendChild(document.createElement('div'));
    const builder = this.citationBuilder ?? defaultCitationText;
    const citationText = builder(this.node.attrs);
    ttContent.appendChild(document.createTextNode(citationText));
    ttContent.className = 'ProseMirror molcit-citation-tooltip-content';

    this.setContentRight(e, parent, tooltip, ttContent);

    if (window.screen.availHeight - e.clientY < 170 && ttContent.style.right) {
      ttContent.style.bottom = '114px';
    }
  }

  setContentRight(
    e: MouseEvent,
    parent: Element,
    tooltip: HTMLDivElement,
    ttContent: HTMLDivElement
  ) {
    // Append a tooltip to the outer node
    const MAX_CLIENT_WIDTH = 975;
    const RIGHT_MARGIN_ADJ = 50;
    const POSITION_ADJ = -110;

    if (parent) {
      const width_diff = e.clientX - parent.clientWidth;
      const counter = e.clientX > MAX_CLIENT_WIDTH ? RIGHT_MARGIN_ADJ : 0;
      if (width_diff > POSITION_ADJ && width_diff < tooltip.clientWidth) {
        ttContent.style.right =
          (parent as HTMLElement).offsetLeft + counter + 'px';
      }
    }
  }

  close(): void {
    if (this.dom) {
      this.dom.textContent = '';
    }
  }

  update(node: Node): boolean {
    if (!this.node?.sameMarkup(node)) {
      return false;
    }
    this.node = node;
    return true;
  }
  destroy(): void {
    this.removeEventListenerToView();
    this.close();
  }

  stopEvent(_event: Event): boolean {
    return false;
  }

  ignoreMutation(): boolean {
    return true;
  }
}
