/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

export const CHANGE_BAR_RANGE_CLASS = 'licit-change-bar-range';

export interface ChangeBarRange {
  from: number;
  to: number;
}

export type ChangeBarPositionRange = ChangeBarRange | readonly [number, number];

export interface ChangeBarPluginState {
  changedRanges: ChangeBarRange[];
  decorations: DecorationSet;
}

export interface ChangeBarPluginOptions {
  exposeTestApi?: boolean;
  testRanges?: readonly ChangeBarPositionRange[];
}

export interface ChangeBarTestApi {
  add: (ranges: readonly ChangeBarPositionRange[]) => void;
  clear: () => void;
  get: () => ChangeBarRange[];
  sample: () => void;
  set: (ranges: readonly ChangeBarPositionRange[]) => void;
}

type ChangeBarMeta =
  | { type: 'set'; ranges: readonly ChangeBarPositionRange[] }
  | { type: 'add'; ranges: readonly ChangeBarPositionRange[] }
  | { type: 'clear' };

interface ChangeBar {
  top: number;
  left: number;
  height: number;
}

interface ViewportRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const CHANGE_BAR_GUTTER_OFFSET = 48;
const CHANGE_BAR_LAYER_Z_INDEX = 5;
const CHANGE_BAR_WIDTH = 2;
const MIN_CHANGE_BAR_GUTTER_LEFT = 8;
const MIN_CHANGE_BAR_HEIGHT = 8;
const LINE_TOP_BUCKET_SIZE = 2;

export const DEFAULT_CHANGE_BAR_TEST_RANGES = [
  [16, 34],
  [79, 85],
] as const satisfies readonly ChangeBarPositionRange[];

export const changeBarPluginKey = new PluginKey<ChangeBarPluginState>(
  'ChangeBarPlugin'
);

export default class ChangeBarPlugin extends Plugin<ChangeBarPluginState> {
  constructor(options: ChangeBarPluginOptions = {}) {
    super({
      key: changeBarPluginKey,
      state: {
        init(_config: unknown, state: EditorState): ChangeBarPluginState {
          return createPluginState(
            state.doc,
            toChangeBarRanges(options.testRanges ?? [])
          );
        },
        apply(
          tr: Transaction,
          pluginState: ChangeBarPluginState
        ): ChangeBarPluginState {
          const meta = tr.getMeta(changeBarPluginKey) as
            | ChangeBarMeta
            | undefined;

          if (meta?.type === 'clear') {
            return createPluginState(tr.doc, []);
          }

          const mappedRanges = mapRanges(pluginState.changedRanges, tr);

          if (meta?.type === 'set') {
            return createPluginState(tr.doc, toChangeBarRanges(meta.ranges));
          }

          if (meta?.type === 'add') {
            return createPluginState(tr.doc, [
              ...mappedRanges,
              ...toChangeBarRanges(meta.ranges),
            ]);
          }

          if (tr.docChanged) {
            return createPluginState(tr.doc, mappedRanges);
          }

          return {
            changedRanges: mappedRanges,
            decorations: pluginState.decorations.map(tr.mapping, tr.doc),
          };
        },
      },
      props: {
        decorations(state) {
          return changeBarPluginKey.getState(state)?.decorations;
        },
      },
      view(view) {
        return new ChangeBarView(view, options);
      },
    });
  }
}

class ChangeBarView {
  private readonly layer: HTMLDivElement;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly uninstallTestApi: (() => void) | null;
  private animationFrame = 0;
  private view: EditorView;

  constructor(view: EditorView, options: ChangeBarPluginOptions) {
    this.view = view;
    this.layer = document.createElement('div');
    initializeChangeBarLayer(this.layer);
    view.dom.ownerDocument.body.appendChild(this.layer);

    this.scheduleDraw = this.scheduleDraw.bind(this);
    this.resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(this.scheduleDraw)
        : null;
    this.resizeObserver?.observe(view.dom);
    view.dom.ownerDocument.addEventListener('scroll', this.scheduleDraw, true);
    view.dom.ownerDocument.defaultView?.addEventListener(
      'resize',
      this.scheduleDraw
    );
    this.uninstallTestApi = options.exposeTestApi
      ? installChangeBarTestApi(
          view,
          options.testRanges?.length
            ? options.testRanges
            : DEFAULT_CHANGE_BAR_TEST_RANGES
        )
      : null;
    this.scheduleDraw();
  }

