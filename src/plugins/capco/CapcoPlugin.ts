/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {
  Schema,
  Slice,
  ResolvedPos,
  Node,
  Attrs,
  Node as PMNode,
} from 'prosemirror-model';
import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { CAPCOMODE, effectiveSchema, SYSTEMCAPCO } from './editorSchema';
import {
  CAPCOKEY,
  CAPCO_PLUGIN_KEY,
  PARAGRAPH,
  TABLE,
  TABLE_FIGURE,
  TABLE_FIGURE_CAPCO,
} from './constants';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { CapcoContextMenu } from './capcoContextMenu';
import { findParentNodeOfTypeClosestToPos } from 'prosemirror-utils';
import {
  createPopUp,
  atViewportCenter,
} from '@modusoperandi/licit-ui-commands';
import { CapcoView } from './capcoView';
import { CAPCO, CapcoRuntime } from './types';
import { getBlockControlCapco, getCapcoString } from './utils';

const NONE = 'none';
const DEFAULT_ALLOWED_NODE_TYPES = [PARAGRAPH, TABLE_FIGURE_CAPCO];
type NumType = {
  value: number;
};

type PendingItem = { pos: number; attrs: Attrs; node?: Node };

type CapcoPluginState = {
  decorations: DecorationSet;
};

// Plugin which is used in editor
export class CapcoPlugin extends Plugin<CapcoPluginState> {
  _popUp = null;
  cMenu: CapcoContextMenu;
  pendingItems: Array<PendingItem> = [];
  mode: CAPCOMODE;
  defaultCapco: string;

  constructor(mode?: CAPCOMODE, defaultCapco?: string, runtime?: CapcoRuntime) {
    super({
      key: CAPCO_PLUGIN_KEY,
      state: {
        init(_config, state) {
          return {
            runtime,
            decorations: (this as CapcoPlugin).getDecorations(state),
          };
        },
        apply(tr, state, _oldState, newState) {
          return {
            ...state,
            decorations: tr.docChanged
              ? (this as CapcoPlugin).getDecorations(newState)
              : state.decorations,
          };
        },
      },
      props: {
        nodeViews: {
          [CAPCO]: bindCapcoView,
        },
        handleDOMEvents: {
          keydown(view, event) {
            let handled = false;
            if ('Enter' === event.key) {
              handled = (this as CapcoPlugin).handleOnEnter(view, event);
            }
            return handled;
          },
          dragstart(view, _event) {
            return (this as CapcoPlugin).onDragStart(view);
          },
        },
        handleClick(view, pos, event) {
          return (this as CapcoPlugin).initMenu(
            CAPCOKEY,
            mode,
            view,
            event,
            pos
          );
        },

        handlePaste(view, event, slice) {
          return (this as CapcoPlugin).handleSourceForCapco(view, event, slice);
        },

        decorations(state) {
          return this.getState(state)?.decorations;
        },
      },
      appendTransaction(transactions, oldState, newState) {
        return (this as CapcoPlugin).getPendingTransactions(
          transactions,
          oldState,
          newState
        );
      },
    });
    mode ??= CAPCOMODE.NONE;
    if (1 < mode.valueOf()) {
      mode = CAPCOMODE.FORCED;
    }
    this.mode = mode;
    this.defaultCapco = defaultCapco ?? SYSTEMCAPCO.TBD;
  }

  onDragStart(view: EditorView): boolean {
    this.pendingItems = [];
    view.state.doc.nodesBetween(
      view.state.selection.from,
      view.state.selection.to,
      this.resetDragNodeCapco.bind(this)
    );
    return false;
  }

  resetDragNodeCapco(
    node: Node,
    pos: number,
    _parent: Node,
    _index: number
  ): boolean {
    if (this.isAllowedNode(node)) {
      this.pendingItems.push({ pos, attrs: this.resetCapco(node), node });
    }
    return true;
  }

