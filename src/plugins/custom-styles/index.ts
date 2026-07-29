/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {
  Plugin,
  PluginKey,
  EditorState,
  Selection,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import { canJoin, Transform } from 'prosemirror-transform';
import {
  applyLatestStyle,
  getMarkByStyleName,
  applyLineStyle,
  applyStyleToEachNode,
} from './CustomStyleCommand';
import {
  getCustomStyleByName,
  setStyleRuntime,
  setHidenumberingFlag,
  isStylesLoaded,
  setView,
  setCustomStylesOnLoad,
} from './customStyle';
import { RESERVED_STYLE_NONE } from './CustomStyleNodeSpec';
import { getLineSpacingValue } from '../../commands';
import { findParentNodeClosestToPos } from 'prosemirror-utils';
import { Fragment, Mark, Node, Schema, Slice } from 'prosemirror-model';
import { CustomstyleDropDownCommand } from './ui/CustomstyleDropDownCommand';
import { applyEffectiveSchema } from './EditorSchema';
import type { StyleRuntime } from './StyleRuntime';
import {
  applyStoredTableStyleAtSelection,
} from '../../licit/extensions/tableEx/tableStyle';
export * from './StyleRuntime';

const ENTERKEYCODE = 13;
const BACKSPACEKEYCODE = 8;
const DELETEKEYCODE = 46;
const ENTERKEY = 'Enter';
const BACKSPACEKEY = 'Backspace';
const DELETEKEY = 'Delete';
const PARA_POSITION_DIFF = 4;
const ATTR_STYLE_NAME = 'styleName';
const TABLE_STYLE_NAME_ATTRIBUTE = 'tableStyleName';
const ZERO_WIDTH_SPACE = '\u200B';
const ENHANCED_TABLE_FIGURE_BODY = 'enhanced_table_figure_body';
const DEFAULT_CHUNK_BUDGET_MS = 100;
const DEFAULT_CHUNK_IDLE_MS = 50;

export type CustomstylePluginOptions = {
  chunkBudgetMs?: number;
  chunkIdleMs?: number;
};

type CustomStyleView = Plugin['spec']['view'] extends (view: infer T) => unknown
  ? T & { input?: { lastKeyCode?: number } }
  : { state: EditorState; input?: { lastKeyCode?: number } };

type TrLike = Transaction | null;
type NodeWithPos = { node: Node; pos: number };
type SliceLike = Slice | null;
type SliceNodeInfo = {
  pos: number;
  endPos: number;
  node: Node;
  styleName: string;
  isTable: boolean;
  hasParentAttrs: boolean;
  needsMarkup: boolean;
};
type StyleWithNextLine = {
  styleName?: string;
  styles?: {
    align?: unknown;
    indent?: unknown;
    indentPosition?: unknown;
    lineHeight?: string;
    nextLineStyleName?: string;
  };
};
type LooseState = {
  doc?: Node;
  selection?: EditorState['selection'];
  tr?: Transaction;
  schema?: Schema;
};
type LooseTr = Transaction | null;
type LooseView = {
  state?: EditorState;
  input?: { lastKeyCode?: number };
};
type CSView = CustomStyleView | LooseView | null;
type KeyInput = string | number | null | undefined;
let slice1: Slice | null = null;
let styleChunkTimer: ReturnType<typeof setTimeout> | null = null;
let styleChunkLastInteractionAt = 0;
// TEMP: tracks wall-clock start time of the initial style application pass
// so the total time-to-complete can be logged when all styles are applied.
let styleApplyStartTime = 0;

function isBackspaceKey(key: KeyInput): boolean {
  return BACKSPACEKEY === key || BACKSPACEKEYCODE === key;
}

function isDeleteKey(key: KeyInput): boolean {
  return DELETEKEY === key || DELETEKEYCODE === key;
}

function isEnterKey(key: KeyInput): boolean {
  return ENTERKEY === key || ENTERKEYCODE === key;
}

function isEnhancedTableFigureBody(node?: Node | null): boolean {
  return node?.type?.name === ENHANCED_TABLE_FIGURE_BODY;
}

function isEnhancedTableFigureImageParagraph(
  paragraph?: Node | null,
  parentContainer?: Node | null
): boolean {
  return (
    paragraph?.type?.name === 'paragraph' &&
    paragraph.childCount === 1 &&
    paragraph.firstChild?.type?.name === 'image' &&
    isEnhancedTableFigureBody(parentContainer)
  );
}

function isSelectionInEnhancedTableFigureImageParagraph(
  selection?: EditorState['selection']
): boolean {
  const $from = selection?.$from;
  if (!$from || typeof $from.node !== 'function') {
    return false;
  }
  const paragraph = $from.parent ?? $from.node($from.depth);
  const parentContainer =
    $from.depth > 0 ? $from.node($from.depth - 1) : null;
  return isEnhancedTableFigureImageParagraph(paragraph, parentContainer);
}

function getSelectionCursor(
  selection: Selection | null | undefined
): { pos?: number } | null {
  return (
    (selection as Selection & { $cursor?: { pos?: number } })?.$cursor ?? null
  );
}

const isNodeHasAttribute = (
  node: Node | null | undefined,
  attrName: string
): boolean => {
  return attrName in (node?.attrs || {});
};
const requiredAddAttr = (node: Node | null | undefined): boolean => {
  return (
    'paragraph' === node?.type?.name &&
    isNodeHasAttribute(node, ATTR_STYLE_NAME)
  );
};

export class CustomstylePlugin extends Plugin {
  constructor(
    runtime: StyleRuntime,
    hideNumbering?: boolean,
    options?: CustomstylePluginOptions
  ) {
    let csview: CustomStyleView | null = null;
    let pendingKey: string | null = null;
    let firstTime = true;
    let loaded = false;
    const chunkBudgetMs = options?.chunkBudgetMs ?? DEFAULT_CHUNK_BUDGET_MS;
    const chunkIdleMs = options?.chunkIdleMs ?? DEFAULT_CHUNK_IDLE_MS;
    // Internal continuation position for time-based batched style application.
    // When non-null, appendTransaction knows it should resume from this pos.
    let resumePos: number | null = null;

    // Schedule the next time-based style batch. Uses setTimeout(0) to yield
    // to the browser (pending user input is processed first). During initial
    // load (no user interaction yet), batches fire ASAP. Once the user has
    // interacted, batches only fire after chunkIdleMs of idle time so active
    // editing is not interrupted.
    const scheduleNextChunk = (nextPos: number) => {
      if (!csview || typeof nextPos !== 'number') {
        return;
      }
      if (styleChunkTimer !== null) {
        clearTimeout(styleChunkTimer);
        styleChunkTimer = null;
      }
      const tick = () => {
        styleChunkTimer = null;
        if (!csview?.dispatch || (csview as { isDestroyed?: boolean }).isDestroyed) {
          return;
        }
        // During initial load (no interaction yet), dispatch immediately.
        // Once the user has interacted, wait for chunkIdleMs of idle time
        // before dispatching so we don't block active typing/editing.
        if (
          styleChunkLastInteractionAt > 0 &&
          Date.now() - styleChunkLastInteractionAt < chunkIdleMs
        ) {
          styleChunkTimer = setTimeout(tick, chunkIdleMs);
          return;
        }
        resumePos = nextPos;
        const hadFocus =
          typeof (csview as { hasFocus?: () => boolean }).hasFocus === 'function'
            ? (csview as { hasFocus: () => boolean }).hasFocus()
            : false;
        const continuationTr = (
          csview as { state: EditorState }
        ).state.tr.setMeta('addToHistory', false);
        (csview as { dispatch: (tr: Transaction) => void }).dispatch(continuationTr);
        if (
          hadFocus &&
          typeof (csview as { hasFocus?: () => boolean }).hasFocus === 'function' &&
          !(csview as { hasFocus: () => boolean }).hasFocus()
        ) {
          (csview as { focus: () => void }).focus();
        }
      };
      // setTimeout(0) yields to the browser — any pending input events are
      // processed before the callback fires.
      styleChunkTimer = setTimeout(tick, 0);
    };

    super({
      key: new PluginKey('CustomstylePlugin'),
      state: {
        init() {
          loaded = false;
          firstTime = true;
          setStyleRuntime(runtime);
          setCustomStylesOnLoad();
        },
        apply(tr) {
          remapCounterFlags(tr);
        },
      },
      view: (view) => {
        // dummy plugin view so that EditorView is accessible when refreshing the document
        // to apply styles after getting the styles.
        csview = view;
        setView(csview);
        setHidenumberingFlag(hideNumbering || false);
        return {
          update: () => {
            /* This is intentional */
          },
          destroy: () => {
            /* This is intentional */
          },
        };
      },

      props: {
        handlePaste(_view, _event, slice) {
          if ((slice.content as unknown as Slice)?.content[0]?.attrs) {
            slice1 = slice;
          }
          return false;
        },
        handleDOMEvents: {
          keydown(view, event) {
            styleChunkLastInteractionAt = Date.now();
            csview = view;
            pendingKey = event.key;
          },
          keyup(_view, event) {
            if (pendingKey === event.key) {
              pendingKey = null;
            }
          },
          mousedown(view) {
            styleChunkLastInteractionAt = Date.now();
            csview = view;
            return false;
          },
          focus(view) {
            styleChunkLastInteractionAt = Date.now();
            csview = view;
            return false;
          },
          blur() {
            pendingKey = null;
          },
        },
        nodeViews: {},
      },
      appendTransaction: (transactions, prevState, nextState) => {
        let tr: TrLike = null;
        const ref = { firstTime, loaded, currentKey: pendingKey };
        const isChunking = resumePos !== null;
        if (!loaded || isChunking) {
          const startPos = isChunking ? resumePos : 0;
          if (isChunking) {
            resumePos = null;
          }
          tr = onInitAppendTransaction(
            ref,
            tr,
            nextState,
            startPos,
            chunkBudgetMs,
            scheduleNextChunk
          );
          if (tr?.docChanged) {
            tr.setMeta('styleInitialLoad', true);
          }
        } else if (isDocChanged(transactions)) {
          // Avoid infinite recursion: skip when any plugin-generated update already is present.

          tr = onUpdateAppendTransaction(
            ref,
            tr,
            nextState,
            prevState,
            csview,
            transactions,
            slice1
          );
          pendingKey = null;
        }
        firstTime = ref.firstTime;
        loaded = ref.loaded;
        if (tr?.docChanged) {
          slice1 = null;
        }
        return tr;
      },
    });
  }

  initButtonCommands() {
    return {
      '[H1] Header 1': CustomstyleDropDownCommand,
    };
  }

  static setLevelCounter(styleCounter) {
    document.documentElement.style.counterSet = `C1 ${styleCounter - 1}`;
  }

  getEffectiveSchema(schema: Schema) {
    schema = applyEffectiveSchema(schema);
    const nodes = schema.spec.nodes;
    const marks = schema.spec.marks;

    return new Schema({
      nodes: nodes,
      marks: marks,
    });
  }
}

export function onInitAppendTransaction(
  ref: { loaded?: boolean; firstTime?: boolean },
  tr: LooseTr,
  nextState: LooseState,
  startPos: number = 0,
  budgetMs: number = DEFAULT_CHUNK_BUDGET_MS,
  scheduleNext: ((nextPos: number) => void) | null = null
): LooseTr {
  ref.loaded = isStylesLoaded();
  if (ref.loaded) {
    if (startPos === 0) {
      styleApplyStartTime = Date.now();
    }
    const result = applyStylesTimeBatched(nextState, startPos, budgetMs);
    if (!result.done && scheduleNext) {
      // Continue batched style application asynchronously so host app
      // focus/update work does not break the appendTransaction chain.
      scheduleNext(result.lastPos);
    } else if (result.done) {
      // TEMP: log when all styles have finished applying to the document.
      const elapsedMs = Date.now() - styleApplyStartTime;
      console.warn(
        `[CustomstylePlugin] All styles applied to document in ${elapsedMs}ms.`
      );
    }
    tr = result.tr;
  }

  return tr;
}

export function onUpdateAppendTransaction(
  ref: { firstTime?: boolean; loaded?: boolean; currentKey?: KeyInput },
  tr: LooseTr,
  nextState: EditorState,
  prevState: EditorState,
  csview: CSView,
  transactions: readonly Transaction[],
  slice1: SliceLike
): LooseTr {
  tr = applyStyleForEmptyParagraph(nextState, tr);
  ref.firstTime = false;

  tr = handleUpdateKeyStyling(
    prevState,
    nextState,
    tr,
    csview,
    ref.currentKey
  );

  const isPaste = transactions.length && transactions[0].getMeta('paste');
  tr = applyLineStyleForBoldPartial(nextState, tr, isPaste);
  tr = handlePasteUpdateStyling(
    isPaste,
    slice1,
    prevState,
    nextState,
    csview,
    tr
  );
  if (isPaste) {
    tr = applyStoredTableStyleAtSelection(
      nextState,
      tr ?? nextState.tr
    ) as Transaction;
  }

  return tr;
}

function handleUpdateKeyStyling(
  prevState: LooseState,
  nextState: LooseState,
  tr: LooseTr,
  csview: CSView,
  currentKey?: KeyInput
): LooseTr {
  if (!csview) {
    return tr;
  }

  let lastKey = currentKey ?? csview.input?.lastKeyCode;
  if (currentKey === null) {
    lastKey = null;
  }

  if (isBackspaceKey(lastKey)) {
    const updatedTr = handleBackspaceStyleUpdate(prevState, nextState, tr);
    if (updatedTr) {
      return updatedTr;
    }
  }

  if (isDeleteKey(lastKey)) {
    const updatedTr = handleDeleteStyleUpdate(prevState, nextState, tr);
    if (updatedTr) {
      return updatedTr;
    }
  }

  if (!isEnterKey(lastKey)) {
    return tr;
  }

  if (tr.selection.$from.start() === tr.selection.$from.end()) {
    return applyStyleForNextParagraph(prevState, nextState, tr, csview, lastKey);
  }
  return tr;
}

function handleBackspaceStyleUpdate(
  prevState: LooseState,
  nextState: LooseState,
  tr: LooseTr
): LooseTr | null {

  const paraPositionDiff = prevState.selection.from - nextState.selection.from;
  if (paraPositionDiff !== 2 && paraPositionDiff !== 0) {
    return null;
  }

  const selectionHead = tr.selection?.$head;
  if (!selectionHead) {
    return tr;
  }

  const para = findCurrentParagraph(selectionHead, nextState.schema);
  if (!para) {
    return tr;
  }

  return reapplyParagraphStyle(nextState, tr, para);
}

function handleDeleteStyleUpdate(
  prevState: LooseState,
  nextState: LooseState,
  tr: LooseTr
): LooseTr | null {
  if (!isDeleteParagraphJoin(prevState, nextState)) {
    return null;
  }

  const selectionHead = tr?.selection?.$head;
  if (!selectionHead) {
    return tr;
  }

  const para = findCurrentParagraph(selectionHead, nextState.schema);
  if (!para) {
    return tr;
  }

  return reapplyParagraphStyle(nextState, tr, para);
}

function isDeleteParagraphJoin(
  prevState: LooseState,
  nextState: LooseState
): boolean {
  const prevSelection = prevState.selection;
  const nextSelection = nextState.selection;
  const $from = prevSelection?.$from;

  if (
    !prevState.doc ||
    !prevSelection?.empty ||
    !nextSelection?.empty ||
    !$from ||
    $from.depth === 0 ||
    prevSelection.from !== nextSelection.from
  ) {
    return false;
  }

  if ($from.parentOffset !== $from.parent.content.size) {
    return false;
  }

  return canJoin(prevState.doc, $from.after());
}

function findCurrentParagraph(selectionHead, schema) {
  return findParentNodeClosestToPos(selectionHead, (node: Node) => {
    return node.type === schema.nodes.paragraph;
  });
}

function reapplyParagraphStyle(
  nextState: LooseState,
  tr: LooseTr,
  para
): LooseTr {
  let styleName = para.node.attrs.styleName;
  if (RESERVED_STYLE_NONE === styleName || undefined === styleName) {
    const newattrs = { ...para.node.attrs, styleName: RESERVED_STYLE_NONE };
    tr = tr.setNodeMarkup(para.pos, undefined, newattrs);
    styleName = RESERVED_STYLE_NONE;
  }

  tr = applyLatestStyle(styleName, nextState as EditorState, tr, {
    node: para.node,
    startPos: para.pos,
    endPos: para.pos + para.node.nodeSize - 1,
  }) as Transaction;

  return tr.setSelection(
    TextSelection.create(tr.doc, nextState.selection.from)
  );
}

function handlePasteUpdateStyling(
  isPaste,
  slice1: SliceLike,
  prevState: LooseState,
  nextState: LooseState,
  csview: CSView,
  tr: LooseTr
): LooseTr {
  if (!isPaste) {
    return tr;
  }

  if (slice1 && slice1.content.childCount > 20) {
    tr = applyMinimalPasteStyling(slice1, prevState, nextState, csview, tr);
  } else if (slice1) {
    tr = optimizedPasteHandler(slice1, prevState, nextState, csview, tr);
  }

  return tr?.scrollIntoView();
}

// NEW: Minimal styling for large pastes
function applyMinimalPasteStyling(
  slice1: SliceLike,
  prevState: LooseState,
  nextState: LooseState,
  csview: CSView,
  tr: LooseTr
): LooseTr {
  // Only set styleName attributes without calling expensive style functions
  const demoPos = prevState.selection.from;
  const parentNode = prevState.doc.resolve(demoPos).parent;
  const defaultStyle = parentNode.attrs?.styleName ?? RESERVED_STYLE_NONE;

  let currentPos = csview.state.selection.$from.before(
    csview.state.selection.$from.depth === 0
      ? 1
      : csview.state.selection.$from.depth
  );

  // Just set attributes, skip applyLatestStyle and applyStyleToEachNode
  forEachSliceNode(slice1, (sliceNode, index) => {
    if (sliceNode.type.name === 'table' || sliceNode.type.name === 'doc') {
      return;
    }

    if (index === 0) {
      currentPos = csview.state.selection.from - 1;
    }

    const targetNode = nextState.tr.doc.nodeAt(currentPos);
    if (!targetNode) {
      return;
    }

    const styleName = sliceNode.attrs?.styleName ?? defaultStyle;
    const newattrs = { ...targetNode.attrs, styleName };

    // Only set markup, skip expensive style application
    tr = tr.setNodeMarkup(currentPos, undefined, newattrs);

    currentPos += targetNode.nodeSize;
  });

  return tr;
}

// OPTIMIZED: For small pastes - batch all markup changes first
function optimizedPasteHandler(
  slice1: SliceLike,
  prevState: LooseState,
  nextState: LooseState,
  csview: CSView,
  tr: LooseTr
): LooseTr {
  const demoPos = prevState.selection.from;
  const parentNode = prevState.doc.resolve(demoPos).parent;
  const hasParentAttrs = !!parentNode.content?.content[0]?.attrs;

  const currentPos = csview.state.selection.$from.before(
    csview.state.selection.$from.depth === 0
      ? 1
      : csview.state.selection.$from.depth
  );

  // STEP 1: Collect node information
  const nodeInfos = collectNodeInfos(
    slice1,
    demoPos,
    hasParentAttrs,
    currentPos,
    csview,
    nextState,
    parentNode
  );

  // STEP 2: Apply fast markups first
  tr = applyAllMarkups(nodeInfos, tr);

  // STEP 3 & 4: Group by style and apply styles per group
  tr = applyGroupedStyles(nodeInfos, nextState, tr);

  return tr;
}

function collectNodeInfos(
  slice: SliceLike,
  demoPos: number,
  hasParentAttrs: boolean,
  startPos: number,
  csview: CSView,
  nextState: LooseState,
  parentNode: Node
): SliceNodeInfo[] {
  const infos: SliceNodeInfo[] = [];
  let currentPos = startPos;

  forEachSliceNode(slice, (sliceNode, index) => {
    if (sliceNode.type.name === 'table' || sliceNode.type.name === 'doc') {
      return;
    }

    const currentNode =
      index === 0
        ? csview.state.tr.doc.nodeAt(currentPos)
        : csview.state.tr.doc.nodeAt(demoPos);

    if (index === 0 && !hasParentAttrs && currentNode?.type?.name !== 'table') {
      currentPos = csview.state.selection.from - 1;
    }

    const targetNode = nextState.tr.doc.nodeAt(currentPos);
    if (!targetNode) {
      return;
    }

    const endPos = currentPos + targetNode.nodeSize;

    let styleName: string;
    if (hasParentAttrs) {
      styleName = parentNode.attrs.styleName ?? 'Normal';
    } else if (currentNode?.type?.name === 'table') {
      styleName = sliceNode.attrs.styleName ?? 'Normal';
    } else {
      styleName =
        null === sliceNode?.attrs?.styleName
          ? targetNode?.attrs?.styleName
          : sliceNode?.attrs?.styleName;
      styleName = styleName ?? RESERVED_STYLE_NONE;
    }

    infos.push({
      pos: currentPos,
      endPos:
        hasParentAttrs || currentNode?.type?.name === 'table'
          ? endPos
          : endPos - 1,
      node: targetNode,
      styleName,
      isTable: currentNode?.type?.name === 'table',
      hasParentAttrs,
      needsMarkup: !hasParentAttrs && currentNode?.type?.name !== 'table',
    });

    currentPos = endPos;
  });

  return infos;
}

function applyAllMarkups(nodeInfos: SliceNodeInfo[], tr: LooseTr): LooseTr {
  for (const info of nodeInfos) {
    if (info.needsMarkup) {
      const newattrs = { ...info.node.attrs, styleName: info.styleName };
      tr = tr.setNodeMarkup(info.pos, undefined, newattrs);
    }
  }
  return tr;
}

function applyGroupedStyles(
  nodeInfos: SliceNodeInfo[],
  nextState: LooseState,
  tr: LooseTr
): LooseTr {
  const styleGroups = new Map<string, SliceNodeInfo[]>();
  for (const info of nodeInfos) {
    const key = `${info.styleName}-${info.hasParentAttrs}`;
    if (!styleGroups.has(key)) {
      styleGroups.set(key, []);
    }
    styleGroups.get(key).push(info);
  }

  const opt = 1;
  for (const infos of styleGroups.values()) {
    const info = infos[0];
    if (info.hasParentAttrs) {
      const styleProp = getCustomStyleByName(info.styleName);
      for (const nodeInfo of infos) {
        tr = applyStyleToEachNode(
          nextState as EditorState,
          nodeInfo.pos,
          nodeInfo.endPos,
          tr,
          styleProp,
          info.styleName
        ) as Transaction;
      }
    } else {
      for (const nodeInfo of infos) {
        tr = applyLatestStyle(
          info.styleName ?? '',
          nextState as EditorState,
          tr,
          {
            node: nodeInfo.node,
            startPos: nodeInfo.pos,
            endPos: nodeInfo.endPos,
            opt,
          },
          null
        ) as Transaction;
      }
    }
  }

  return tr;
}

function forEachSliceNode(
  slice: SliceLike,
  callback: (node: Node, index: number) => void
): void {
  const content = slice?.content;
  if (!content) {
    return;
  }
  if (typeof content.forEach === 'function') {
    const size = content.childCount;
    for (let i = 0; i < size; i++) {
      const node = content.child(i);
      callback(node, i);
    }
    return;
  }
  if (Array.isArray(content?.content)) {
    for (const [index, item] of content.content.entries()) {
      callback(item, index);
    }
    return;
  }
  if (Array.isArray(content)) {
    for (const [index, item] of (content as Node[]).entries()) {
      callback(item, index);
    }
  }
}

//LIC-254 Create new line by placing cursor at the beginning of a paragraph applies the current style instead of Normal style
export function applyStyleForPreviousEmptyParagraph(
  nextState: LooseState,
  tr: LooseTr
): LooseTr {
  const selection = tr.selection;
  if (selection.$from.parentOffset === 0) {
    const previousNodeEndPos = selection.$anchor.pos - 1;
    const prevNode = nextState.doc.resolve(previousNodeEndPos).nodeBefore;
    if (prevNode) {
      const style = getCustomStyleByName(prevNode.attrs.styleName);
      const emptyParaStyleName =
        prevNode.attrs.styleName === style?.styles?.nextLineStyleName
          ? prevNode?.attrs?.styleName
          : RESERVED_STYLE_NONE;
      const previousNodeStartPos = Math.max(
        previousNodeEndPos - prevNode.nodeSize,
        0
      );
      tr = applyLatestStyle(
        emptyParaStyleName,
        nextState as EditorState,
        tr,
        {
          node: prevNode,
          startPos: previousNodeStartPos,
          endPos:
            previousNodeStartPos +
            (prevNode.content?.size ?? Math.max(prevNode.nodeSize - 2, 0)),
        },
        null
      ) as Transaction;
    }
  }
  return tr;
}

export function applyStoredMarksAfterHardBreak(
  nextState: EditorState,
  tr: Transform
): Transform {
  if (!tr) {
    tr = nextState.tr;
  }
  const { selection, schema } = nextState;

  // ? Cast to TextSelection to access $cursor
  const textSelection = selection as TextSelection;
  const currentPos = textSelection.$cursor
    ? textSelection.$cursor.pos
    : selection.$from.pos;

  // Find the parent paragraph
  const para = findParentNodeClosestToPos(
    nextState.doc.resolve(currentPos),
    (node) => node.type === schema.nodes.paragraph
  );
  if (!para) return tr;
  const styleName = para.node.attrs?.styleName;
  if (!styleName || styleName === RESERVED_STYLE_NONE) return tr;
  // Get the marks defined by this custom style
  const marks = getMarkByStyleName(styleName, schema);
  if (!marks || marks.length === 0) return tr;
  // Set them as storedMarks so next typed character inherits them
  for (const mark of marks) {
    tr = (tr as Transaction).addStoredMark(mark);
  }
  return tr;
}

export function remapCounterFlags(tr: LooseTr): void {
  // Depending on the window variables,
  // set counters for numbering.
  const cFlags = tr.doc.attrs.counterFlags;
  for (const key in cFlags) {
    if (Object.hasOwn(cFlags, key)) {
      window[key] = true;
    }
  }
}

export function applyStyles(state: LooseState, tr?: LooseTr): LooseTr {
  tr ??= state.tr;
  tr?.doc?.descendants((child, pos, parent) => {
    const contentLen = child.content.size;
    if (
      !isEnhancedTableFigureImageParagraph(child, parent) &&
      haveEligibleChildren(child, contentLen)
    ) {
      const docLen = tr.doc.content.size;
      // Validate end position.
      const end = Math.min(pos + contentLen, docLen);
      // check if the loaded document's para have valid styleName
      const styleName = child.attrs.styleName ?? RESERVED_STYLE_NONE;
      tr = applyLatestStyle(styleName, state as EditorState, tr, {
        node: child,
        startPos: pos,
        endPos: end,
      }) as Transaction;
    }
  });
  return tr;
}

// Apply styles using a time-based budget. Processes nodes from startPos until
// the time budget (budgetMs) is exhausted, then returns the last processed
// position so the caller can schedule the next batch.
export function applyStylesTimeBatched(
  state: LooseState,
  startPos: number = 0,
  budgetMs: number = DEFAULT_CHUNK_BUDGET_MS
): { tr: Transaction; lastPos: number; done: boolean } {
  let tr = state.tr ?? null;
  if (!tr) {
    return { tr: null, lastPos: startPos, done: true };
  }
  const docSize = tr.doc.content.size;
  const startTime = Date.now();
  let lastPos = startPos;
  let stopped = false;

  tr.doc.nodesBetween(startPos, docSize, (child: Node, pos: number) => {
    if (stopped || pos < startPos) {
      return true;
    }
    // Check time budget after each eligible node. If exceeded, stop
    // processing — remaining nodes will be handled in the next batch.
    if (Date.now() - startTime >= budgetMs) {
      stopped = true;
      return false;
    }

    const contentLen = child.content.size;
    if (haveEligibleChildren(child, contentLen)) {
      const docLen = tr.doc.content.size;
      const end = Math.min(pos + contentLen, docLen);
      const styleName = child.attrs?.styleName ?? RESERVED_STYLE_NONE;
      tr = applyLatestStyle(styleName, state as EditorState, tr, {
        node: child,
        startPos: pos,
        endPos: end,
      }) as Transaction;
      lastPos = Math.max(lastPos, pos + child.nodeSize);
      // Don't descend into the paragraph's inline/text children —
      // applyLatestStyle already handled its content.
      return false;
    }
    return true;
  });

  const done = !stopped;
  return {
    tr,
    lastPos: done ? docSize : lastPos,
    done,
  };
}

function validateStyleName(node: Node | null | undefined): boolean {
  return 'styleName' in (node?.attrs || {});
}

// get all the nodes having styleName attribute
export function nodeAssignment(state: LooseState): NodeWithPos[] {
  const nodes: NodeWithPos[] = [];
  state.doc.descendants((node, pos) => {
    if (requiredAddAttr(node)) {
      nodes.push({
        node,
        pos,
      });
    }
  });
  return nodes;
}

// FIX: Style with First Word Bold and Continue is not showing properly when entering text in a new paragraph
function applyLineStyleForBoldPartial(
  nextState: LooseState,
  tr: LooseTr,
  isPaste: boolean
): LooseTr {
  const { selection, schema } = nextState;
  const currentPos = getSelectionCursor(selection)?.pos ?? selection.$to.pos;
  const para = findParentNodeClosestToPos(
    nextState.doc.resolve(currentPos),
    (node: Node) => {
      return node.type === schema.nodes.paragraph;
    }
  );
  if (para) {
    const { pos, node } = para;
    if (!tr) {
      tr = nextState.tr;
    }
    // Check styleName is available for node
    if (validateStyleName(node)) {
      const style = getCustomStyleByName(node.attrs.styleName);
      if (style?.styles?.boldPartial) {
        tr = applyLineStyle(
          nextState as EditorState,
          tr,
          node,
          pos
        ) as Transaction;
      }
      if (style?.styles?.indentPosition) {
        tr = removeResolvedHangingIndentAnchors(tr, nextState, pos);
        tr = applyHangingIndentTransform(
          tr,
          nextState as EditorState,
          node,
          pos,
          isPaste
        );
      }
    }
  }
  return tr;
}

export function applyStyleForEmptyParagraph(
  nextState: LooseState,
  tr: LooseTr
): LooseTr {
  const opt = 1;
  tr ??= nextState.tr;
  if (isSelectionInEnhancedTableFigureImageParagraph(nextState.selection)) {
    return tr;
  }
  const startPos = nextState.selection?.$from.before(
    nextState.selection?.$from.depth === 0
      ? 1
      : nextState.selection?.$from.depth
  );
  const endPos = nextState.selection?.$to?.end();

  const node = nextState.tr?.doc?.nodeAt(startPos);
  const style = getCustomStyleByName(node?.attrs?.styleName);
  if (!style?.styles?.isList) {
    if (validateStyleName(node)) {
      if (
        node.content?.content &&
        0 < node.content.content.length &&
        0 === node.content.content[0].marks?.length
      ) {
        tr = applyLatestStyle(
          node.attrs.styleName ?? RESERVED_STYLE_NONE,
          nextState as EditorState,
          tr,
          {
            node,
            startPos,
            endPos,
            opt,
          },
          null
        ) as Transaction;
      }
    }
  }
  return tr;
}

export function applyStyleForNextParagraph(
  prevState: LooseState,
  nextState: LooseState,
  tr: LooseTr,
  view: CSView,
  currentKey?: KeyInput
): LooseTr {
  tr ??= nextState.tr;
  if (!nextState?.selection) {
    return tr;
  }

  const { $from } = nextState.selection;
  if (!view || !isNewParagraph(prevState, nextState, view, currentKey)) {
    return null;
  }

  const context = getNextParagraphStyleContext(prevState, nextState, $from);
  if (!context) {
    return null;
  }
  // Select style for next line not working continuously for more that 2 paragraphs
  tr = tr.setNodeMarkup(context.nextNodePos, undefined, context.attrs);

  const marks = getMarkByStyleName(context.styleName, nextState.schema);
  return addStoredMarksForTextContent(tr, context.nextNode, marks);
}

function getNextParagraphStyleContext(
  prevState: LooseState,
  nextState: LooseState,
  $from: EditorState['selection']['$from']
): {
  attrs: Record<string, unknown>;
  nextNode: Node;
  nextNodePos: number;
  styleName: string;
} | null {
  const prevParagraph = findPreviousParagraph($from);
  if (!requiredAddAttr(prevParagraph)) {
    return null;
  }

  const nextNodePos = nextState.selection.from - 1;
  const nextNode = nextState.doc.nodeAt(nextNodePos);
  if (!isActiveNextParagraph(nextNode, nextNodePos, prevState, nextState)) {
    return null;
  }

  const tableStyleName = getEnclosingTableStyleName($from);
  const style = tableStyleName
    ? getTableContinuationStyle(tableStyleName)
    : getCustomStyleByName(prevParagraph.attrs.styleName);
  if (!style?.styles?.nextLineStyleName) {
    return null;
  }

  const attrs = getNextParagraphAttrs(prevParagraph, style, prevState, $from);
  const styleName =
    tableStyleName ?? getNextParagraphStyleName(style, $from);
  if (tableStyleName) {
    attrs.styleName = tableStyleName;
  }
  return { attrs, nextNode, nextNodePos, styleName };
}

function getEnclosingTableStyleName(
  $from: EditorState['selection']['$from']
): string | null {
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name !== 'table') {
      continue;
    }

    if (node.attrs?.vignette === true || node.attrs?.vignette === 'true') {
      return null;
    }

    const styleName = node.attrs?.[TABLE_STYLE_NAME_ATTRIBUTE];
    return typeof styleName === 'string' && styleName
      ? resetTheDefaultStyleNameToNone(styleName)
      : null;
  }

  return null;
}

