/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { UICommand } from '../core';
import { Transaction, EditorState, Selection } from 'prosemirror-state';
import { BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH } from './NodeNames';
import { EditorView } from 'prosemirror-view';
import { Node, NodeType, Schema } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';
import {
  DOUBLE_LINE_SPACING,
  SINGLE_LINE_SPACING,
  LINE_SPACING_115,
  LINE_SPACING_150,
} from './ui/toCSSLineSpacing';
import { getSelectionRange, isColumnCellSelected, getSelectedCellPositions } from './isNodeSelectionForNodeType';
import * as React from 'react';

type TextLineSpacingTask = {
  node: Node;
  pos: number;
  nodeType: NodeType;
};

function getAllowedTextLineSpacingNodeTypes(schema: Schema): Set<NodeType> {
  const paragraph = schema.nodes[PARAGRAPH];
  const heading = schema.nodes[HEADING];
  const listItem = schema.nodes[LIST_ITEM];
  const blockquote = schema.nodes[BLOCKQUOTE];

  return new Set(
    [blockquote, heading, listItem, paragraph].filter(
      (n): n is NodeType => n !== null && n !== undefined
    )
  );
}

function addTextLineSpacingTask(
  tasks: TextLineSpacingTask[],
  allowedNodeTypes: Set<NodeType>,
  node: Node,
  pos: number,
  lineSpacingValue: string
): void {
  if (!allowedNodeTypes.has(node.type)) {
    return;
  }

  const lineSpacing = node.attrs.lineSpacing ?? null;
  if (lineSpacing === lineSpacingValue) {
    return;
  }

  tasks.push({
    node,
    pos,
    nodeType: node.type,
  });
}

function collectColumnCellTextLineSpacingTasks(
  tr: Transform,
  selection: Selection,
  allowedNodeTypes: Set<NodeType>,
  lineSpacingValue: string
): TextLineSpacingTask[] {
  const tasks: TextLineSpacingTask[] = [];
  const positions = getSelectedCellPositions(selection);

  for (const originalPos of positions) {
    const pos = originalPos + 1;
    const node = tr.doc.nodeAt(pos);
    if (!node) {
      continue;
    }

    addTextLineSpacingTask(tasks, allowedNodeTypes, node, pos, lineSpacingValue);
  }

  return tasks;
}

function collectSelectionTextLineSpacingTasks(
  doc: Transaction['doc'],
  selection: Selection,
  allowedNodeTypes: Set<NodeType>,
  lineSpacingValue: string,
  listItem: NodeType | null | undefined
): TextLineSpacingTask[] {
  const tasks: TextLineSpacingTask[] = [];
  const { from, to } = getSelectionRange(selection);

  doc.nodesBetween(from, to, (node, pos) => {
    addTextLineSpacingTask(tasks, allowedNodeTypes, node, pos, lineSpacingValue);
    return node.type === listItem;
  });

  return tasks;
}

function getTextLineSpacingAttrs(node: Node, lineSpacing?: string) {
  const lineSpacingValue = lineSpacing || null;
  const { attrs } = node;

  if (lineSpacingValue) {
    return {
      ...attrs,
      lineSpacing: lineSpacingValue,
      overriddenLineSpacing: true,
      overriddenLineSpacingValue: lineSpacing
    };
  }

  const isOverriddenLineSpacing = attrs.overriddenLineSpacing ?? null;
  return {
    ...attrs,
    lineSpacing: isOverriddenLineSpacing ? attrs.lineSpacing : SINGLE_LINE_SPACING,
    overriddenLineSpacing: isOverriddenLineSpacing ? attrs.overriddenLineSpacing : null,
    overriddenLineSpacingValue: isOverriddenLineSpacing ? attrs.overriddenLineSpacingValue : null
  };
}

export function setTextLineSpacing(
  tr: Transform,
  schema: Schema,
  lineSpacing?: string
): Transform {
  const { selection, doc } = tr as Transaction;
  if (!selection || !doc) {
    return tr;
  }

  const listItem = schema.nodes[LIST_ITEM];
  const allowedNodeTypes = getAllowedTextLineSpacingNodeTypes(schema);
  if (!allowedNodeTypes.size) {
    return tr;
  }

  const lineSpacingValue = lineSpacing || null;
  const tasks = isColumnCellSelected(selection)
    ? collectColumnCellTextLineSpacingTasks(
      tr,
      selection,
      allowedNodeTypes,
      lineSpacingValue
    )
    : collectSelectionTextLineSpacingTasks(
      doc,
      selection,
      allowedNodeTypes,
      lineSpacingValue,
      listItem
    );

  if (!tasks.length) {
    return tr;
  }

  for (const job of tasks) {
    const { node, pos, nodeType } = job;
    const attrs = getTextLineSpacingAttrs(node, lineSpacing);
    tr = tr.setNodeMarkup(pos, nodeType, attrs, node.marks);
  }

  return tr;
}

function createGroup(): Array<{ [key: string]: TextLineSpacingCommand }> {
  const group = {
    Single: new TextLineSpacingCommand(SINGLE_LINE_SPACING),
    '1.15': new TextLineSpacingCommand(LINE_SPACING_115),
    '1.5': new TextLineSpacingCommand(LINE_SPACING_150),
    Double: new TextLineSpacingCommand(DOUBLE_LINE_SPACING),
  };
  return [group];
}

export class TextLineSpacingCommand extends UICommand {
  _lineSpacing?: string;

  static readonly createGroup = createGroup;

  constructor(lineSpacing?: string) {
    super();
    this._lineSpacing = lineSpacing;
  }

  isActive = (state: EditorState): boolean => {
    const { selection, doc, schema } = state;
    const { from, to } = selection;
    const paragraph = schema.nodes[PARAGRAPH];
    const heading = schema.nodes[HEADING];
    let keepLooking = true;
    let active = false;
    doc.nodesBetween(from, to, (node, _pos) => {
      const nodeType = node.type;
      if (
        keepLooking &&
        (nodeType === paragraph || nodeType === heading) &&
        node.attrs.lineSpacing === this._lineSpacing
      ) {
        keepLooking = false;
        active = true;
      }
      return keepLooking;
    });
    return active;
  };

  isEnabled = (state: EditorState): boolean => {
    return this.isActive(state) || this.execute(state);
  };

  waitForUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<undefined> => {
    return Promise.resolve(undefined);
  };

  executeWithUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    _inputs?: string
  ): boolean => {
    return false;
  };

  cancel(): void {
    return null;
  }

  execute = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    _view?: EditorView
  ): boolean => {
    const { schema, selection } = state;
    let tr = setTextLineSpacing(
      state.tr.setSelection(selection),
      schema,
      this._lineSpacing
    );
    if (tr.docChanged) {
      // set the value of overriddenLineSpacing to true if the user override the line spacing style.
      if (
        selection.$head?.parent?.attrs?.lineSpacing !== this._lineSpacing
      ) {
        const nodePos = Math.max(0, selection.head - selection.$head.parentOffset - 1);
        const node = tr.doc.nodeAt(nodePos);
        if (node) {
          const newAttrs = {
            ...node.attrs,
            overriddenLineSpacing: true,
            overriddenLineSpacingValue: this._lineSpacing
          };
          tr = tr.setNodeMarkup(nodePos, null, newAttrs);
        }
        dispatch?.(tr as Transaction);
      }
      return true;
    } else {
      return false;
    }
  };

  renderLabel() {
    return null;
  }

  executeCustom = (_state: EditorState, tr: Transform): Transform => {
    return tr;
  };

  executeCustomStyleForTable = (
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform => {
    return tr;
  };
}