  update(view: EditorView): void {
    this.view = view;
    this.scheduleDraw();
  }

  destroy(): void {
    window.cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    this.view.dom.ownerDocument.removeEventListener(
      'scroll',
      this.scheduleDraw,
      true
    );
    this.view.dom.ownerDocument.defaultView?.removeEventListener(
      'resize',
      this.scheduleDraw
    );
    this.uninstallTestApi?.();
    this.layer.remove();
  }

  private scheduleDraw(): void {
    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = window.requestAnimationFrame(() => this.draw());
  }

  private draw(): void {
    const pluginState = changeBarPluginKey.getState(this.view.state);
    const bars = getChangeBars(this.view, pluginState?.changedRanges ?? []);

    this.layer.style.display = bars.length ? 'block' : 'none';
    this.layer.replaceChildren(
      ...bars.map((bar) => createChangeBarElement(bar))
    );
  }
}

function installChangeBarTestApi(
  view: EditorView,
  sampleRanges: readonly ChangeBarPositionRange[]
): () => void {
  const win = view.dom.ownerDocument.defaultView as
    | (Window & { licitChangeBars?: ChangeBarTestApi })
    | null;

  if (!win) {
    return () => undefined;
  }

  const api: ChangeBarTestApi = {
    add: (ranges) => addChangeBarRanges(view, ranges),
    clear: () => clearChangeBars(view),
    get: () => changeBarPluginKey.getState(view.state)?.changedRanges ?? [],
    sample: () => setChangeBarRanges(view, sampleRanges),
    set: (ranges) => setChangeBarRanges(view, ranges),
  };

  win.licitChangeBars = api;

  return () => {
    if (win.licitChangeBars === api) {
      delete win.licitChangeBars;
    }
  };
}

function initializeChangeBarLayer(layer: HTMLDivElement): void {
  layer.className = 'licit-change-bar-layer';
  layer.contentEditable = 'false';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.inset = '0';
  layer.style.overflow = 'visible';
  layer.style.pointerEvents = 'none';
  layer.style.position = 'fixed';
  layer.style.zIndex = `${CHANGE_BAR_LAYER_Z_INDEX}`;
}

function createChangeBarElement(bar: ChangeBar): HTMLElement {
  const element = document.createElement('span');
  element.className = 'licit-change-bar';
  element.style.background = '#9f9f9f';
  element.style.borderRadius = '1px';
  element.style.height = `${bar.height}px`;
  element.style.left = `${bar.left}px`;
  element.style.position = 'absolute';
  element.style.top = `${bar.top}px`;
  element.style.width = `${CHANGE_BAR_WIDTH}px`;
  return element;
}

function getChangeBars(
  view: EditorView,
  changedRanges: ChangeBarRange[]
): ChangeBar[] {
  if (!changedRanges.length || !view.dom.isConnected) {
    return [];
  }

  const editorDom = view.dom;
  const editorRect = editorDom.getBoundingClientRect();
  const editorStyle =
    editorDom.ownerDocument.defaultView?.getComputedStyle(editorDom);
  const paddingLeft = Number.parseFloat(editorStyle?.paddingLeft ?? '') || 0;
  const barLeft = Math.round(editorRect.left + getGutterLeft(paddingLeft));
  const visibleEditorRect = getVisibleEditorRect(editorDom, editorRect);
  const bars = new Map<number, ChangeBar & { bottom: number }>();

  const addBar = (rect: DOMRect): void => {
    const visibleRect = clipLineRect(rect, visibleEditorRect);

    if (!visibleRect) {
      return;
    }

    const bucketTop =
      Math.round(visibleRect.top / LINE_TOP_BUCKET_SIZE) *
      LINE_TOP_BUCKET_SIZE;
    const top = Math.round(visibleRect.top);
    const bottom = Math.round(visibleRect.bottom);
    const height = Math.max(
      MIN_CHANGE_BAR_HEIGHT,
      Math.round(visibleRect.height)
    );
    const existingBar = bars.get(bucketTop);

    if (!existingBar) {
      bars.set(bucketTop, {
        bottom,
        height,
        left: barLeft,
        top,
      });
      return;
    }

    const mergedTop = Math.min(existingBar.top, top);
    const mergedBottom = Math.max(existingBar.bottom, bottom);
    existingBar.bottom = mergedBottom;
    existingBar.height = Math.max(
      MIN_CHANGE_BAR_HEIGHT,
      mergedBottom - mergedTop
    );
    existingBar.top = mergedTop;
  };

  changedRanges.forEach((range) => {
    getLineRectsFromRange(view, range).forEach(addBar);
  });

  return Array.from(bars.values())
    .sort((a, b) => a.top - b.top)
    .map((bar) => ({
      height: bar.height,
      left: bar.left,
      top: bar.top,
    }));
}