function getTableContinuationStyle(styleName: string): StyleWithNextLine {
  const style = getCustomStyleByName(styleName) as StyleWithNextLine | null;

  return {
    ...style,
    styleName,
    styles: {
      ...style?.styles,
      nextLineStyleName: styleName,
    },
  };
}

function isActiveNextParagraph(
  nextNode: Node | null | undefined,
  nextNodePos: number,
  prevState: LooseState,
  nextState: LooseState
): nextNode is Node {
  return (
    nextNode?.type.name === 'paragraph' &&
    nextNodePos >= prevState.selection.from &&
    nextNodePos <= nextState.selection.from
  );
}

function getNextParagraphAttrs(
  prevParagraph: Node,
  style,
  prevState: LooseState,
  $from: EditorState['selection']['$from']
): Record<string, unknown> {
  let attrs: Record<string, unknown> = {
    styleName: prevParagraph.attrs.styleName,
    indent: prevParagraph.attrs.indent,
    align: prevParagraph.attrs.align,
  };

  if (!isInsideListItem($from)) {
    attrs = setNodeAttrs(
      resetTheDefaultStyleNameToNone(style.styles.nextLineStyleName),
      attrs
    );
  }

  return applyListIndent(attrs, style, prevState);
}

function applyListIndent(
  attrs: Record<string, unknown>,
  style,
  prevState: LooseState
): Record<string, unknown> {
  if (style.styles.isList !== true) {
    return attrs;
  }

  const posList = prevState.selection.from - 1;
  const listNode = prevState.doc.nodeAt(posList);
  if (!listNode) {
    return attrs;
  }

  if (listNode.isText === false) {
    attrs.indent = listNode.attrs.indent;
    return attrs;
  }

  const listNodeAlt = prevState.doc.nodeAt(posList - listNode.nodeSize);
  attrs.indent = listNodeAlt?.attrs?.indent;
  return attrs;
}

