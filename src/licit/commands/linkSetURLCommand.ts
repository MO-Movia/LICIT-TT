/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { MarkType, Node as PMNode, Schema } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';

import {
  MARK_LINK,
  applyMark,
  findNodesWithSameMark,
  RuntimeService,
} from '../../commands';
import {
  hideSelectionPlaceholder,
  showSelectionPlaceholder,
} from '../plugins/selectionPlaceholderPlugin';
import { UICommand } from '../../core';
import { getStylesAsync } from '../../plugins/custom-styles/customStyle';

type LinkToolResult = {
  href: string;
  linkDisplayText: string;
};

type LinkToolValue = LinkToolResult | string;

type LinkToolCategory = 'toc' | 'figures' | 'tables' | 'paragraphs';

type LinkToolItem = {
  id: string;
  label: string;
  summary?: string;
  children?: LinkToolItem[];
};

type LinkToolItems = Record<LinkToolCategory, LinkToolItem[]>;

type LinkDialogRuntime = {
  openLinkDialog?: (
    link: string,
    popupString: string,
    applyLink?: (href?: string, linkDisplayText?: string) => void,
    closeLinkTool?: () => void,
    linkItems?: LinkToolItems
  ) => void;
};

type TocStyleKey = 'toc' | 'tof' | 'tot';

type TocStyle = {
  name: string;
  level: number;
  prefix?: string;
  tof?: boolean;
  tot?: boolean;
};

type LinkCounterState = {
  content: number[];
  figures: number;
  tables: number;
};

type LinkRangeResult = {
  from?: { pos?: number };
  to?: { pos?: number };
};

const EMPTY_LINK_ITEMS: LinkToolItems = {
  toc: [],
  figures: [],
  tables: [],
  paragraphs: [],
};

const INNER_LINK_PREFIX = '#';

function getLinkToolHref(value?: LinkToolValue): string | undefined {
  return typeof value === 'string' ? value : value?.href;
}

function getLinkDisplayText(value?: LinkToolValue): string | undefined {
  return typeof value === 'string' ? undefined : value?.linkDisplayText;
}

function getSelectedLinkText(
  doc: PMNode,
  from: number,
  to: number,
  result: LinkRangeResult | null | undefined
): string {
  if (typeof doc.textBetween !== 'function') {
    return '';
  }

  if (result?.from?.pos !== undefined && result?.to?.pos !== undefined) {
    return doc.textBetween(result.from.pos, result.to.pos + 1, ' ');
  }

  return doc.textBetween(from, to, ' ');
}

function applyLinkValue(
  tr: Transaction,
  state: EditorState,
  schema: Schema,
  markType: MarkType,
  href: string,
  selectionId: string | null,
  displayText?: string
): Transaction {
  const attrs = href ? { href, selectionId } : null;
  if (href && displayText) {
    return tr.replaceSelectionWith(
      schema.text(displayText, [markType.create(attrs)]),
      false
    );
  }

  return applyMark(
    tr.setSelection(state.selection),
    schema,
    markType,
    attrs
  ) as Transaction;
}

class LinkSetURLCommand extends UICommand {
  _popUp: {
    close?: (href?: string, linkDisplayText?: string) => void;
  } | null = null;

  isEnabled = (state: EditorState): boolean => {
    return !!state.schema.marks[MARK_LINK];
  };

  isActive = (_state: EditorState): boolean => {
    return false;
  };

  showTocList = async (view?: EditorView): Promise<LinkToolItems> => {
    if (!view?.state?.doc) {
      return EMPTY_LINK_ITEMS;
    }

    try {
      const styles = await getStylesAsync();
      return this.fetchInnerLinkSelectionIds(
        view,
        this.getAppliedStyles(styles, 'toc'),
        this.getAppliedStyles(styles, 'tof'),
        this.getAppliedStyles(styles, 'tot')
      );
    } catch (error) {
      console.warn(error);
      return EMPTY_LINK_ITEMS;
    }
  };

  getAppliedStyles = (
    styles: Awaited<ReturnType<typeof getStylesAsync>>,
    styleKey: TocStyleKey
  ): TocStyle[] =>
    styles
      .filter((style) => style?.styles?.[styleKey] === true)
      .map((style) => ({
        name: style.styleName,
        level: Number(style.styles?.styleLevel) || 1,
        prefix: style.styles?.prefixValue,
        tof: style.styles?.tof === true,
        tot: style.styles?.tot === true,
      }));