function getGutterLeft(paddingLeft: number): number {
  return Math.max(
    MIN_CHANGE_BAR_GUTTER_LEFT,
    paddingLeft - CHANGE_BAR_GUTTER_OFFSET
  );
}

function getVisibleEditorRect(
  editorDom: HTMLElement,
  editorRect: DOMRect
): ViewportRect {
  const view = editorDom.ownerDocument.defaultView;
  let visibleRect: ViewportRect = {
    bottom: Math.min(view?.innerHeight ?? editorRect.bottom, editorRect.bottom),
    left: Math.max(0, editorRect.left),
    right: Math.min(view?.innerWidth ?? editorRect.right, editorRect.right),
    top: Math.max(0, editorRect.top),
  };
  let parent = editorDom.parentElement;

  while (parent && parent !== editorDom.ownerDocument.body) {
    if (isClippingElement(parent)) {
      visibleRect = intersectRects(visibleRect, parent.getBoundingClientRect());
    }

    parent = parent.parentElement;
  }

  return visibleRect;
}

function isClippingElement(element: HTMLElement): boolean {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const overflow = `${style?.overflow ?? ''} ${style?.overflowX ?? ''} ${
    style?.overflowY ?? ''
  }`;

  return /\b(auto|clip|hidden|scroll)\b/.test(overflow);
}

function intersectRects(
  firstRect: ViewportRect,
  secondRect: ViewportRect
): ViewportRect {
  return {
    bottom: Math.min(firstRect.bottom, secondRect.bottom),
    left: Math.max(firstRect.left, secondRect.left),
    right: Math.min(firstRect.right, secondRect.right),
    top: Math.max(firstRect.top, secondRect.top),
  };
}

function clipLineRect(
  rect: DOMRect,
  visibleRect: ViewportRect
): DOMRect | null {
  if (!isUsableLineRect(rect)) {
    return null;
  }

  const top = Math.max(rect.top, visibleRect.top);
  const bottom = Math.min(rect.bottom, visibleRect.bottom);

  if (bottom <= top) {
    return null;
  }

  return new DOMRect(
    rect.left,
    top,
    rect.width,
    Math.max(MIN_CHANGE_BAR_HEIGHT, bottom - top)
  );
}

function getLineRectsFromRange(
  view: EditorView,
  range: ChangeBarRange
): DOMRect[] {
  const docSize = view.state.doc.content.size;
  const from = clampPosition(Math.min(range.from, range.to), docSize);
  const to = clampPosition(Math.max(range.from, range.to), docSize);
  const textRects = from < to ? getTextRangeLineRects(view, from, to) : [];

  if (textRects.length) {
    return textRects;
  }

  return getFallbackLineRect(view, from);
}

function getTextRangeLineRects(
  view: EditorView,
  from: number,
  to: number
): DOMRect[] {
  try {
    const start = view.domAtPos(from);
    const end = view.domAtPos(to);
    const domRange = view.dom.ownerDocument.createRange();

    domRange.setStart(start.node, start.offset);
    domRange.setEnd(end.node, end.offset);
    const rects = Array.from(domRange.getClientRects()).filter(
      isUsableLineRect
    );
    domRange.detach();
    return rects;
  } catch {
    return [];
  }
}

function getFallbackLineRect(view: EditorView, pos: number): DOMRect[] {
  try {
    const coords = view.coordsAtPos(pos);

    return [
      new DOMRect(
        coords.left,
        coords.top,
        Math.max(1, coords.right - coords.left),
        Math.max(MIN_CHANGE_BAR_HEIGHT, coords.bottom - coords.top)
      ),
    ];
  } catch {
    return [];
  }
}

function isUsableLineRect(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0;
}

export function setChangeBarRanges(
  view: EditorView,
  ranges: readonly ChangeBarPositionRange[]
): void {
  view.dispatch(
    view.state.tr.setMeta(changeBarPluginKey, {
      type: 'set',
      ranges,
    } satisfies ChangeBarMeta)
  );
}

export function addChangeBarRanges(
  view: EditorView,
  ranges: readonly ChangeBarPositionRange[]
): void {
  view.dispatch(
    view.state.tr.setMeta(changeBarPluginKey, {
      type: 'add',
      ranges,
    } satisfies ChangeBarMeta)
  );
}