function getNextParagraphStyleName(
  style: StyleWithNextLine,
  $from: EditorState['selection']['$from']
): string {
  if (isInsideListItem($from)) {
    return style.styleName ?? RESERVED_STYLE_NONE;
  }
  return style.styles?.nextLineStyleName ?? RESERVED_STYLE_NONE;
}

function isInsideListItem($from: EditorState['selection']['$from']): boolean {
  return $from.node(-1).type.name === 'list_item';
}

function addStoredMarksForTextContent(
  tr: LooseTr,
  nextNode: Node,
  marks: Mark[]
): LooseTr {
  nextNode.descendants((child) => {
    if (child.type.name === 'text') {
      tr = addStoredMarks(tr, marks);
    }
  });

  if (nextNode.content.size === 0) {
    tr = addStoredMarks(tr, marks);
  }

  return tr;
}

function addStoredMarks(tr: LooseTr, marks: Mark[]): LooseTr {
  for (const mark of marks) {
    tr = tr.addStoredMark(mark);
  }
  return tr;
}

function findPreviousParagraph(
  $from: EditorState['selection']['$from']
): Node | null {
  const prevParagraph: Node | null = null;

  // Traverse up to find the previous paragraph
  for (let i = $from?.depth; i > 0; i--) {
    const parent = $from.node(i - 1); // Get parent node
    const index = $from.index(i - 1); // Get index of the current node in its parent

    // Traverse backwards within the parent
    for (let j = index - 1; j >= 0; j--) {
      const beforeNode = parent.child(j);
      if (beforeNode.type.name === 'paragraph') {
        return beforeNode; // Found previous paragraph
      } else if (beforeNode.isBlock) {
        // If it's a block node, check inside it
        const found = findLastParagraph(beforeNode);
        if (found) return found;
      }
    }
  }

  return prevParagraph;
}