  fetchInnerLinkSelectionIds = (
    view: EditorView,
    tocStyles: TocStyle[],
    tofStyles: TocStyle[],
    totStyles: TocStyle[]
  ): LinkToolItems => {
    const linkItems: LinkToolItems = {
      toc: [],
      figures: [],
      tables: [],
      paragraphs: [],
    };
    const tocCandidates: { item: LinkToolItem; level: number }[] = [];
    const tocStyleNames = new Set(tocStyles.map((style) => style.name));
    const tofStyleNames = new Set(tofStyles.map((style) => style.name));
    const totStyleNames = new Set(totStyles.map((style) => style.name));
    const styleByName = new Map(
      [...tocStyles, ...tofStyles, ...totStyles].map((style) => [
        style.name,
        style,
      ])
    );
    const tocLevels = new Map(
      tocStyles.map((style) => [style.name, style.level])
    );
    const counters: LinkCounterState = {
      content: new Array(11).fill(0),
      figures: 0,
      tables: 0,
    };

    view.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'paragraph') {
        return;
      }

      const styleName = node.attrs?.styleName;
      const appliedStyle = styleByName.get(styleName);
      const generatedNumber = appliedStyle
        ? this.updateAndFormatGeneratedNumber(
          appliedStyle,
          node.attrs,
          counters
        )
        : '';
      const label = this.getFullLinkLabel(
        generatedNumber,
        node.attrs?.capco,
        node.textContent
      );
      if (!label) {
        return;
      }

      const item = this.createLinkToolItem(node.attrs, label, pos);

