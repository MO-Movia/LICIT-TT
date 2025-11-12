import {DOMSerializer, Node} from 'prosemirror-model';
import {Transaction} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import {
  createPopUp,
  PopUpHandle,
  atAnchorTopCenter,
} from '@modusoperandi/licit-ui-commands';
import {InfoIconSubMenu} from './InfoIconSubMenu';
import {INFO_ICON} from './constants';
import {InfoIconDialog} from './infoIconDialog';
import {findParentNodeOfTypeClosestToPos} from 'prosemirror-utils';

type CBFn = () => void;

export type Style = {
  styles?: {
    underline?;
    textHighlight?: string;
  };
};

export class InfoIconView {
  node: Node = null;
  outerView: EditorView = null;
  getPos = null;
  _popUp: PopUpHandle | null = null;
  _popUp_subMenu: PopUpHandle | null = null;
  dom: globalThis.Node = null;
  offsetLeft: Element;
  nodePosition = 0;
  constructor(node: Node, view: EditorView, getPos: CBFn) {
    // We'll need these later
    this.node = node;
    this.outerView = view;
    this.getPos = getPos;
    const spec = DOMSerializer.renderSpec(
      document,
      this.node.type.spec.toDOM(this.node)
    );
    this.dom = spec.dom;
    (this.dom as Element).className = INFO_ICON;

    this.addEventListenerToView();
    this.showInfoIcon();
  }

  showSourceText(e: MouseEvent): void {
    if ((this.dom as Element).classList) {
      this.open(e);
    }
  }

  getNodePosEx(left: number, top: number): number {
    const objPos = this.outerView.posAtCoords({left, top});
    return objPos ? objPos.pos : null;
  }

  addEventListenerToView(): void {
    this.dom.addEventListener('mouseover', this.showSourceText.bind(this));
    this.dom.addEventListener('mouseout', this.hideSourceText.bind(this));
    this.dom.addEventListener('keypress', this.hideSourceText.bind(this));
    this.dom.addEventListener('click', this.selectNode.bind(this));
  }
  removeEventListenerToView(): void {
    this.dom.removeEventListener('mouseover', this.showSourceText.bind(this));
    this.dom.removeEventListener('mouseout', this.hideSourceText.bind(this));
    this.dom.removeEventListener('click', this.selectNode.bind(this));
  }

  hideSourceText(_e: MouseEvent): void {
    const target = _e.relatedTarget as HTMLInputElement;
    const close = !(
      target?.className == 'infoicon' ||
      target?.className == 'ProseMirror molcit-infoicon-tooltip-content' ||
      (target?.className == '' &&
        target?.offsetParent?.className ==
          'ProseMirror molcit-infoicon-tooltip-content') ||
      target?.className == 'fa'
    );
    if (close) {
      this.close();
    }
  }

  selectNode(e: MouseEvent): void {
    if (undefined === e) {
      return;
    }
    this.destroyPopup();
    const target = e?.target as HTMLInputElement;
    if (target?.className !== 'fa') return;

    let anchorEl = this.dom;
    if (e?.currentTarget) {
      anchorEl = e.currentTarget as globalThis.Node;
    }
    if (!anchorEl) {
      this.destroyPopup();
      return;
    }
    this.nodePosition = this.getNodePosition(e);
    const popup = this._popUp_subMenu;
    if(popup){
      popup.close('');
    }
    const viewPops = {
      editorState: this.outerView.state,
      editorView: this.outerView,

      onCancel: this.onCancel,
      onEdit: this.onEditInfo,
      onRemove: this.onInfoRemove,
      onMouseOut: this.onInfoSubMenuMouseOut,
    };
    this._popUp_subMenu = createPopUp(InfoIconSubMenu, viewPops, {
      anchor: anchorEl,
      autoDismiss: false,
      onClose: this._onClose,
      position: atAnchorTopCenter,
    });
  }
  isPNodeNull(pNode) {
     return pNode === null;
  }

  parentNodeType(pNode) {
    return pNode && pNode.type.name === INFO_ICON;
  }

  getNodePosition(e: MouseEvent) {
    let clientY = 0;
    clientY = e.clientY;

    if (e.offsetY < 1) {
      clientY = clientY + Math.abs(e.offsetY);
    }

    const pos = this.getNodePosEx(e.clientX, clientY);
    let parentNode = this.outerView.state.tr.doc.nodeAt(pos);
    let themarkPos = pos;
    if (parentNode && parentNode.type.name !== INFO_ICON) {
      const resp = this.outerView.state.tr.doc.resolve(pos);
      const nodeAtPos = findParentNodeOfTypeClosestToPos(
        resp,
        this.outerView.state.schema.nodes[INFO_ICON]
      );
      parentNode = nodeAtPos?.node;
      themarkPos = nodeAtPos?.pos;
    }
    if (this.isPNodeNull(parentNode)) {
      for (let index = pos; index > 0; index--) {
        parentNode = this.outerView.state.tr.doc.nodeAt(index);

        if (this.parentNodeType(parentNode)) {
          const newRes = this.outerView.state.tr.doc.resolve(index);
          themarkPos = newRes.pos;
          break;
        }
      }
    }
    return themarkPos;
  }

  _onClose = (): void => {
    this._popUp_subMenu = null;
  };

  onCancel = (view: EditorView): void => {
    this.destroyPopup();
    view.focus();
  };

  destroyPopup(): void {
    if (this._popUp) {
      this._popUp.close('');
    }
    if (this._popUp_subMenu) {
      this._popUp_subMenu.close('');
    }
    if (this._popUp_subMenu === null) {
      const subMenu = document.getElementsByClassName('molcit-infoicon-submenu');
      if (subMenu.length > 0) {
        subMenu[0].remove();
      }
    }
  }