/*
 * Finds the last paragraph inside a given node (e.g., inside a list item).
 */
function findLastParagraph(node: Node | null | undefined): Node | null {
  if (!node?.isBlock) return null;

  for (let i = node.childCount - 1; i >= 0; i--) {
    const child = node.child(i);
    if (child.type.name === 'paragraph') return child;
    if (child.isBlock) {
      const found = findLastParagraph(child);
      if (found) return found;
    }
  }
  return null;
}

export function resetTheDefaultStyleNameToNone(styleName: string): string {
  if ('Default' === styleName) {
    styleName = RESERVED_STYLE_NONE;
  }
  return styleName;
}

// [FS] IRAD-1217 2021-02-24
// get the style object using the nextlineStyleName and set the attribute values to the node.
export function setNodeAttrs(
  nextLineStyleName: string,
  newattrs: Record<string, unknown>
): Record<string, unknown> {
  if (!nextLineStyleName) {
    return newattrs;
  }

  const nextLineStyle = getCustomStyleByName(nextLineStyleName);
  if (nextLineStyle?.styles) {
    return applyNextLineStyleAttrs(newattrs, nextLineStyleName, nextLineStyle);
  }

  if (RESERVED_STYLE_NONE === nextLineStyleName) {
    return resetNodeAttrs(newattrs, nextLineStyleName);
  }

  return newattrs;
}