export function clearChangeBars(view: EditorView): void {
  view.dispatch(
    view.state.tr.setMeta(changeBarPluginKey, {
      type: 'clear',
    } satisfies ChangeBarMeta)
  );
}

export function createChangeBarDecorations(
  doc: Node,
  ranges: readonly ChangeBarPositionRange[]
): DecorationSet {
  const decorations = normalizeRanges(doc, toChangeBarRanges(ranges)).map(
    (range) =>
      Decoration.inline(range.from, range.to, {
        class: CHANGE_BAR_RANGE_CLASS,
      })
  );

  return decorations.length
    ? DecorationSet.create(doc, decorations)
    : DecorationSet.empty;
}

function createPluginState(
  doc: Node,
  ranges: ChangeBarRange[]
): ChangeBarPluginState {
  const changedRanges = normalizeRanges(doc, ranges);

  return {
    changedRanges,
    decorations: createChangeBarDecorations(doc, changedRanges),
  };
}

function mapRanges(ranges: ChangeBarRange[], tr: Transaction): ChangeBarRange[] {
  if (!ranges.length) {
    return [];
  }

  return mergeRanges(
    ranges
      .map((range) => ({
        from: tr.mapping.map(range.from, -1),
        to: tr.mapping.map(range.to, 1),
      }))
      .filter((range) => range.from < range.to)
  );
}

function normalizeRanges(doc: Node, ranges: ChangeBarRange[]): ChangeBarRange[] {
  return mergeRanges(
    ranges.flatMap((range) => resolveDocumentRanges(doc, range.from, range.to))
  );
}

function toChangeBarRanges(
  ranges: readonly ChangeBarPositionRange[]
): ChangeBarRange[] {
  return ranges.map((range): ChangeBarRange => {
    if (isChangeBarPositionTuple(range)) {
      const [from, to] = range;

      return { from, to };
    }

    return {
      from: range.from,
      to: range.to,
    };
  });
}

function isChangeBarPositionTuple(
  range: ChangeBarPositionRange
): range is readonly [number, number] {
  return Array.isArray(range);
}

function resolveDocumentRanges(
  doc: Node,
  from: number,
  to: number
): ChangeBarRange[] {
  const docSize = doc.content.size;
  const safeFrom = clampPosition(from, docSize);
  const safeTo = clampPosition(to, docSize);
  const min = Math.min(safeFrom, safeTo);
  const max = Math.max(safeFrom, safeTo);
  const ranges = min < max ? getTextblockRanges(doc, min, max) : [];

  if (ranges.length) {
    return ranges;
  }

  return getFallbackRange(doc, min);
}

function getTextblockRanges(
  doc: Node,
  from: number,
  to: number
): ChangeBarRange[] {
  const ranges: ChangeBarRange[] = [];

  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) {
      return true;
    }

    const blockFrom = pos + 1;
    const blockTo = pos + node.nodeSize - 1;
    const rangeFrom = Math.max(from, blockFrom);
    const rangeTo = Math.min(to, blockTo);

    if (rangeFrom < rangeTo) {
      ranges.push({
        from: rangeFrom,
        to: rangeTo,
      });
    }

    return false;
  });

  return ranges;
}

function getFallbackRange(doc: Node, pos: number): ChangeBarRange[] {
  const docSize = doc.content.size;

  if (docSize <= 0) {
    return [];
  }

  const $pos = doc.resolve(clampPosition(pos, docSize));

  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);

    if (!node.isTextblock) {
      continue;
    }

    const from = $pos.start(depth);
    const to = $pos.end(depth);

    if (from < to) {
      return [
        {
          from: Math.max(from, Math.min(pos, to - 1)),
          to: Math.min(to, Math.max(pos + 1, from + 1)),
        },
      ];
    }
  }

  return [];
}

function mergeRanges(ranges: ChangeBarRange[]): ChangeBarRange[] {
  const sortedRanges = ranges
    .filter((range) => Number.isFinite(range.from) && range.from < range.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);

  return sortedRanges.reduce((merged, range) => {
    const previous = merged.at(-1);

    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to);
      return merged;
    }

    merged.push({ ...range });
    return merged;
  }, [] as ChangeBarRange[]);
}

function clampPosition(pos: number, docSize: number): number {
  return Math.max(0, Math.min(pos, docSize));
}
