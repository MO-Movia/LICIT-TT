import { Node, NodeType, Schema } from 'prosemirror-model';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import * as React from 'react';
import { BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH } from './NodeNames';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { getSelectionRange, isColumnCellSelected, getSelectedCellPositions, findParagraphsInNode } from './isNodeSelectionForNodeType';



export function setTextAlign(
  tr: Transform,
  schema: Schema,
  alignment?: string
): Transform {
  const { selection, doc } = tr as Transaction;
  if (!selection || !doc) {
    return tr;
  }
  const tasks: {
    node: Node;
    pos: number;
    nodeType: NodeType;
  }[] = [];
  const { nodes } = schema;
  const blockquote = nodes[BLOCKQUOTE];
  const listItem = nodes[LIST_ITEM];
  const heading = nodes[HEADING];
  const paragraph = nodes[PARAGRAPH];
  alignment = alignment || null;
  const allowedNodeTypes = new Set([blockquote, heading, listItem, paragraph]);

  if (isColumnCellSelected(selection)) {
    const positions = getSelectedCellPositions(selection);
    if (positions.length > 0) {
      positions.forEach(pos => {
        const node = tr.doc.nodeAt(pos);
        findParagraphsInNode(node, pos, (paraNode, paraPos) => {
          const align = paraNode.attrs.align ?? null;
          if (align !== alignment && allowedNodeTypes.has(paraNode.type)) {
            tasks.push({
              node: paraNode,
              pos: paraPos,
              nodeType: paraNode.type,
            });
          }
        });
      });
    }
  }
  else {
    const { from, to } = getSelectionRange(selection);
    doc.nodesBetween(from, to, (node, pos, _parentNode) => {
      const nodeType = node.type;
      const align = node.attrs.align || null;
      if (align !== alignment && allowedNodeTypes.has(nodeType)) {
        tasks.push({
          node,
          pos,
          nodeType,
        });
      }
      return true;
    });
  }

  if (!tasks.length) {
    return tr;
  }

  tasks.forEach((job) => {
    const { node, pos, nodeType } = job;
    let { attrs } = node;
    if (alignment) {
      attrs = {
        ...attrs,
        align: alignment,
        overriddenAlign: true,
        overriddenAlignValue: alignment
      };
    } else {
      const isOverridden = attrs.overriddenAlign ?? null;
      attrs = {
        ...attrs,
        align: isOverridden ? attrs.align : null,
        overriddenAlign: isOverridden ? attrs.overriddenAlign : null,
        overriddenAlignValue: isOverridden ? attrs.overriddenAlignValue : null
      };
    }
    tr = tr.setNodeMarkup(pos, nodeType, attrs, node.marks);
  });

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