function applyNextLineStyleAttrs(
  newattrs: Record<string, unknown>,
  nextLineStyleName: string,
  nextLineStyle: StyleWithNextLine
): Record<string, unknown> {
  newattrs.styleName = nextLineStyleName;
  newattrs.indent = nextLineStyle.styles.indent;
  newattrs.align = nextLineStyle.styles.align;
  if (newattrs.innerLink) {
    newattrs.innerLink = null;
  }
  if (newattrs.reset === 'true') {
    newattrs.reset = 'false';
  }
  newattrs.overriddenAlign = null;
  newattrs.overriddenAlignValue = null;
  newattrs.overriddenIndent = null;
  newattrs.overriddenIndentValue = null;
  newattrs.overriddenLineSpacing = null;
  newattrs.overriddenLineSpacingValue = null;
  newattrs.lineSpacing = getLineSpacingValue(
    nextLineStyle.styles.lineHeight ? nextLineStyle.styles.lineHeight : ''
  );
  if (nextLineStyle.styles.indentPosition) {
    newattrs.indentPosition = nextLineStyle.styles.indentPosition;
    newattrs.hangingIndent = true;
  }
  return newattrs;
}

function resetNodeAttrs(
  newattrs: Record<string, unknown>,
  nextLineStyleName: string
): Record<string, unknown> {
  newattrs.styleName = nextLineStyleName;
  newattrs.indent = null;
  newattrs.lineSpacing = null;
  newattrs.align = 'left';
  return newattrs;
}

