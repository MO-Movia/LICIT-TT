/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  MARK_LINK,
  applyMark,
  findNodesWithSameMark,
  atAnchorTopCenter,
  createPopUp,
} from '../../commands';
import { hideSelectionPlaceholder } from './selectionPlaceholderPlugin';
import lookUpElement from '../lookUpElement';
import LinkTooltip from '../ui/linkTooltip';
import { EditorViewEx } from '../constants';
import sanitizeURL from '../sanitizeURL';
import scrollIntoView from 'smooth-scroll-into-view-if-needed';
import LinkSetURLCommand from '../commands/linkSetURLCommand';

const linkSetURLCommand = new LinkSetURLCommand();
const LINK_TOOLTIP_SELECTOR = '.czi-link-tooltip-body';
const LINK_TOOLTIP_CLOSE_DELAY_MS = 1200;

// https://prosemirror.net/examples/tooltip/
const SPEC = {
  // [FS] IRAD-1005 2020-07-07
  // Upgrade outdated packages.
  key: new PluginKey('LinkTooltipPlugin'),
  props: {
    handleDOMEvents: {
      click: (_view: EditorView, event: MouseEvent): boolean => {
        if (event.target instanceof Element && event.target.closest('a[href]')) {
          event.preventDefault();
        }
        return false;
      },
      mouseover: (view: EditorView, event: MouseEvent): boolean => {
        const anchorEl =
          event.target instanceof Element
            ? event.target.closest('a[href]')
            : null;
        if (anchorEl) {
          (view.dom as HTMLElement & {
            _linkTooltipView?: LinkTooltipView;
          })._linkTooltipView?._handleMouseOver(view, anchorEl);
        }
        return false;
      },
      mouseout: (view: EditorView, event: MouseEvent): boolean => {
        const anchorEl =
          event.target instanceof Element
            ? event.target.closest('a[href]')
            : null;
        if (anchorEl) {
          (view.dom as HTMLElement & {
            _linkTooltipView?: LinkTooltipView;
          })._linkTooltipView?._handleLinkMouseOut(
            anchorEl,
            event.relatedTarget
          );
        }
        return false;
      },
    },
    handleClickOn: (view, pos, node, _nodePos, event, direct) => {
      if (!direct) {
        return false;
      }

      node = view.state.doc.nodeAt(pos);
      if (!node) {
        return false;
      }
      const linkMark = node.marks?.find((m) => m?.type?.name === MARK_LINK);
      if (!linkMark) {
        return false;
      }

      const pluginView = (view.dom as HTMLElement & {
        _linkTooltipView?: LinkTooltipView;
      })._linkTooltipView;
      return pluginView?._handleClick(view, linkMark, event) ?? false;
    },
  },
  view(editorView: EditorView) {
    const pluginView = new LinkTooltipView(editorView);
    (editorView.dom as HTMLElement & {
      _linkTooltipView?: LinkTooltipView;
    })._linkTooltipView = pluginView;
    return pluginView;
  },
};

class LinkTooltipPlugin extends Plugin {
  constructor() {
    super(SPEC);
  }
}

export class LinkTooltipView {
  _anchorEl = null;
  _popup = null;
  _editor = null;
  _view = null;
  _linkSelection = null;
  _closeTimer = null;
  _tooltipEl = null;
  _isTooltipHovered = false;

  constructor(editorView: EditorView) {
    this.update(editorView, null);
    this._view = editorView;
  }

  update(view: EditorViewEx, _lastState: EditorState): void {
    if (view.readOnly) {
      this.destroy();
      return;
    }

    const { state } = view;
    const { doc, selection, schema } = state;
    const markType = schema.marks[MARK_LINK];
    if (!markType) {
      return;
    }
    if (!this._popup) {
      return;
    }

    const { from, to } = this._linkSelection ?? selection;
    const result = findNodesWithSameMark(
      doc,
      from,
      getInclusiveSelectionTo(from, to),
      markType
    );

    if (!result) {
      this.destroy();
      return;
    }
    const domFound = view.domAtPos(from);
    if (!domFound) {
      this.destroy();
      return;
    }
    const anchorEl = lookUpElement(
      domFound.node as Element,
      (el) => el.nodeName === 'A'
    );
    if (!anchorEl) {
      this.destroy();
      return;
    }

    this._showTooltip(view, result, anchorEl);
  }

