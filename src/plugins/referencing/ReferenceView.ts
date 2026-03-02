/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { DOMSerializer, Fragment, Node } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';
import { HamBurgerIcon, HamBurgerIconProps } from './Dropdown';
import {
  createPopUp,
  PopUpHandle,
  atAnchorTopCenter,
} from '@modusoperandi/licit-ui-commands';
import { getFragment } from './Types';

// There should only be one copy of this popup anywhere.
let _popUp_subMenu: PopUpHandle | undefined;

export class ReferenceView implements NodeView {
  readonly dom: HTMLElement;

  constructor(
    private node: Node,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
    readonly getFragment?: getFragment
  ) {
    this.dom = DOMSerializer.fromSchema(view.state.schema).serializeNode(
      this.node
    ) as HTMLElement;
    this.dom.contentEditable = 'false';
    this.dom.innerText = 'Loading...';
    this.dom.addEventListener('mouseover', (e) => {
      // Differentiating the DD mode from the normal referencing
      if (this.isAnalyticsInstanceVirtual(view)) {
        this.showIcon(e);
      }
      this.openTooltip(view);
    });
    this.dom.addEventListener('mouseout', (e) => {
      if (this.isAnalyticsInstanceVirtual(view)) {
        this.hideIcon(e);
      }
      this.hideSourceText(e);
    });
    let loading = false;
    const obs = new IntersectionObserver(
      (entities) => {
        if (loading || !entities?.some?.((e) => e?.isIntersecting)) {
          return;
        }
        loading = true;
        getFragment?.(this.node.attrs.id)
          ?.then((r) => this.loadContent(r))
          ?.catch((e) => {
            this.dom.innerText = 'Failed to load: ' + (e?.message ?? e);
            loading = false;
          });
      },
      {
        threshold: 0.1,
      }
    );
    obs.observe(this.dom);
  }

  loadContent(json: globalThis.Node | Fragment | string) {
    if (this.node.content?.size) {
      return undefined; // static content already loaded
    }
    if (!(json instanceof globalThis.Node)) {
      if (typeof json === 'string') {
        json = JSON.parse(json);
      }
      // Fragment.fromJSON actually expects either an array of objects or a falsy value
      json = Fragment.fromJSON(this.view.state.schema, json);
      json = DOMSerializer.fromSchema(this.view.state.schema).serializeFragment(
        json
      );
    }
    this.dom.innerText = '';
    for (const n of this.dom.childNodes) {
      n.remove();
    }
    this.dom.appendChild(json);
    return json;
  }

  hideSourceText(e: Event): void {
    if (!(e instanceof MouseEvent)) {
      return;
    }
    const parent = this.dom;
    const tooltip = parent.querySelector('.molcit-reference-tooltip');
    const target = e.relatedTarget as HTMLInputElement;
    const close = ![
      'ref-background',
      'tt-content',
      'molcit-reference-tooltip',
    ].includes(target?.className);
    if (tooltip && close) {
      tooltip.remove();
    }
  }

  openTooltip(view: EditorView): void {
    const tooltipContent = view.state.doc.attrs.objectId?.includes(
      '/analytics/instance/virtual'
    )
      ? 'Dynamic material from document: '
      : 'Reference material from document: ';
    const check = this.dom.querySelector('span.molcit-reference-tooltip');
    if (check) {
      return;
    }

    const tooltip = this.dom.appendChild(document.createElement('span'));
    tooltip.className = 'molcit-reference-tooltip';

    const ttContent = document.createElement('a');
    ttContent.innerText =
      tooltipContent + (this.node.attrs.docLabel ?? this.node.attrs.docId);
    ttContent.className = 'tt-content';
    ttContent.id = 'tooltip-content';
    ttContent.href = '#';

    ttContent.addEventListener('click', (e) => {
      e.preventDefault();
      this.goToRef();
    });

    tooltip.appendChild(ttContent);
    tooltip.style.top = `${this.dom.offsetTop - 29}px`;
    tooltip.style.left = `${(this.dom.offsetWidth - 100) / 2}px`;
  }

  showIcon(e: Event): void {
    const target = e?.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const check = this.dom.querySelector('span.ref-icon');
    if (check instanceof HTMLElement) {
      const iconSpan = check;
      iconSpan.classList.remove('mo-licit-referencing-hidden');
      iconSpan.classList.add('mo-licit-referencing-show');
      iconSpan.style.top = `${target.offsetTop - 2}px`;
      iconSpan.style.right = `${target.offsetLeft}px`;
    } else {
      const iconSpan = this.dom.appendChild(document.createElement('span'));
      iconSpan.className = 'ref-icon fa fa-bars';
      iconSpan.style.fontFamily = 'FontAwesome';
      iconSpan.style.top = `${target.offsetTop - 2}px`;
      iconSpan.style.right = `${target.offsetLeft}px`;
      iconSpan.addEventListener('click', this.menu.bind(this));
    }
  }

  menu(e: MouseEvent) {
    if (!e) {
      return;
    }
    const anchorEl = (e.currentTarget as globalThis.Node) ?? this.dom;
    this.destroyPopup();
    const viewPops: HamBurgerIconProps = {
      onMouseOut: this.destroyPopup,
      options: [
        { label: 'Go to doc', command: () => this.goToRef() },
        { label: 'Delete', command: () => this.delete() },
      ],
    };
    _popUp_subMenu = createPopUp(HamBurgerIcon, viewPops, {
      anchor: anchorEl,
      autoDismiss: false,
      position: atAnchorTopCenter,
    });
  }

  hideIcon(e: Event): void {
    const target = (e as MouseEvent)?.relatedTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const parent = this.dom;
    const iconSpan = parent.querySelector('.ref-icon');
    const close = !(
      target?.className === 'popup-container' ||
      target?.className === 'dropdown-content'
    );
    if (iconSpan && close) {
      iconSpan.classList.remove('mo-licit-referencing-show');
      iconSpan.classList.add('mo-licit-referencing-hidden');
    }
  }

  isAnalyticsInstanceVirtual(view: EditorView) {
    return !view.state.doc.attrs.objectId?.includes(
      '/analytics/instance/virtual'
    );
  }

  destroyPopup(): void {
    _popUp_subMenu?.close('');
    _popUp_subMenu = undefined;
  }

  delete(): void {
    const position = this.getPos?.();
    if (typeof position !== 'number') {
      return;
    }
    const nodeSize = this.node.nodeSize;
    const tr = this.view.state.tr.delete(position, position + nodeSize);
    this.view.dispatch(tr);
  }

  goToRef = () => {
    const docId = encodeURIComponent(this.node.attrs.docId);
    const scrollId = encodeURIComponent(this.node.attrs.scrollId);
    const fullurl = `/knite/document/${docId}?artifactId=${scrollId}`;
    window.open(fullurl, '_blank')?.focus();
  };

  update(node: Node): boolean {
    if (!node?.sameMarkup(this.node)) {
      return false;
    }
    this.node = node;
    return true;
  }

  stopEvent() {
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }
}