function isNewParagraph(
  prevState: LooseState,
  nextState: LooseState,
  view: CSView,
  currentKey?: KeyInput
): boolean {
  let bOk = false;
  const key = currentKey ?? view.input?.lastKeyCode;
  if (isEnterKey(key)) {
    const delta = nextState.selection.from - prevState.selection.from;
    // Only treat as a new paragraph when selection actually moved (user Enter) and not on repeated plugin reflow.
    if (delta > 0 && delta <= PARA_POSITION_DIFF) {
      bOk = true;
    }
  }
  return bOk;
}

export function isDocChanged(transactions: readonly LooseTr[]): boolean {
  return transactions.some((transaction) => transaction.docChanged);
}

export function applyNormalIfNoStyle(
  nextState: LooseState,
  tr: LooseTr,
  node: Node,
  opt?: number | boolean
): LooseTr {
  tr ??= nextState.tr;
  node.descendants((child, pos, parent) => {
    const contentLen = child.content.size;
    if (
      tr &&
      !isEnhancedTableFigureImageParagraph(child, parent) &&
      haveEligibleChildren(child, contentLen)
    ) {
      const docLen = tr.doc.content.size;
      // Validate end position.
      const end = Math.min(pos + contentLen, docLen);
      const styleName = child.attrs.styleName ?? RESERVED_STYLE_NONE;
      tr = applyLatestStyle(
        styleName,
        nextState as EditorState,
        tr,
        {
          node: child,
          startPos: pos,
          endPos: end + 1,
          opt: typeof opt === 'boolean' ? Number(opt) : opt,
        },
        null
      ) as Transaction;
    }
  });
  return tr;
}