  _showTooltip = (view: EditorView, result, anchorEl: Element): void => {
    this._clearCloseTimer();
    this._linkSelection = TextSelection.create(
      view.state.doc,
      result.from.pos,
      result.to.pos + 1
    );
    const popup = this._popup;
    const viewPops = {
      editorState: view.state,
      editorView: view,
      href: result.mark.attrs.href,
      onCancel: this._onCancel,
      onEdit: this._onEdit,
      onOpen: this._onOpen,
      onRemove: this._onRemove,
      selectionId: result.mark.attrs.selectionId,
    };

    if (popup && anchorEl === this._anchorEl) {
      popup.update(viewPops);
    } else {
      popup?.close();
      this._anchorEl = anchorEl;
      this._popup = createPopUp(LinkTooltip, viewPops, {
        anchor: anchorEl,
        autoDismiss: false,
        onClose: this._onClose,
        position: atAnchorTopCenter,
      });
      this._bindTooltipHoverEvents();
    }
  };

  _handleMouseOver = (view: EditorView, anchorEl: Element): void => {
    const markType = view.state.schema.marks[MARK_LINK];
    if (!markType) {
      return;
    }
    const pos = view.posAtDOM(anchorEl, 0);
    const result = findNodesWithSameMark(view.state.doc, pos, pos, markType);
    if (result) {
      this._showTooltip(view, result, anchorEl);
    }
  };

  _bindTooltipHoverEvents = (): void => {
    this._tooltipEl = document.querySelector(LINK_TOOLTIP_SELECTOR);
    this._tooltipEl?.addEventListener('mouseenter', this._handleTooltipMouseEnter);
    this._tooltipEl?.addEventListener('mousemove', this._handleTooltipMouseEnter);
    this._tooltipEl?.addEventListener('mousedown', this._handleTooltipMouseEnter);
    this._tooltipEl?.addEventListener('mouseleave', this._scheduleClose);
  };

  _handleLinkMouseOut = (anchorEl: Element, relatedTarget: EventTarget | null): void => {
    if (
      relatedTarget instanceof Node &&
      (anchorEl.contains(relatedTarget) || this._isTooltipTarget(relatedTarget))
    ) {
      this._handleTooltipMouseEnter();
      return;
    }

    this._scheduleClose();
  };

  _isTooltipTarget = (target: Node): boolean =>
    Boolean(this._tooltipEl?.contains(target)) ||
    (
      target instanceof Element &&
      Boolean(target.closest(LINK_TOOLTIP_SELECTOR))
    );

  _handleTooltipMouseEnter = (): void => {
    this._isTooltipHovered = true;
    this._clearCloseTimer();
  };

  _scheduleClose = (): void => {
    this._isTooltipHovered = false;
    this._clearCloseTimer();
    this._closeTimer = window.setTimeout(() => {
      if (!this._isTooltipHovered) {
        this._closePopup();
      }
    }, LINK_TOOLTIP_CLOSE_DELAY_MS);
  };