  onInfoSubMenuMouseOut = (): void => {
    this.destroyPopup();
  };

  onEditInfo = (view: EditorView): void => {
    if(this._popUp_subMenu){
      this._popUp_subMenu.close('');
    }

    this._popUp = createPopUp(InfoIconDialog, this.createInfoObject(view, 2), {
      modal: true,
      IsChildDialog: false,
      autoDismiss: false,
      onClose: (val) => {
        if (this._popUp) {
          this._popUp = null;
          if (undefined !== val) {
            this.updateInfoIcon(view, val);
          }
        }
      },
    });
  };

  createInfoObject(editorView: EditorView, mode: number) {
    return {
      infoIcon: this.node.attrs.infoIcon,
      description: this.node.attrs.description,
      mode: mode, //0 = new , 1- modify, 2- delete
      editorView: editorView,
      from: this.node.attrs.from,
      to: this.node.attrs.to,
    };
  }

  updateInfoIcon(view: EditorView, infoicon): void {
    if (view.dispatch) {
      const {selection} = view.state;
      let {tr} = view.state;
      tr = tr.setSelection(selection);
      tr = this.updateInfoObject(tr, infoicon) as Transaction;
      view.dispatch(tr);
    }
  }

  updateInfoObject(tr: Transform, infoIcon): Transform {
    if (infoIcon) {
      const newattrs = {};
      Object.assign(newattrs, this.node.attrs);
      const div = document.createElement('div');
      const fragm = DOMSerializer.fromSchema(
        infoIcon.editorView?.state?.schema
      ).serializeFragment(infoIcon.editorView?.state?.doc?.content);
      div.appendChild(fragm);
      const desc = div.innerHTML;
      newattrs['description'] = desc;
      newattrs['infoIcon'] = infoIcon.infoIcon;
      if (this.isInfoIconNode(this.outerView.state.selection.$head.pos)) {
        tr = tr.setNodeMarkup(
          this.outerView.state.selection.$head.pos,
          undefined,
          newattrs
        );
      } else {
        tr = tr.setNodeMarkup(this.nodePosition, undefined, newattrs);
      }
    }
    return tr;
  }

  isInfoIconNode(position: number) {
    const node = this.outerView.state.doc.nodeAt(position);
    if (node) {
      return 'infoicon' === node.type.name;
    }
    return false;
  }

  onInfoRemove = (view: EditorView): void => {
    const {tr} = view.state;
    if (view.state.selection.$head.nodeBefore?.type.name === 'infoicon') {
      const from = view.state.selection.$head.pos - 2;
      tr.delete(from, from + 2);
    } else {
      const from = view.state.selection.$head.pos;
      tr.delete(from, from + 2);
    }
    view.dispatch(tr);
  };

  showInfoIcon() {
    if (this.node.attrs.infoIcon) {
      const iconSuperScript = this.dom.appendChild(
        document.createElement('sup')
      );
      const iconSpan = iconSuperScript.appendChild(
        document.createElement('span')
      );
      iconSpan.innerHTML = this.node.attrs.infoIcon?.unicode;
      iconSpan.className = 'fa';
      iconSpan.style.fontFamily = 'FontAwesome';
    }
  }

  open(e: MouseEvent): void {
    // Append a tooltip to the outer node
    // get the editor div
    const tooltipIsExisit = document.getElementsByClassName(
      'molcit-infoicon-tooltip'
    );
    if (tooltipIsExisit.length === 0) {
      const parent = document.getElementsByClassName(
        'ProseMirror czi-prosemirror-editor'
      )[0];
      const tooltip = this.dom.appendChild(document.createElement('div'));
      tooltip.className = 'molcit-infoicon-tooltip';
      const ttContent = tooltip.appendChild(document.createElement('div'));
      ttContent.innerHTML = this.node.attrs.description;
      ttContent.className = 'ProseMirror molcit-infoicon-tooltip-content';
      ttContent.id = 'tooltip-content';
      this.setContentRight(e, parent, tooltip, ttContent);
      if (
        window.screen.availHeight - e.clientY < 170 &&
        ttContent.style.right
      ) {
        ttContent.style.bottom = '114px';
      }
      const toolContent = document.getElementById('tooltip-content');
      const links = toolContent?.getElementsByTagName('a');
      if (links) {
        for (const link of links) {
          const href = link.href;
          link.setAttribute('href', href);
          link.setAttribute('target', '_blank');
        }
      }
    }
  }

  setContentRight(e, parent, tooltip, _ttContent) {
    // Append a tooltip to the outer node

    // const MAX_CLIENT_WIDTH = 1100;
    //fix [25-04-2023]
    const MAX_CLIENT_WIDTH = parent?.clientWidth;

    const leftPanelWidth = (
      document.getElementsByTagName('maw-left-panel')[0] as HTMLElement
    )?.offsetWidth;
    const toolAndPosWidth = e.clientX - leftPanelWidth + tooltip.clientWidth;
    if (parent) {
      if (toolAndPosWidth > MAX_CLIENT_WIDTH) {
        // const right = toolAndPosWidth - MAX_CLIENT_WIDTH;
        // ttContent.style.right = right + 'px';
        //fix [25-04-2023]
        tooltip.style.right = 0 + 'px';
      }
    }
  }

  close(): void {
    const tooltip = document.getElementsByClassName('molcit-infoicon-tooltip');
    if (tooltip.length > 0) {
      tooltip[0].remove();
    }
  }

  update(node: Node): boolean {
    if (!node.sameMarkup(this.node)) return false;
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