export default {
  isDocChanged,
};
// using this function we can find if the user overrided the align,line spacing,indent.

function haveEligibleChildren(node: Node, contentLen: number): boolean {
  return (
    node instanceof Node && 0 < contentLen && node.type.name === 'paragraph'
  );
}

type HangingIndentBuildState = {
  emptyChild?: Node;
  existingMarks: Mark[];
  isParagraphStartsWithTab: boolean;
  newContent: Node[];
  prefix1AnchorInserted: boolean;
  spacerRemoved: boolean;
};

type HangingIndentScan = {
  foundHangingIndent: boolean;
  foundSpacer: boolean;
};

// Hanging indent implementation
export function applyHangingIndentTransform(
  tr: Transaction,
  state: EditorState,
  node: Node | null | undefined,
  pos: number,
  isPaste: boolean
): Transaction {
  if (node?.type.name !== 'paragraph') return tr;
  const mappedPos = tr.mapping.mapResult(pos, -1).pos;
  const children = getFragmentChildren(node.content);
  const scan = scanHangingIndentChildren(children, isPaste);

  if (!scan.foundSpacer || scan.foundHangingIndent) return tr;

  const contentState = buildHangingIndentContent(state, children);
  for (let index = contentState.newContent.length - 1; index >= 0; index -= 1) {
    if (contentState.newContent[index]?.text === ZERO_WIDTH_SPACE) {
      contentState.newContent.splice(index, 1);
    }
  }
  // Recreate updated paragraph
  const newParagraph = node.type.create(node.attrs, contentState.newContent);
  tr.replaceWith(mappedPos, mappedPos + node.nodeSize, newParagraph);
  const prefix1Pos = getHangingIndentPrefixStartPos(
    tr.doc.nodeAt(mappedPos),
    mappedPos,
    1
  );
  const selectionPos = prefix1Pos ?? tr.mapping.mapResult(state.selection?.from, -1).pos;
  tr.setSelection(
    TextSelection.create(tr.doc, Math.min(selectionPos, tr.doc.content.size))
  );

  return tr;
}

function scanHangingIndentChildren(
  children: Node[],
  isPaste: boolean
): HangingIndentScan {
  let foundSpacer = false;
  let foundHangingIndent = false;
  for (const child of children) {
    foundSpacer ||= hasMark(child, 'spacer');
    foundHangingIndent ||= !isPaste && hasHangingIndentPrefix(child, 1);
  }
  return { foundHangingIndent, foundSpacer };
}

function buildHangingIndentContent(
  state: EditorState,
  children: Node[]
): HangingIndentBuildState {
  const buildState: HangingIndentBuildState = {
    existingMarks: [],
    isParagraphStartsWithTab: false,
    newContent: [],
    prefix1AnchorInserted: false,
    spacerRemoved: false,
  };

  for (const [index, child] of children.entries()) {
    if (consumeSpacerChild(buildState, child, index)) {
      continue;
    }
    appendHangingIndentChild(state, buildState, child);
  }

  appendOnlySpacerContent(state, buildState);
  appendTrailingPrefixContent(state, buildState);
  return buildState;
}

function consumeSpacerChild(
  buildState: HangingIndentBuildState,
  child: Node,
  index: number
): boolean {
  if (buildState.spacerRemoved || !hasMark(child, 'spacer')) {
    return false;
  }
  buildState.spacerRemoved = true;
  buildState.isParagraphStartsWithTab = index === 0;
  buildState.emptyChild = child;
  if (child.text === ' ') {
    buildState.existingMarks = getContentMarks(child);
  }
  return true;
}