      if (tocStyleNames.has(styleName)) {
        tocCandidates.push({
          item,
          level: tocLevels.get(styleName) ?? 1,
        });
      } else if (tofStyleNames.has(styleName)) {
        linkItems.figures.push(item);
      } else if (totStyleNames.has(styleName)) {
        linkItems.tables.push(item);
      } else {
        linkItems.paragraphs.push(item);
      }
    });

    linkItems.toc = this.buildTocTree(tocCandidates);
    return linkItems;
  };

  updateAndFormatGeneratedNumber = (
    style: TocStyle,
    attrs: Record<string, unknown>,
    counters: LinkCounterState
  ): string => {
    const level = Math.min(Math.max(Number(style.level) || 1, 1), 10);
    if (attrs?.reset === 'true') {
      for (let index = 1; index < level; index++) {
        counters.content[index] = 1;
      }
      counters.content[level] = 0;
    }

    counters.content[level] += 1;

    for (let index = level + 1; index < counters.content.length; index++) {
      counters.content[index] = 0;
    }

    if (level === 1) {
      counters.figures = 0;
      counters.tables = 0;
    }

    if (style.tof) {
      counters.figures += 1;
      return this.joinNumberLabel(style.prefix, [
        counters.content[1],
        counters.figures,
      ]);
    }

    if (style.tot) {
      counters.tables += 1;
      return this.joinNumberLabel(style.prefix, [
        counters.content[1],
        counters.tables,
      ]);
    }

    return this.joinNumberLabel(
      style.prefix,
      counters.content.slice(1, level + 1)
    );
  };

  joinNumberLabel = (
    prefix: string | undefined,
    parts: number[]
  ): string => {
    const numberText = parts.filter((part) => part > 0).join('.');
    return `${prefix ?? ''}${numberText}`.trim();
  };

  getFullLinkLabel = (
    generatedNumber: string,
    capco: unknown,
    textContent: string
  ): string =>
    [generatedNumber, this.formatCapco(capco), textContent]
      .filter(Boolean)
      .join(' ')
      .replaceAll(/\s+/g, ' ')
      .trim();

  formatCapco = (capco: unknown): string => {
    const portionMarking = this.getCapcoPortionMarking(capco);
    return portionMarking ? `(${portionMarking})` : '';
  };

  getCapcoPortionMarking = (capco: unknown): string => {
    if (!capco) {
      return '';
    }

    if (typeof capco === 'string') {
      const trimmed = capco.trim();
      if (!trimmed) {
        return '';
      }

      if (!trimmed.startsWith('{')) {
        return trimmed;
      }

      try {
        const parsed = JSON.parse(trimmed) as { portionMarking?: string };
        return parsed.portionMarking ?? '';
      } catch {
        return trimmed;
      }
    }

    if (typeof capco === 'object' && 'portionMarking' in capco) {
      const portionMarking = (capco as { portionMarking?: unknown })
        .portionMarking;
      if (
        typeof portionMarking === 'string' ||
        typeof portionMarking === 'number' ||
        typeof portionMarking === 'boolean'
      ) {
        return String(portionMarking);
      }
      return '';
    }

    return '';
  };

  createLinkToolItem = (
    attrs: Record<string, string | null | undefined>,
    label: string,
    pos: number
  ): LinkToolItem => {
    const targetId = attrs.selectionId || attrs.objectId || `pos-${pos}`;
    return {
      id: targetId.startsWith('#') ? targetId : `#${targetId}`,
      label,
    };
  };

  buildTocTree = (
    candidates: { item: LinkToolItem; level: number }[]
  ): LinkToolItem[] => {
    const rootItems: LinkToolItem[] = [];
    const stack: { item: LinkToolItem; level: number }[] = [];

    for (const candidate of candidates) {
      while (stack.length && stack.at(-1).level >= candidate.level) {
        stack.pop();
      }

      const parent = stack.at(-1)?.item;
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(candidate.item);
      } else {
        rootItems.push(candidate.item);
      }

      stack.push(candidate);
    }

    return rootItems;
  };

  waitForUserInput = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    view?: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<unknown> => {
    // replaced any with PromiseConstructor seems to not cause any errors
    if (this._popUp) {
      return Promise.resolve(undefined);
    }

    if (dispatch) {
      dispatch(showSelectionPlaceholder(state));
    }

    const { doc, schema, selection } = state;
    const markType = schema.marks[MARK_LINK];
    if (!markType) {
      return Promise.resolve(undefined);
    }
    const { from, to } = selection;
    const result = findNodesWithSameMark(doc, from, to, markType);
    const href = result ? result.mark.attrs.href : '';
    const selectedText = getSelectedLinkText(doc, from, to, result);

    return new Promise((resolve) => {
      const close = (hrefValue?: string, linkDisplayText?: string): void => {
        if (this._popUp) {
          this._popUp = null;
          resolve(
            hrefValue === undefined
              ? undefined
              : {
                  href: hrefValue,
                  linkDisplayText: linkDisplayText ?? hrefValue,
                }
          );
        }
      };

      this._popUp = { close };

      const runtime = this.getLinkDialogRuntime(view);

      if (runtime?.openLinkDialog) {
        void this.showTocList(view).then((linkItems) => {
          runtime.openLinkDialog(
            href,
            selectedText,
            close,
            () => close(),
            linkItems
          );
        }, () => close());
      } else {
        close();
      }
    });
  };

  executeWithUserInput = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    view?: EditorView,
    value?: LinkToolValue
  ): boolean => {
    if (dispatch) {
      const { selection, schema } = state;
      let { tr } = state;
      (tr as Transform) = view ? hideSelectionPlaceholder(view.state) : tr;
      tr = tr?.setSelection(selection);
      const href = getLinkToolHref(value);
      if (href !== undefined) {
        const markType = schema.marks[MARK_LINK];
        const selectionId = this.getSelectionIdFromHref(href);
        tr = applyLinkValue(
          tr,
          state,
          schema,
          markType,
          href,
          selectionId,
          getLinkDisplayText(value)
        );
      }
      dispatch(tr);
    }
    if (view) {
      view.focus();
    }
    return true;
  };

  cancel(): void {
    return null;
  }
  executeCustom(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }
  executeCustomStyleForTable(_state: EditorState, tr: Transform): Transform {
    return tr;
  }

  getSelectionIdFromHref = (href: string): string | null =>
    href?.startsWith(INNER_LINK_PREFIX)
      ? href.slice(INNER_LINK_PREFIX.length)
      : null;

  getLinkDialogRuntime = (view?: EditorView): LinkDialogRuntime | null => {
    const viewRuntime = (view as EditorView & { runtime?: LinkDialogRuntime })
      ?.runtime;
    return viewRuntime ?? RuntimeService.Runtime;
  };
}

export default LinkSetURLCommand;
