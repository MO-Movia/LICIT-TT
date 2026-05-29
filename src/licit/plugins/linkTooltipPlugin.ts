/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
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
  RuntimeService,
} from '../../commands';
import { hideSelectionPlaceholder } from './selectionPlaceholderPlugin';
import lookUpElement from '../lookUpElement';
import LinkTooltip from '../ui/linkTooltip';
import { EditorViewEx } from '../constants';
import sanitizeURL from '../sanitizeURL';
import scrollIntoView from 'smooth-scroll-into-view-if-needed';

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
    },
    handleClickOn: (view, pos, node, nodePos, event, direct) => {
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

      const pluginView = view.dom._linkTooltipView;
      return pluginView?._handleClick(view, linkMark, event);
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

  constructor(editorView: EditorView) {
    this.update(editorView as EditorViewEx, null);
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
    const { from, to } = selection;
    const result = findNodesWithSameMark(doc, from, to, markType);

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

    const popup = this._popup;
    const viewPops = {
      editorState: state,
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
    }
  }

  destroy() {
    this._popup?.close();
    this._editor?.close();
  }

  _onCancel = (view: EditorView): void => {
    this.destroy();
    view.focus();
  };

  _onClose = (): void => {
    this._anchorEl = null;
    this._editor = null;
    this._popup = null;
  };

  _onEdit = (view: EditorView): void => {
    if (this._editor) {
      return;
    }

    const { state } = view;
    const { schema, doc, selection } = state;
    const { from, to } = selection;
    const markType = schema.marks[MARK_LINK];
    const result = findNodesWithSameMark(doc, from, to, markType);
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
        this._onEditEnd(view, selection as TextSelection, value);
      },
    };

    const runtime = RuntimeService.Runtime as
      | {
        openLinkDialog?: (
          link: string,
          popupString: string,
          applyLink?: (href?: string, linkDisplayText?: string) => void,
          closeLinkTool?: () => void
        ) => void;
      }
      | null;

    if (runtime?.openLinkDialog) {
      runtime.openLinkDialog(
        href,
        selectedText,
        (nextHref?: string, linkDisplayText?: string) => {
          this._editor = null;
          this._onEditEnd(
            view,
            selection as TextSelection,
            nextHref,
            linkDisplayText
          );
        },
        () => {
          this._editor = null;
          this._onEditEnd(view, selection as TextSelection);
        }
      );
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

    const result = findNodesWithSameMark(
      state.doc,
      state.selection.from,
      state.selection.to,
      markType
    );
    if (result) {
      this._handleClick(view, result.mark);
    }
  };

  _onRemove = (view: EditorView): void => {
    this._onEditEnd(view, view.state.selection as TextSelection, null);
  };

  _handleClick(view: EditorView, mark, event?: MouseEvent): boolean {
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


  getInnerlinkSelected_position = (view: EditorView, selectionId): void => {
    let tocItemPos = null;
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
          initialSelection.to,
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

export default LinkTooltipPlugin;