function appendHangingIndentChild(
  state: EditorState,
  buildState: HangingIndentBuildState,
  child: Node
): void {
  let updatedChild = child;
  if (updatedChild.text !== ' ') {
    buildState.existingMarks = getContentMarks(child);
  }

  const hangingIndentMark = state.schema.marks['mark-hanging-indent'].create({
    prefix: buildState.spacerRemoved ? 1 : 0,
  });

  if (buildState.isParagraphStartsWithTab) {
    appendLeadingTabContent(state, buildState, hangingIndentMark);
    updatedChild = updatedChild.mark([
      hangingIndentMark,
      ...buildState.existingMarks,
    ]);
  } else {
    updatedChild = applyHangingIndentMark(
      state,
      buildState,
      updatedChild,
      hangingIndentMark
    );
  }

  buildState.newContent.push(updatedChild);
}

function appendLeadingTabContent(
  state: EditorState,
  buildState: HangingIndentBuildState,
  hangingIndentMark: Mark
): void {
  const prefix0 = state.schema.marks['mark-hanging-indent'].create({
    prefix: 0,
    overridden: true
  });
  buildState.newContent.push(
    state.schema.text(' ', [...buildState.existingMarks, prefix0]),
    state.schema.text(ZERO_WIDTH_SPACE, [
      hangingIndentMark,
      ...buildState.existingMarks,
    ])
  );
  buildState.prefix1AnchorInserted = true;
  buildState.isParagraphStartsWithTab = false;
}

function applyHangingIndentMark(
  state: EditorState,
  buildState: HangingIndentBuildState,
  child: Node,
  hangingIndentMark: Mark
): Node {
  const nodeMarks = [hangingIndentMark, ...buildState.existingMarks];
  if (buildState.spacerRemoved && !buildState.prefix1AnchorInserted) {
    buildState.newContent.push(state.schema.text(ZERO_WIDTH_SPACE, nodeMarks));
    buildState.prefix1AnchorInserted = true;
  }
  return child.mark(nodeMarks);
}

function appendOnlySpacerContent(
  state: EditorState,
  buildState: HangingIndentBuildState
): void {
  if (!buildState.isParagraphStartsWithTab || buildState.newContent.length) {
    return;
  }
  const marks = getContentMarks(buildState.emptyChild);
  const prefix0 = state.schema.marks['mark-hanging-indent'].create({
    prefix: 0,
    overridden: true
  });
  const prefix1 = state.schema.marks['mark-hanging-indent'].create({
    prefix: 1,
    overridden: true
  });
  buildState.newContent.push(
    state.schema.text(ZERO_WIDTH_SPACE, [...marks, prefix0]),
    state.schema.text(`${ZERO_WIDTH_SPACE}${ZERO_WIDTH_SPACE}`, [
      ...marks,
      prefix1,
    ])
  );
}

function appendTrailingPrefixContent(
  state: EditorState,
  buildState: HangingIndentBuildState
): void {
  if (buildState.newContent.length !== 1 || !buildState.spacerRemoved) {
    return;
  }
  const marks =
    buildState.emptyChild?.text?.trim() === ''
      ? buildState.existingMarks
      : getContentMarks(buildState.emptyChild);
  const prefix1 = state.schema.marks['mark-hanging-indent'].create({
    prefix: 1,
    overridden: true
  });
  buildState.newContent.push(
    state.schema.text(`${ZERO_WIDTH_SPACE}${ZERO_WIDTH_SPACE}`, [
      ...marks,
      prefix1,
    ])
  );
}

function getContentMarks(node: Node | undefined): Mark[] {
  return (
    node?.marks.filter(
      (mark) => !['spacer', 'mark-hanging-indent'].includes(mark.type.name)
    ) ?? []
  );
}

function hasMark(node: Node, markName: string): boolean {
  return node.marks.some((mark) => mark.type.name === markName);
}

function getHangingIndentPrefixStartPos(
  node: Node | null | undefined,
  pos: number,
  prefix: number
): number | null {
  if (node?.type.name !== 'paragraph') {
    return null;
  }
  let offset = 0;
  let prefixPos: number | null = null;
  for (const child of getChildNodes(node)) {
    if (prefixPos !== null) {
      break;
    }
    if (hasHangingIndentPrefix(child, prefix)) {
      prefixPos =
        child.text?.startsWith(ZERO_WIDTH_SPACE)
          ? pos + 1 + offset + 1
          : pos + 1 + offset;
      break;
    }
    offset += child.nodeSize;
  }
  return prefixPos;
}

function getChildNodes(node: Node): Node[] {
  return Array.from(
    { length: node.childCount },
    (_, index) => node.child(index)
  );
}

function getFragmentChildren(content: Fragment): Node[] {
  return Array.from(
    { length: content.childCount },
    (_, index) => content.child(index)
  );
}

function hasHangingIndentPrefix(child: Node, prefix: number): boolean {
  return child.marks.some(
    (mark) =>
      mark.type.name === 'mark-hanging-indent' &&
      mark.attrs?.prefix === prefix
  );
}

function getZeroWidthSpaceDeletePositions(
  text: string,
  startPos: number
): number[] {
  if (text.replaceAll(ZERO_WIDTH_SPACE, '').length === 0) {
    return [];
  }

  const deletePositions: number[] = [];
  for (let index = 0; index < text.length; index++) {
    if (text[index] === ZERO_WIDTH_SPACE) {
      deletePositions.push(startPos + index);
    }
  }
  return deletePositions;
}

function getResolvedHangingIndentAnchorPositions(
  node: Node,
  mappedPos: number
): number[] {
  const deletePositions: number[] = [];
  let offset = 0;
  for (const child of getChildNodes(node)) {
    if (hasHangingIndentPrefix(child, 1) && child.text?.includes(ZERO_WIDTH_SPACE)) {
      deletePositions.push(
        ...getZeroWidthSpaceDeletePositions(child.text, mappedPos + 1 + offset)
      );
    }
    offset += child.nodeSize;
  }
  return deletePositions;
}

function removeResolvedHangingIndentAnchors(
  tr: Transaction | null,
  state: LooseState,
  pos: number
): Transaction {
  if (!tr) {
    tr = state.tr;
  }
  const mappedPos = tr.mapping.mapResult(pos, -1).pos;
  const node = tr.doc.nodeAt(mappedPos);
  if (node?.type.name !== 'paragraph') {
    return tr;
  }

  const deletePositions = getResolvedHangingIndentAnchorPositions(node, mappedPos);

  if (deletePositions.length === 0) {
    return tr;
  }

  const selectionFrom = state.selection?.from ?? mappedPos;
  deletePositions.sort((left, right) => right - left);
  for (const deletePos of deletePositions) {
    tr = tr.delete(deletePos, deletePos + 1);
  }

  const mappedSelection = Math.min(
    tr.mapping.mapResult(selectionFrom, -1).pos,
    tr.doc.content.size
  );
  return tr.setSelection(TextSelection.create(tr.doc, mappedSelection));
}
