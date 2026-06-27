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
import { Mark, Node, Schema, Slice } from 'prosemirror-model';
import { CustomstyleDropDownCommand } from './ui/CustomstyleDropDownCommand';
import { applyEffectiveSchema } from './EditorSchema';
import type { StyleRuntime } from './StyleRuntime';
export * from './StyleRuntime';

const ENTERKEYCODE = 13;
const BACKSPACEKEYCODE = 8;
const PARA_POSITION_DIFF = 4;
const ATTR_STYLE_NAME = 'styleName';
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
type HangingIndentScan = {
  hasSpacer: boolean;
  hasHangingIndent: boolean;
};
type HangingIndentContentState = {
  content: Node[];
  spacerRemoved: boolean;
  startsWithTab: boolean;
  spacerChild: Node | null;
};
type StyleWithNextLine = {
  styleName?: string;
  styles?: {
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
let slice1: Slice | null = null;

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
  constructor(runtime: StyleRuntime, hideNumbering?: boolean) {
    let csview: CustomStyleView | null = null;
    let firstTime = true;
    let loaded = false;
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
          keydown(view) {
            csview = view;
          },
        },
        nodeViews: {},
      },
      appendTransaction: (transactions, prevState, nextState) => {
        let tr: TrLike = null;
        const ref = { firstTime, loaded };
        if (!loaded) {
          tr = onInitAppendTransaction(ref, tr, nextState);
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
  nextState: LooseState
): LooseTr {
  ref.loaded = isStylesLoaded();
  if (ref.loaded) {
    // do this only once when the document is loaded.
    tr = applyStyles(nextState, tr);
  }

  return tr;
}

export function onUpdateAppendTransaction(
  ref: { firstTime?: boolean; loaded?: boolean },
  tr: LooseTr,
  nextState: EditorState,
  prevState: EditorState,
  csview: CSView,
  transactions: readonly Transaction[],
  slice1: SliceLike
): LooseTr {
  tr = applyStyleForEmptyParagraph(nextState, tr);
  ref.firstTime = false;

  tr = handleUpdateKeyStyling(prevState, nextState, tr, csview);

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

  return tr;
}

function handleUpdateKeyStyling(
  prevState: LooseState,
  nextState: LooseState,
  tr: LooseTr,
  csview: CSView
): LooseTr {
  if (!csview) {
    return tr;
  }

  if (BACKSPACEKEYCODE === csview.input.lastKeyCode) {
    const updatedTr = handleBackspaceStyleUpdate(prevState, nextState, tr);
    if (updatedTr) {
      return updatedTr;
    }
  }

  if (ENTERKEYCODE !== csview.input.lastKeyCode) {
    return tr;
  }

  if (tr.selection.$from.start() === tr.selection.$from.end()) {
    return applyStyleForNextParagraph(prevState, nextState, tr, csview);
  }
  return tr;
}

function handleBackspaceStyleUpdate(
  prevState: LooseState,
  nextState: LooseState,
  tr: LooseTr
): LooseTr | null {
  const selection = nextState.selection;
  const $from = selection?.$from;
  if (selection?.empty && $from?.parentOffset === 0 && $from.depth > 0) {
    const cut = $from.before();
    if (canJoin(nextState.doc, cut)) {
      return tr.join(cut).scrollIntoView();
    }
  }

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
  if (tr.selection.$from.parentOffset === 0) {
    const prevNode = nextState.doc.resolve(
      tr.selection.$anchor.pos - 1
    ).nodeBefore;
    if (prevNode) {
      tr = applyLatestStyle(
        prevNode?.attrs?.styleName,
        nextState as EditorState,
        tr,
        {
          node: prevNode,
          startPos: tr.selection.$head.before(),
          endPos: tr.selection.$from.end(),
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
  tr?.doc?.descendants((child, pos) => {
    const contentLen = child.content.size;
    if (haveEligibleChildren(child, contentLen)) {
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
  const startPos = nextState.selection?.$from.before(
    nextState.selection?.$from.depth === 0
      ? 1
      : nextState.selection?.$from.depth
  );
  const endPos = nextState.selection?.$to?.end();
  tr ??= nextState.tr;

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
  view: CSView
): LooseTr {
  tr ??= nextState.tr;
  if (!nextState?.selection) {
    return tr;
  }

  const { $from } = nextState.selection;
  if (!view || !isNewParagraph(prevState, nextState, view)) {
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

  const style = getCustomStyleByName(prevParagraph.attrs.styleName);
  if (!style?.styles?.nextLineStyleName) {
    return null;
  }

  const attrs = getNextParagraphAttrs(prevParagraph, style, prevState, $from);
  const styleName = getNextParagraphStyleName(style, $from);
  return { attrs, nextNode, nextNodePos, styleName };
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
  if (nextLineStyleName) {
    const nextLineStyle = getCustomStyleByName(nextLineStyleName);
    if (nextLineStyle?.styles) {
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

      // Line spacing not working for next line style
      newattrs.lineSpacing = getLineSpacingValue(
        nextLineStyle.styles.lineHeight ? nextLineStyle.styles.lineHeight : ''
      );
    } else if (RESERVED_STYLE_NONE === nextLineStyleName) {
      // Next line style None not applied
      newattrs = resetNodeAttrs(newattrs, nextLineStyleName);
    }
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
  view: CSView
): boolean {
  let bOk = false;
  if (ENTERKEYCODE === view.input.lastKeyCode) {
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
  node.descendants((child, pos) => {
    const contentLen = child.content.size;
    if (tr && haveEligibleChildren(child, contentLen)) {
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

// Hanging indent implementation
export function applyHangingIndentTransform(
  tr: Transaction,
  state: EditorState,
  node: Node | null | undefined,
  pos: number,
  isPaste: boolean
): Transaction {
  if (node?.type.name !== 'paragraph') return tr;

  const scan = scanHangingIndentMarks(node, isPaste);

  // Skip if no spacer or already has hanging-indent
  if (!scan.hasSpacer || scan.hasHangingIndent) return tr;

  const newContent = buildHangingIndentContent(node, state);
  const newParagraph = node.type.create(node.attrs, newContent);
  tr.replaceWith(pos, pos + node.nodeSize, newParagraph);
  tr.setSelection(TextSelection.create(tr.doc, state.selection?.from));

  return tr;
}

function scanHangingIndentMarks(
  node: Node,
  isPaste: boolean
): HangingIndentScan {
  const scan = {
    hasSpacer: false,
    hasHangingIndent: false,
  };

  for (let i = 0; i < node.content.childCount; i++) {
    const child = node.content.child(i);
    scan.hasSpacer ||= hasMark(child, 'spacer');
    scan.hasHangingIndent ||= hasMark(child, 'mark-hanging-indent') && !isPaste;
  }

  return scan;
}

function buildHangingIndentContent(node: Node, state: EditorState): Node[] {
  const contentState: HangingIndentContentState = {
    content: [],
    spacerRemoved: false,
    startsWithTab: false,
    spacerChild: null,
  };

  for (let i = 0; i < node.content.childCount; i++) {
    const child = node.content.child(i);
    // Remove the *first* spacer-marked text node
    if (removeFirstSpacer(child, contentState, i)) {
      continue;
    }

    appendHangingIndentChild(child, state, contentState);
  }

  appendMissingHangingIndentContent(state, contentState);
  return contentState.content;
}

function removeFirstSpacer(
  child: Node,
  contentState: HangingIndentContentState,
  index: number
): boolean {
  if (contentState.spacerRemoved || !hasMark(child, 'spacer')) {
    return false;
  }

  contentState.spacerRemoved = true;
  contentState.startsWithTab = index === 0;
  contentState.spacerChild = child;
  return true;
}

function appendHangingIndentChild(
  child: Node,
  state: EditorState,
  contentState: HangingIndentContentState
): void {
  const existingMarks = removeSpacerMarks(child.marks);
  const hangingIndentMark = createHangingIndentMark(
    state,
    contentState.spacerRemoved ? 1 : 0
  );

  if (contentState.startsWithTab) {
    contentState.content.push(createHangingIndentText(state, existingMarks, 0));
    contentState.startsWithTab = false;
  }

  // Ensure hangingIndent is the *outermost* mark
  contentState.content.push(child.mark([hangingIndentMark, ...existingMarks]));
}

function appendMissingHangingIndentContent(
  state: EditorState,
  contentState: HangingIndentContentState
): void {
  if (contentState.startsWithTab && contentState.content.length === 0) {
    appendHangingIndentTextPair(state, contentState);
    return;
  }

  if (contentState.content.length === 1 && contentState.spacerRemoved) {
    const existingMarks = getSpacerChildMarks(contentState);
    contentState.content.push(createHangingIndentText(state, existingMarks, 1));
  }
}

function appendHangingIndentTextPair(
  state: EditorState,
  contentState: HangingIndentContentState
): void {
  const existingMarks = getSpacerChildMarks(contentState);
  contentState.content.push(
    createHangingIndentText(state, existingMarks, 0),
    createHangingIndentText(state, existingMarks, 1)
  );
}

function getSpacerChildMarks(
  contentState: HangingIndentContentState
): readonly Mark[] {
  return removeSpacerMarks(contentState.spacerChild?.marks ?? []);
}

function createHangingIndentText(
  state: EditorState,
  marks: readonly Mark[],
  prefix: number
): Node {
  return state.schema.text(' ', [
    ...marks,
    createHangingIndentMark(state, prefix),
  ]);
}

function createHangingIndentMark(state: EditorState, prefix: number): Mark {
  return state.schema.marks['mark-hanging-indent'].create({ prefix });
}

function removeSpacerMarks(marks: readonly Mark[]): readonly Mark[] {
  return marks.filter((mark) => mark.type.name !== 'spacer');
}

function hasMark(node: Node, markName: string): boolean {
  return node.marks.some((mark) => mark?.type.name === markName);
}
