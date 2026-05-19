/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node, NodeType, Schema } from 'prosemirror-model';
import { EditorState, Selection, TextSelection, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import * as React from 'react';
import { BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH } from './NodeNames';
import { UICommand } from '../core';
import { getSelectionRange, isColumnCellSelected, getSelectedCellPositions, findParagraphsInNode } from './isNodeSelectionForNodeType';

type TextAlignTask = {
  node: Node;
  pos: number;
  nodeType: NodeType;
};

function getAllowedTextAlignNodeTypes(schema: Schema): Set<NodeType> {
  const { nodes } = schema;
  const blockquote = nodes[BLOCKQUOTE];
  const listItem = nodes[LIST_ITEM];
  const heading = nodes[HEADING];
  const paragraph = nodes[PARAGRAPH];

  return new Set(
    [blockquote, heading, listItem, paragraph].filter(
      (n): n is NodeType => n !== null && n !== undefined
    )
  );
}

function addTextAlignTask(
  tasks: TextAlignTask[],
  allowedNodeTypes: Set<NodeType>,
  node: Node,
  pos: number,
  alignment: string
): void {
  const align = node.attrs.align ?? null;
  if (align === alignment || !allowedNodeTypes.has(node.type)) {
    return;
  }

  tasks.push({
    node,
    pos,
    nodeType: node.type,
  });
}

function collectColumnCellTextAlignTasks(
  tr: Transform,
  selection: Selection,
  allowedNodeTypes: Set<NodeType>,
  alignment: string
): TextAlignTask[] {
  const tasks: TextAlignTask[] = [];
  const positions = getSelectedCellPositions(selection);

  for (const pos of positions) {
    const cellNode = tr.doc.nodeAt(pos);
    if (!cellNode) {
      continue;
    }

    findParagraphsInNode(cellNode, pos, (paragraphNode, paragraphPos) => {
      addTextAlignTask(
        tasks,
        allowedNodeTypes,
        paragraphNode,
        paragraphPos,
        alignment
      );
    });
  }

  return tasks;
}

function collectSelectionTextAlignTasks(
  doc: Transaction['doc'],
  selection: Selection,
  allowedNodeTypes: Set<NodeType>,
  alignment: string
): TextAlignTask[] {
  const tasks: TextAlignTask[] = [];
  const { from, to } = getSelectionRange(selection);

  doc.nodesBetween(from, to, (node, pos) => {
    addTextAlignTask(tasks, allowedNodeTypes, node, pos, alignment);
    return true;
  });

  return tasks;
}

function getTextAlignAttrs(node: Node, alignment: string) {
  const { attrs } = node;
  if (alignment) {
    return {
      ...attrs,
      align: alignment,
      overriddenAlign: true,
      overriddenAlignValue: alignment
    };
  }

  const isOverridden = attrs.overriddenAlign ?? null;
  return {
    ...attrs,
    align: isOverridden ? attrs.align : null,
    overriddenAlign: isOverridden ? attrs.overriddenAlign : null,
    overriddenAlignValue: isOverridden ? attrs.overriddenAlignValue : null
  };
}

export function setTextAlign(
  tr: Transform,
  schema: Schema,
  alignment: string = null
): Transform {
  const { selection, doc } = tr as Transaction;
  if (!selection || !doc) {
    return tr;
  }
  const allowedNodeTypes = getAllowedTextAlignNodeTypes(schema);
  const tasks = isColumnCellSelected(selection)
    ? collectColumnCellTextAlignTasks(tr, selection, allowedNodeTypes, alignment)
    : collectSelectionTextAlignTasks(doc, selection, allowedNodeTypes, alignment);

  if (!tasks.length) {
    return tr;
  }

  for (const job of tasks) {
    const { node, pos, nodeType } = job;
    const attrs = getTextAlignAttrs(node, alignment);
    tr.setNodeMarkup(pos, nodeType, attrs, node.marks);
  }

  return tr;
}

export class TextAlignCommand extends UICommand {
  _alignment: string;

  constructor(alignment: string) {
    super();
    this._alignment = alignment;
  }

  isActive = (state: EditorState): boolean => {
    const { selection, doc } = state;
    const { from, to } = selection;
    let keepLooking = true;
    let active = false;
    doc.nodesBetween(from, to, (node, _pos) => {
      if (keepLooking && node.attrs.align === this._alignment) {
        keepLooking = false;
        active = true;
      }
      return keepLooking;
    });
    return active;
  };

  isEnabled = (state: EditorState): boolean => {
    if (state) {
      return true;
    }
    return false;
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
    let tr = setTextAlign(
      state.tr.setSelection(selection),
      schema,
      this._alignment
    );
    if (tr.docChanged) {
      // set the value of overriddenAlign to true if the user override the align style.
      if (
        selection.$head.parent.attrs.align !== this._alignment
      ) {
        const nodePos = Math.max(0, selection.head - selection.$head.parentOffset - 1);
        const node = tr.doc.nodeAt(nodePos);
        if (node) {
          const newAttrs = {
            ...node.attrs,
            overriddenAlign: true,
            overriddenAlignValue: this._alignment
          };
          tr = tr.setNodeMarkup(nodePos, null, newAttrs);
        }
        dispatch?.(tr);
      }
      return true;
    } else {
      return false;
    }
  };
  // New method to execute new styling implementation  text align
  executeCustom = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform => {
    const { schema } = state;
    tr = setTextAlign(
      (tr as Transaction).setSelection(TextSelection.create(tr.doc, from, to)),
      schema,
      this._alignment
    );
    return tr;
  };

  executeCustomStyleForTable = (
    state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform => {
    const { schema, selection } = state;
    if (isColumnCellSelected(selection)) {
      tr = setTextAlign(
        tr,
        schema,
        this._alignment
      );
    }
    return tr;
  };

  renderLabel() {
    return null;
  }
}