  isNodeInsideTable(state, pos) {
    const $pos = state.doc.resolve(pos);
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const node = $pos.node(depth);
      if (
        [TABLE, 'table_row', 'table_cell', 'table_header'].includes(
          node.type.name
        )
      ) {
        return true;
      }
    }
    return false;
  }

  isSpecialTableHeader(tableNode: Node): boolean {
    let isTableHeader = false;
    if (tableNode?.type?.name === TABLE && tableNode?.attrs?.vignette) {
      return true;
    }
    tableNode.descendants((node) => {
      if (
        node?.type.name === 'table_cell' &&
        node.attrs?.background === '#d8d8d8' &&
        node.attrs?.colspan === 2 &&
        node.attrs?.fullSize === 1
      ) {
        isTableHeader = true;
        return false; // stop traversal
      }
      return true;
    });

    return isTableHeader;
  }

  isAllowedNode(
    node: Node,
    allowedTypes: string[] = DEFAULT_ALLOWED_NODE_TYPES
  ): boolean {
    return allowedTypes.includes(node.type.name);
  }

  resetCapco(node: Node, capco?: string): Attrs {
    const defaultCapcoMarking = {
      ism: {
        version: '1',
        system: 'US',
        classification: this.defaultCapco,
        ownerProducer: ['USA'],
        sciControls: [],
        sarIdentifiers: [],
        atomicEnergyMarkings: [],
        fgiSourceOpen: [],
        releasableTo: [],
        disseminationControls: [],
        nonICmarkings: [],
      },
      portionMarking: this.defaultCapco,
    };
    return {
      ...node?.attrs,
      [CAPCOKEY]:
        capco === 'TBD'
          ? JSON.stringify(defaultCapcoMarking)
          : (capco ?? JSON.stringify(defaultCapcoMarking)),
    };
  }

  setNodeMarkupEx(
    resPos: ResolvedPos,
    doc: Node,
    tr: Transaction
  ): Transaction {
    const node = resPos.node(resPos.depth);
    const pos = this.findNodeIndexPos(doc, node).pos;
    return 0 <= pos
      ? tr.setNodeMarkup(pos, undefined, this.resetCapco(node))
      : tr;
  }

  processEnterPendingTransactions(
    selTrx: Transaction,
    doc: Node,
    trx: Transaction,
    schema: Schema
  ): Transaction {
    const evt = selTrx.getMeta('uiEvent');
    const drop = evt === 'drop';
    const len = this.pendingItems.length;

    for (const [i, element] of this.pendingItems.entries()) {
      let pos = selTrx.mapping.map(element.pos);

      if (!drop || (drop && len > 1 && i !== 0)) {
        pos = this.getPendingItemPos(pos, i, drop, len, doc, element, schema);
      }

      const currentNode = trx.doc.nodeAt(pos);
      if (!currentNode) continue;

      trx = trx.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        capco: element.attrs.capco,
      });
    }

    return trx;
  }

  getPendingItemPos(
    pos: number,
    index: number,
    drop: boolean,
    len: number,
    doc: Node,
    element: PendingItem,
    schema: Schema
  ): number {
    if (drop && len - 1 != index) {
      pos = this.findNodeIndexPos(doc, element.node).pos;
    } else {
      const rPos = doc.resolve(pos);

      const parent = findParentNodeOfTypeClosestToPos(
        rPos,
        schema.nodes.paragraph
      );
      if (parent) {
        pos = parent.pos;
      }
    }

    return pos;
  }

  getPendingTransactions(
    transactions: readonly Transaction[],
    _oldState: EditorState,
    newState: EditorState
  ): Transaction {
    let trx = newState.tr;
    const selTrx = transactions[0];
    if ('drop' === selTrx.getMeta('uiEvent')) {
      trx = this.setNodeMarkupEx(selTrx.selection.$from, trx.doc, trx);
      trx = this.setNodeMarkupEx(selTrx.selection.$to, selTrx.doc, trx);
    }
    trx = this.processEnterPendingTransactions(
      selTrx,
      newState.doc,
      trx,
      newState.schema
    );
    this.pendingItems = [];
    return trx;
  }

  getDecorations(state) {
    const decorations: Decoration[] = [];
    state.doc.descendants((node, pos) => {
      if (
        node.isBlock &&
        this.isAllowedNode(node) &&
        !this.isNodeInsideTable(state, pos) &&
        !this.isSpecialTableHeader(node)
      ) {
        this.addBlockDecoratoration(node, state, pos, decorations);
      }
    });
    return DecorationSet.create(state.doc, decorations);
  }

  private addBlockDecoratoration(
    node: Node,
    state: EditorState,
    pos: number,
    decorations: Decoration[]
  ) {
    const capco = node.attrs[CAPCOKEY];
    // CAPCO mark.
    const capcoMark = document.createElement('span');
    if (capcoMark) {
      this.setCapcoContent(state, capco, capcoMark, node.type.name, pos);
      capcoMark.style.display = this.showHideCapco(state, node.textContent);
      if ([TABLE_FIGURE_CAPCO, TABLE_FIGURE].includes(node.type.name)) {
        capcoMark.style.display = '';
      }
    }
    const needValidate = document.createElement('span');
    needValidate.textContent = 'Needs Validation';
    needValidate.style.color = 'grey';

    if (TABLE === node.type.name) {
      const parentNode = state.doc.resolve(pos);
      if (parentNode.parent.type.name !== 'enhanced_table_figure_body') {
        decorations.push(
          Decoration.widget(node.nodeSize + pos, capcoMark, { side: -1 })
        );
      }
    } else if (TABLE_FIGURE === node.type.name) {
      decorations.push(
        Decoration.widget(node.nodeSize + pos, capcoMark, { side: -1 })
      );
    } else {
      decorations.push(Decoration.widget(pos + 1, capcoMark, { side: -1 }));
    }
    if (TABLE_FIGURE === node.type.name && node.attrs.isValidate) {
      decorations.push(
        Decoration.widget(node.nodeSize + pos, needValidate, { side: 1 })
      );
    }
  }

  enhancedTableFigureCapco(capco: string, isFigureBlock: boolean): string {
    const capcoString: Record<string, string> = {
      TBD: isFigureBlock ? 'TBD' : 'To be Determined',
      U: 'Unclassified',
      C: isFigureBlock ? 'C' : 'Confidential',
      S: isFigureBlock ? 'S' : 'Secret',
      TS: isFigureBlock ? 'TS' : 'Top Secret',
      CUI: isFigureBlock ? 'CUI' : 'Controlled Unclassified Information',
    };
    return capcoString[capco] || capco;
  }

  handleOnEnter(view: EditorView, _event: KeyboardEvent): boolean {
    const handled = false;
    const head = view.state.selection.$head;
    const cPos = head.pos;
    const start = head.posAtIndex(0);
    const end = start + head.node(head.depth).content.size;
    this.pendingItems = [];
    const pos = this.getPos(view);
    const node = view.state.doc.nodeAt(pos);

    // Default CAPCO value based on CAPCO mode
    let capco: string = SYSTEMCAPCO.TBD;
    if (
      this.mode === CAPCOMODE.FORCED
    ) {
      capco = node.attrs.capco;
    }

    // Always push for `cPos - 1` when within selection but not at the end
    if (cPos >= start && cPos < end) {
      this.pendingItems.push({
        pos: cPos - 1,
        attrs: this.resetCapco(node, SYSTEMCAPCO.TBD),
      });
    }

    // Always push for `cPos` when at the selection end or not at the start
    if (cPos !== start || cPos === end) {
      this.pendingItems.push({
        pos: cPos,
        attrs: this.resetCapco(node, capco),
      });
    }

    return handled;
  }

  getCursorPosition(e: MouseEvent): { x: number; y: number } {
    let posx = 0;
    let posy = 0;
    if (e.pageX || e.pageY) {
      posx = e.pageX;
      posy = e.pageY;
    } else if (e.clientX || e.clientY) {
      posx =
        e.clientX +
        (document.body ? document.body.scrollLeft : 0) +
        (document.documentElement ? document.documentElement.scrollLeft : 0);
      posy =
        e.clientY +
        (document.body ? document.body.scrollTop : 0) +
        (document.documentElement ? document.documentElement.scrollTop : 0);
    }
    return {
      x: posx,
      y: posy,
    };
  }
  initMenu(
    key: string,
    mode: CAPCOMODE,
    view: EditorView,
    event: MouseEvent,
    pos: number
  ): boolean {
    let handled = false;
    if (
      !this.cMenu &&
      view.editable &&
      event.button === 0 &&
      mode === CAPCOMODE.FORCED &&
      (event.target as HTMLElement)?.classList.contains('capco') &&
      (event.target as HTMLElement)?.classList.contains('ProseMirror-widget')
    ) {
      handled = true;
      const viewPops = {
        capcoKey: key,
        editorView: view,
        selectedCapco: '',
        position: this.getPosition(event),
        pos: pos,
        cursorPosition: this.getCursorPosition(event),
      };
      this._popUp = createPopUp(CapcoContextMenu, viewPops, {
        anchor: event?.currentTarget,
        autoDismiss: false,
        position: atViewportCenter,
        onClose: (_val) => {
          this._popUp?.close();
          this._popUp = null;
        },
      });
    }
    return handled;
  }

  getPosition(e: MouseEvent): { x: number; y: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 280; // Approximate width of your popup
    const popupHeight = 180; // Approximate height of your popup

    let posx =
      e.pageX ??
      e.clientX +
      ((document.documentElement.scrollLeft ?? 0) +
        (document.body?.scrollLeft ?? 0));

    let posy =
      e.pageY ??
      e.clientY +
      ((document.documentElement.scrollTop ?? 0) +
        (document.body?.scrollTop ?? 0));

    // Adjust position to ensure the popup stays within the viewport
    if (posx + popupWidth > viewportWidth) {
      posx = viewportWidth - popupWidth;
    }
    if (posy + popupHeight > viewportHeight) {
      posy = viewportHeight - popupHeight;
    }

    // Prevent positioning outside the top-left corner
    posx = Math.max(0, posx);
    posy = Math.max(0, posy);

    return { x: posx, y: posy };
  }

  containsStart(e: MouseEvent, view: EditorView, pos?: NumType): boolean {
    const { start, startCoords, resolvedPos, found } = this.getStartPos(
      e.clientX,
      e.clientY,
      view
    );

    if (!found || !startCoords) {
      return false;
    }

    if (pos) {
      pos.value = start;
    }

    const pm = view.dom;
    const pmLeft = pm?.getBoundingClientRect()?.left ?? 0;

    // CAPCO mouse tool displayed on left portion of para that is same width as CAPCO
    // Get line height from computed styles
    const computedStyles = globalThis.getComputedStyle(pm);
    const lineHeight = Number.parseFloat(computedStyles.lineHeight) || 20; // Default to 20px if unavailable
    // Check if the mouse is within the first line of the paragraph
    const isFirstLine =
      e.clientY >= startCoords.top && e.clientY <= startCoords.top + lineHeight;

    if (
      isFirstLine &&
      this.isInsideDesired(
        pmLeft,
        e,
        startCoords,
        resolvedPos,
        pm?.parentElement
      ) &&
      this.isSupportedNode(resolvedPos?.parent)
    ) {
      e.preventDefault();
      return true;
    }

    return false;
  }

  isInsideDesired(
    pmLeft: number,
    e: MouseEvent,
    startCoords: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    },
    resolvedPos: ResolvedPos,
    element: HTMLElement
  ) {
    const FONTSIZE = 13;
    const firstChild = (e.target as HTMLElement)
      ?.childNodes?.[0] as HTMLElement;
    const style =
      firstChild?.style ??
      (firstChild?.parentElement?.parentElement?.childNodes?.[0] as HTMLElement)
        ?.style;
    return pmLeft <= e.clientX &&
      startCoords.top <= e.clientY &&
      e.clientY <= startCoords.bottom &&
      element.classList.contains('embedded') &&
      (0 === resolvedPos.parent.content.size || 'none' === style?.display)
      ? e.clientX <= startCoords.left + 2 * FONTSIZE
      : e.clientX <= startCoords.left - FONTSIZE / 2;
  }

  isSupportedNode(node: PMNode): boolean {
    let supported = true;
    if (node && node.content.size > 0) {
      if (
        node.firstChild &&
        ('image' === node.firstChild.type.name ||
          'math' === node.firstChild.type.name)
      ) {
        supported = false;
      }
    }
    return supported;
  }

  getStartPos(
    x: number,
    y: number,
    view: EditorView
  ): {
    start: number;
    startCoords: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
    resolvedPos: ResolvedPos;
    found: boolean;
  } {
    // get current position
    const posCursor = view.posAtCoords({
      left: x,
      top: y,
    });

    let resolvedPos = null;
    let startCoords = null;
    let found = true; // get starting coordinates of the current node.
    let start = 0;

    if (posCursor) {
      resolvedPos = view.state.doc.resolve(posCursor.pos);
      start = resolvedPos.start();

      if (0 === start) {
        // Outside the editing area, so get correspsnding line's first paragraph.
        start = resolvedPos.posAtIndex(0, 1);

        if (start > view.state.doc.content.size) {
          found = false;
        } else {
          resolvedPos = view.state.doc.resolve(start);
        }
      }
    } else {
      found = false;
    }

    if (found) {
      startCoords = view.coordsAtPos(start);

      if (startCoords.top === startCoords.bottom) {
        // tweak to find the paragraph's rect if mouse falls in OL or LI
      }
    }

    return {
      start,
      startCoords,
      resolvedPos,
      found,
    };
  }

  getCapcoFromSlice(slice: Slice): string | null {
    let capco: string | null = null;
      if (this.mode !== CAPCOMODE.NONE &&
      slice.content?.childCount !== 0
    ) {
      // Copy full paragraph, the pasted paragraph shall have same CAPCO.
      // target line is in length - 3 always.
      // copy capco of the first copied line to first line in the paste area.
      const name = slice.content.child(0).type.name;
      capco =
        'ordered_list' === name || 'bullet_list' === name
          ? slice.content.child(0).content.child(0).content.child(0).attrs[
          CAPCOKEY
          ]
          : slice.content.child(0).attrs[CAPCOKEY];
    } else {
      // In None mode, use TBD as capco always.
      capco = SYSTEMCAPCO.TBD;
    }

    return capco;
  }

  getPos(view: EditorView, pos?: number): number {
    pos ??=
      0 === view.state.selection.$head.depth
        ? 0
        : view.state.selection.$head.before();

    return pos;
  }

  handleSourceForCapco(view: EditorView, _event: Event, slice: Slice): boolean {
    this.pendingItems = [];
    // overriding for this to updating capco of the first empty line with the selected first line's capco.
    const h = view.state.tr['curSelection']['$head'] as ResolvedPos;
    const pos = this.getPos(view);
    const node = view.state.doc.nodeAt(pos);
    if (h) {
      const source = h.node(h.depth);
      const orgSlice = slice?.content?.content?.[0];
      const selectionStart = h.posAtIndex(0);
      const end = selectionStart + source.content.size;
      let capco = null;

      if (source) {
        // If the first line in the paste area is already EMPTY.
        if (0 === source.content.childCount) {
          capco = this.getCapcoFromSlice(slice);
        }
        // If pasted at the end of a line
        else if (h.pos === end) {
          capco = node.attrs.capco;
        }
        // If the first line in the paste area is already NOT EMPTY.
        else {
          // Copy and paste part of the paragraph, the new pasted paragraph shall have default CAPCO Marking prepended automatically.
          // always show capco as TBD if user paste in between a paragraph.

          // for update the node attributes.
          // issue fix on copied capco not showing after reload.
          capco = this.defaultCapco;
        }
        const pos = this.findNodeIndexPos(view.state.doc, source).pos;
        this.pendingItems.push({
          pos,
          attrs: this.resetCapco(orgSlice, capco),
        });
      }
    }
    // continue with normal process.
    return false;
  }

  findNodeIndexPos(doc: Node, n: Node): { index: number; pos: number } {
    let found = { index: -1, pos: -1 };
    doc.descendants((node: Node, pos: number, _parent: Node, index: number) => {
      if (n === node) {
        found = { index, pos };
      }
      return true;
    });
    return found;
  }

  setCapcoContent(
    state: EditorState,
    capco: string,
    capcoMark: HTMLElement,
    nodeType: string,
    pos: number
  ): void {
    capcoMark.style.userSelect = NONE;

    capcoMark.contentEditable = 'false';
    capcoMark.classList.add(CAPCOKEY);

    const capcoColors: Record<string, string> = {
      UNCLASSIFIED: '#006E3A', // green
      CONFIDENTIAL: '#0000FF', // blue
      C: '#0000FF', // blue
      'CONTROLLED UNCLASSIFIED INFORMATION': '#990099', // purple
      CUI: '#990099', // purple
      SECRET: '#FF0000', // red
      S: '#FF0000', // red
      'TOP SECRET': '#FFC20E', // yellow-orange
      TS: '#FFC20E', // yellow-orange
      'TO BE DETERMINED': '#454545', // dark gray
      TBD: '#454545', // dark gray
    };

  if (this.mode === CAPCOMODE.FORCED) {
    let capcoText = '';
    const parentNode = state.doc.resolve(pos);

    if ([TABLE_FIGURE_CAPCO, TABLE_FIGURE].includes(nodeType)) {
      capco = state.doc.nodeAt(getBlockControlCapco(state, pos))?.attrs?.capco;
      const isFigureBlock =
        parentNode.parent.type.name === TABLE_FIGURE &&
        parentNode.parent.attrs.figureType === 'figure';

      capcoText = getCapcoString(capco, this.defaultCapco);
      capcoText = this.enhancedTableFigureCapco(capcoText, isFigureBlock);
      capcoMark.textContent = capcoText;
      capcoMark.style.color = '#6A5ACD';
    } else {
      capcoText = getCapcoString(capco, this.defaultCapco);
      capcoMark.textContent = `(${capcoText}) `;
    }

    const colorKey = capcoText.toUpperCase();
    if (
      parentNode.parent.type.name === TABLE_FIGURE &&
      capcoColors[colorKey]
    ) {
      capcoMark.style.color = capcoColors[colorKey];
      capcoMark.style.textTransform = 'uppercase';
    }
  }
  }

  showHideCapco(_state: EditorState, textContent: string): string {
    if (!textContent.trim()) return NONE;
    return this.mode === CAPCOMODE.FORCED ? '' : NONE;
  }

  // Plugin method that supplies plugin schema to editor
  getEffectiveSchema(schema: Schema): Schema {
    return effectiveSchema(schema);
  }
}

function bindCapcoView(node: Node, view: EditorView): CapcoView {
  return new CapcoView(node, view);
}