  _clearCloseTimer = (): void => {
    if (this._closeTimer !== null) {
      window.clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
  };

  _closePopup = (): void => {
    this._clearCloseTimer();
    this._tooltipEl?.removeEventListener('mouseenter', this._handleTooltipMouseEnter);
    this._tooltipEl?.removeEventListener('mousemove', this._handleTooltipMouseEnter);
    this._tooltipEl?.removeEventListener('mousedown', this._handleTooltipMouseEnter);
    this._tooltipEl?.removeEventListener('mouseleave', this._scheduleClose);
    this._tooltipEl = null;
    this._isTooltipHovered = false;
    this._popup?.close();
  };

  destroy() {
    this._closePopup();
    this._editor?.close();
  }

  _onCancel = (view: EditorView): void => {
    this.destroy();
    view.focus();
  };

  _onClose = (): void => {
    this._anchorEl = null;
    this._editor = null;
    this._linkSelection = null;
    this._popup = null;
  };

  _onEdit = (view: EditorView): void => {
    if (this._editor) {
      return;
    }

    const { state } = view;
    const { schema, doc, selection } = state;
    const linkSelection = this._linkSelection ?? selection;
    const { from, to } = linkSelection;
    const markType = schema.marks[MARK_LINK];
    if (!markType) {
      return;
    }
    const result = findNodesWithSameMark(
      doc,
      from,
      getInclusiveSelectionTo(from, to),
      markType
    );
    if (!result) {
      return;
    }

    const href = result.mark.attrs.href;
    const selectedText =
      typeof doc.textBetween === 'function'
        ? result?.from?.pos !== undefined && result?.to?.pos !== undefined
          ? doc.textBetween(result.from.pos, result.to.pos + 1, ' ')
          : doc.textBetween(from, to, ' ')
        : '';

    this._editor = {
      close: (value?: string) => {
        this._editor = null;
        this._onEditEnd(view, linkSelection as TextSelection, value);
      },
    };

    const runtime = linkSetURLCommand.getLinkDialogRuntime(view);

    if (runtime?.openLinkDialog) {
      void linkSetURLCommand.showTocList(view).then((linkItems) => {
        if (!this._editor) {
          return;
        }
        runtime.openLinkDialog(
          href,
          selectedText,
          (nextHref?: string, linkDisplayText?: string) => {
            this._editor = null;
            this._onEditEnd(
              view,
              linkSelection as TextSelection,
              nextHref,
              linkDisplayText
            );
          },
          () => {
            this._editor = null;
            this._onEditEnd(view, linkSelection as TextSelection);
          },
          linkItems
        );
      });
      return;
    }

    this._editor.close();
  };

  _onOpen = (view: EditorView): void => {
    const { state } = view;
    const markType = state.schema.marks[MARK_LINK];
    if (!markType) {
      return;
    }

    const selection = this._linkSelection ?? state.selection;
    const result = findNodesWithSameMark(
      state.doc,
      selection.from,
      getInclusiveSelectionTo(selection.from, selection.to),
      markType
    );
    if (result) {
      this._handleClick(view, result.mark);
    }
  };

  _onRemove = (view: EditorView): void => {
    this._onEditEnd(
      view,
      (this._linkSelection ?? view.state.selection) as TextSelection,
      null
    );
  };

  _handleClick(view: EditorView, mark, event?: MouseEvent): boolean {
    this._closePopup();
    const href = mark.attrs['href'];
    const selectionId = this.getInnerLinkSelectionId(mark.attrs);
    let tocItemPos = null;
    if (selectionId) {
      tocItemPos = this.getInnerlinkSelected_position(
        view,
        selectionId
      );
      if (null === tocItemPos) {
        this.openSelectedSection(selectionId);
        event?.preventDefault(); // prevent default browser navigation
        return true;
      }
    }
    this.jumpLink(view, tocItemPos, href, selectionId);
    event?.preventDefault(); // prevent default browser navigation
    return true;
  }

  getInnerLinkSelectionId = (
    attrs: Record<string, string | null | undefined>
  ): string => {
    const selectionId = attrs.selectionId || attrs.href;
    if (!this.isBookMarkHref(selectionId)) {
      return attrs.selectionId ?? '';
    }
    return selectionId.slice(1);
  };

  openSelectedSection = (selectionId): void => {
    if (selectionId) {
      if (this._view?.runtime?.goToInnerLinkSection) {
        this._view.runtime.goToInnerLinkSection(selectionId);
      }
    }
  };

  jumpLink = (view: EditorView, tocItemPos, href, selectionId): void => {
    if (selectionId && tocItemPos) {
      this.jumpInnerLink(view, tocItemPos);
    } else {
      this._openLink(href);
    }
  };

  jumpInnerLink = (view: EditorView, tocItemPos): void => {
    const transaction = view.state.tr;
    const tr = transaction.setSelection(
      TextSelection.create(transaction.doc, tocItemPos.position + 1)
    );
    view.dispatch(tr.scrollIntoView());
    const dom = view.domAtPos(tocItemPos.position + 1).node;
    const target =
      dom instanceof Element ? dom : dom?.parentElement;
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  _openLink = (href: string): void => {
    if (this.isBookMarkHref(href)) {
      const id = href.substr(1);
      const el = document.getElementById(id);
      if (el) {
        void scrollIntoView(el, {
          scrollMode: 'if-needed',
          behavior: 'smooth',
        });
      }
      return;
    }

    if (href) {
      window.open(sanitizeURL(href), '_blank', 'noopener,noreferrer');
    }
  };

  isBookMarkHref = (href: string): boolean => {
    return !!href && href.startsWith('#') && href.length >= 2;
  };


  getInnerlinkSelected_position = (
    view: EditorView,
    selectionId
  ): {position: number; textContent: string} | null => {
    let tocItemPos: {position: number; textContent: string} | null = null;
    if (selectionId) {
      const targetSelectionId = this.normalizeSelectionId(selectionId);
      view.state.tr.doc.descendants((node, pos) => {
        const nodeSelectionId = this.normalizeSelectionId(
          node.attrs.selectionId
        );
        if (node.attrs.styleName && nodeSelectionId === targetSelectionId) {
          tocItemPos = { position: pos, textContent: node.textContent };
        }
      });
    }
    return tocItemPos;
  };

  normalizeSelectionId = (selectionId?: string | null): string =>
    selectionId?.startsWith('#') ? selectionId.slice(1) : selectionId ?? '';

  _onEditEnd = (
    view: EditorView,
    initialSelection: TextSelection,
    href?: string,
    linkDisplayText?: string
  ): void => {
    const { state, dispatch } = view;
    let tr = hideSelectionPlaceholder(state);

    if (href !== undefined) {
      const { schema } = state;
      const markType = schema.marks[MARK_LINK];
      if (markType) {
        const result = findNodesWithSameMark(
          tr.doc,
          initialSelection.from,
          getInclusiveSelectionTo(initialSelection.from, initialSelection.to),
          markType
        );
        if (result) {
          const existingHref = result.mark.attrs.href;
          const existingText = tr.doc.textBetween(
            result.from.pos,
            result.to.pos + 1,
            ' '
          );
          const explicitDisplayText =
            linkDisplayText && linkDisplayText !== href
              ? linkDisplayText
              : null;
          const nextText =
            explicitDisplayText ??
            (shouldReplaceLinkText(existingText, existingHref) ? href : null);
          const linkSelection = TextSelection.create(
            tr.doc,
            result.from.pos,
            result.to.pos + 1
          );
          tr = (tr as Transaction).setSelection(linkSelection);
          const selectionId = this.getInnerLinkSelectionId({ href });
          const attrs = href
            ? {
              href,
              selectionId: selectionId || null,
            }
            : null;
          if (href && nextText && nextText !== existingText) {
            tr = (tr as Transaction).replaceWith(
              result.from.pos,
              result.to.pos + 1,
              schema.text(nextText, [markType.create(attrs)]),
            );
          } else {
            tr = applyMark(tr, schema, markType, attrs);
          }

          // [FS] IRAD-1005 2020-07-09
          // Upgrade outdated packages.
          // reset selection to original using the latest doc.
          const maxSelectionPos = tr.doc.content.size;
          const origSelection = TextSelection.create(
            tr.doc,
            Math.min(initialSelection.from, maxSelectionPos),
            Math.min(initialSelection.to, maxSelectionPos)
          );
          tr = (tr as Transaction).setSelection(origSelection);
        }
      }
    }
    dispatch(tr as Transaction);
    view.focus();
  };
}

function shouldReplaceLinkText(
  existingText: string,
  existingHref: string
): boolean {
  if (!existingText || !existingHref) {
    return false;
  }

  return normalizeUrlText(existingText) === normalizeUrlText(existingHref);
}

function normalizeUrlText(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/$/i, '');
}

function getInclusiveSelectionTo(from: number, to: number): number {
  return to > from ? to - 1 : to;
}

export default LinkTooltipPlugin;
