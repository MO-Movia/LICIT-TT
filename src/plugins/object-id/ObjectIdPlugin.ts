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
import { SetDocAttrStep } from '@modusoperandi/licit-doc-attrs-step';
import { findParentNodeClosestToPos } from 'prosemirror-utils';
import { createObjectId } from './create-object-id';
import { EditorView } from 'prosemirror-view';
import {
  Schema,
  Node,
  NodeSpec,
  Slice,
  AttributeSpec,
  NodeType,
} from 'prosemirror-model';
const SPEC = 'spec';
const ATTR_OBJID = 'objectId';
const ATTR_OBJMETADATA = 'objectMetaData';
const ATTR_DIRTY = 'dirty';
const ATTR_SELECTIONID = 'selectionId';
const NEWATTRS = [ATTR_OBJID, ATTR_OBJMETADATA, ATTR_DIRTY, ATTR_SELECTIONID];
const ENTERKEYCODE = 13;
const BACKSPACEKEYCODE = 8;
const ATTR_DELETEDOBJIDS = 'deletedObjectIds';
const DOC_NAME = 'doc';

const ALLOWED_NODES = [
  DOC_NAME,
  'paragraph',
  'bullet_list',
  'heading',
  'horizontal_rule',
  'image',
  'ordered_list',
  'table',
  'table_cell',
  'table_row',
  'citationnote',
];

interface IdConfig {
  prefix?: string;
  suffix?: string;
  cutObjectIds?: CutObjectInfo[];
}

interface CutObjectInfo {
  objectId: string;
  objectMetaData: Record<string, unknown>;
  selectionId: string;
}

export interface Ranges {
  from: number;
  to: number;
}

export const ObjectIdPluginKey = new PluginKey('ObjectIdPlugin');

export class ObjectIdPlugin extends Plugin<IdConfig> {
  loaded: boolean;
  isCut: boolean;
  pastedPara: Slice;
  view: EditorView;
  namespacePlugin: Plugin;
  suffix: string;
  constructor(objectConfig: IdConfig = {}) {
    super({
      key: ObjectIdPluginKey,
      state: {
        init(_config, _state) {
          return { loaded: false, cutObjectIds: [], ...objectConfig };
        },
        apply(_tr, _set, state) {
          return { ...state, ..._set };
        },
      },
      props: {
        handleDOMEvents: {
          keydown(view: EditorView, _event: KeyboardEvent) {
            (this as ObjectIdPlugin).view = view;
            return false;
          },
          cut: (view: EditorView, _event) => {
            this.isCut = true;
            const { state } = view;
            const { selection } = state;
            const { from, to } = selection;
            const frompos = from - 1 < 0 ? 0 : from - 1;
            const selectedPara = state.doc.slice(frompos, to);
            selectedPara.content.forEach((node) => {
              if (this.isTargetNodeAllowed(node) && node.attrs[ATTR_OBJID]) {
                this.getState(view.state)?.cutObjectIds.push({
                  objectId: node.attrs[ATTR_OBJID],
                  objectMetaData: node.attrs[ATTR_OBJMETADATA],
                  selectionId: node.attrs[ATTR_SELECTIONID],
                });
              }
            });
          },
        },

        handlePaste(view, _event, slice) {
          const { cutObjectIds } = this.getState(view.state) || {};
          if (this.getState(view.state)?.cutObjectIds?.length > 0) {
            (this as ObjectIdPlugin).pastedPara = slice;
            let tr = view.state.tr;
            const { selection } = view.state;
            const { from } = selection;
            const node = tr.doc.nodeAt(from - 1);
            const newattrs = { ...node.attrs };
            const index = cutObjectIds.findIndex(
              (obj) => obj.objectId === node.attrs?.objectId
            );
            newattrs.objectMetaData = cutObjectIds[0].objectMetaData;
            if (index !== -1) {
              newattrs.objectId = node.attrs.objectId;
              this.getState(view.state).cutObjectIds.splice(index, 1);
            } else {
              newattrs.objectId = cutObjectIds[0].objectId;
              this.getState(view.state).cutObjectIds.shift();
            }
            const pos = from - 1;
            tr = tr.setNodeMarkup(pos, undefined, newattrs);
            if (cutObjectIds.length == 1) {
              (this as ObjectIdPlugin).pastedPara = null;
            }
            tr = tr.setMeta('skipAppendTransaction', true);
            view.dispatch(tr);
          }
          return false;
        },
      },

      appendTransaction: (transactions: Transaction[], prevState: EditorState, nextState: EditorState) => {
        let tr: Transaction = null;

        //  Skip recursion for plugin-generated transactions
        if (this.shouldSkipAppend(transactions)) {
          return null;
        }
        // Detect document has any changes
        const docChanged = this.isDocChanged(transactions);
        if (!docChanged && this.loaded) {
          return null;
        }

        // Separate undo/redo from regular transactions
        const undoRedoTransactions = transactions.filter(t =>
          t.getMeta('history')?.undo || t.getMeta('history')?.redo
        );
        const regularTransactions = transactions.filter(t =>
          !t.getMeta('history')?.undo && !t.getMeta('history')?.redo
        );

        if (undoRedoTransactions.length > 0) {
          tr = this.handleUndoRedo(prevState, nextState, tr, docChanged);
        }
        if (regularTransactions.length > 0 && (!this.loaded || docChanged)) {
          this.loaded = true;
          tr = this.assignIDsForMissing(regularTransactions, prevState, nextState, this.view);

          if (this.pastedPara?.content?.childCount > 1) {
            tr = this.assignSameObjectMetaDataForCutPastePara(nextState, tr);
          }

          tr = this.trackDeletedObjectId(prevState, nextState, tr);
          tr = this.setDirtyFlagOnChange(prevState, nextState, tr, docChanged);
        }
        if (tr && nextState.tr) {
          tr.storedMarks = nextState.tr.storedMarks;
        }

        if (tr?.docChanged) {
          tr.setMeta('skipAppendTransaction', true);
          return tr;
        }
        return null;
      },

    });
  }

  /**
   * Checks if a node has an attribute.
   *
   * @param node the node to check
   * @param attrName the attribute name to check for
   * @return true if node has the attribute, false otherwise
   */
  isNodeHasAttribute = (node: Node, attrName: string): boolean => {
    const val = node.attrs?.[attrName];
    return val !== undefined && val !== null;
  };

  isTargetNodeAllowed = (node: Node): boolean => {
    return ALLOWED_NODES.includes(node.type.name);
  };

  requiredAddAttr = (node: Node): boolean => {
    return (
      this.isTargetNodeAllowed(node) &&
      !this.isNodeHasAttribute(node, ATTR_OBJID)
    );
  };

  getEffectiveSchema(schema: Schema): Schema {
    return this.applyEffectiveSchema(schema);
  }

  isDocChanged(transactions: Transaction[]): boolean {
    return transactions.some((transaction) => transaction.docChanged);
  }

  getObjectMetaDataFromCutObj(objectId: string, cutObjectIds: CutObjectInfo[]) {
    const found = cutObjectIds.find((obj) => obj.objectId === objectId);
    return found?.objectMetaData;
  }

  assignSameObjectMetaDataForCutPastePara(
    nextState: EditorState,
    tr: Transaction
  ): Transaction | null {
    let trans = tr || nextState.tr;
    const { cutObjectIds } = this.getState(nextState) || {};
    // this is a cut and paste paras, need to set the objectMetaData same when user cut and paste multiple paragraphs
    if (this.pastedPara?.content?.childCount > 1) {
      nextState.doc.descendants((node, pos) => {
        //check if the para is a cut and paste para
        if (
          this.isTargetNodeAllowed(node) &&
          null === node.attrs.objectMetaData &&
          cutObjectIds.some(
            (objId) => objId.objectId === node.attrs[ATTR_OBJID]
          )
        ) {
          const newattrs = { ...node.attrs };
          newattrs.objectMetaData = this.getObjectMetaDataFromCutObj(
            newattrs.objectId,
            cutObjectIds
          );
          trans = trans.setNodeMarkup(pos, undefined, newattrs);
        }
      });
      this.getState(nextState).cutObjectIds = [];
      this.pastedPara = null;
    }
    return trans;
  }

  getChangedRanges(transactions): Ranges[] {
    const ranges: Ranges[] = [];
    for (const tr of transactions) {
      tr.mapping.maps.forEach(map => {
        map.forEach((newStart, newEnd) => {
          ranges.push({ from: newStart, to: newEnd });
        });
      });
    }
    return ranges;
  }

  handleUndoRedo(
    prevState: EditorState,
    nextState: EditorState,
    tr: Transaction | null,
    docChanged: boolean
  ): Transaction | null {
    tr = this.trackDeletedObjectId(prevState, nextState, tr);
    tr = this.setDirtyFlagOnChange(prevState, nextState, tr, docChanged);
    if (tr && nextState.tr) tr.storedMarks = nextState.tr.storedMarks;
    return tr;
  }
  assignIDsForMissing(
    transactions: Transaction[],
    prevState: EditorState,
    nextState: EditorState,
    view: EditorView
  ): Transaction | null {
    let tr = nextState.tr;
    let modified = false;
    const objIds = [];
    const rangePos = [];
    const { prefix, suffix } = this.getState(nextState) || {};

    // Adds a unique id to the document
    if (this.requiredAddAttr(nextState.doc)) {
      tr = tr.step(
        new SetDocAttrStep(ATTR_OBJID, createObjectId(prefix, suffix))
      );
      if (!this.isNodeHasAttribute(nextState.doc, ATTR_OBJMETADATA)) {
        tr = tr.step(new SetDocAttrStep(ATTR_OBJMETADATA, null));
      }
      modified = true;
    }

    const rawRanges = this.getChangedRanges(transactions);
    const changedRanges = this.mergeRanges(rawRanges);
    const docSize = nextState.doc.content.size;

    // Only process affected parts
    // let tr = nextState.tr;
    for (const range of changedRanges) {
      //  Defensive bounds check
      const from = Math.max(0, Math.min(range.from, docSize));
      const to = Math.max(0, Math.min(range.to, docSize));
      if (from >= to) continue;

      try {
        nextState.doc.nodesBetween(from, to, (node, pos) => {
          if (!rangePos.includes(pos)) {
            rangePos.push(pos);
            const required = this.isRequiredNewId(
              node,
              objIds,
              view,
              prevState,
              nextState,
              pos
            );
            if (node.isTextblock && required) {
              const newId = createObjectId(prefix, suffix);
              objIds.push(newId)
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, [ATTR_OBJID]: newId });
              modified = true;
            }
          }
        });
      } catch (err) {
        console.warn("Skipped invalid range in assignIDsForMissing:", range, err);
      }
    }

    return modified ? tr : null;
  }

  mergeRanges(ranges: Ranges[]): Ranges[] {
    if (!ranges.length) return [];
    ranges.sort((a, b) => a.from - b.from);
    const merged = [ranges[0]];

    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1];
      const current = ranges[i];
      if (current.from <= last.to + 1) {
        last.to = Math.max(last.to, current.to);
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  shouldSkipAppend(transactions: Transaction[]): boolean {
    return transactions.some(tr => tr.getMeta('skipAppendTransaction'));
  }

  isUndoOrRedo(transactions: Transaction[]): boolean {
    return transactions.some(tr => tr.getMeta('history')?.undo || tr.getMeta('history')?.redo);
  }


  isRequiredNewId(
    node: Node,
    objIds: string[],
    view: EditorView,
    prevState: EditorState,
    nextState: EditorState,
    pos: number
  ): boolean {
    let required = false;
    if (this.requiredAddAttr(node)) {
      required = true;
    } else {
      const objId = node.attrs[ATTR_OBJID];
      if (objIds.includes(objId) && view?.['input']?.['lastKeyCode'] !== BACKSPACEKEYCODE) {
        // objectId already exists, recreate
        required = true;
      } else {
        required = this.createNewId(
          node,
          objId,
          objIds,
          view,
          prevState,
          nextState,
          pos
        );
      }
    }

    return required;
  }

  createNewId(
    node: Node,
    objId: string,
    objIds: string[],
    view: EditorView,
    prevState: EditorState,
    nextState: EditorState,
    pos: number
  ): boolean {
    let required = false;
    // create new id for first para on enter key press from the begining of a document
    if (objId && view) {
      if (this.isNewParagraph(prevState, nextState, pos, view)) {
        required = true;
      } else if (
        this.isCut &&
        this.getState(nextState).cutObjectIds.some(
          (objId) => objId.objectId === node.attrs[ATTR_OBJID]
        )
      ) {
        required = true;
        this.isCut = false;
      } else if (
        'object' === typeof objId &&
        'citationnote' === node.type.name
      ) {
        required = true;
      } else {
        objIds.push(objId);
      }
    }

    return required;
  }

  nodeAssignment(state: EditorState): Record<string, unknown> {
    const nodesById = {};
    state.doc.descendants((node) => {
      if (this.isTargetNodeAllowed(node) && node.attrs.objectId) {
        nodesById[node.attrs.objectId] = node;
      }
    });

    return nodesById;
  }

  /**
   * Update the list of deleted Object Id's.
   *
   * @param {*} prevState document state before change.
   * @param {*} nextState document state after change.
   * @param {*} tr current transaction if any.
   */
  trackDeletedObjectId(
    prevState: EditorState,
    nextState: EditorState,
    tr: Transaction
  ): Transaction {
    if (prevState.doc !== nextState.doc) {
      // Find id's in old document state that are not in the new.
      const deletedIds = new Set();
      const prevNodesById = this.nodeAssignment(prevState);
      const nextNodesById = this.nodeAssignment(nextState);
      Object.keys(prevNodesById)
        .filter((id) => nextNodesById[id] === undefined)
        .forEach((id) => deletedIds.add(id));

      if (0 < deletedIds.size) {
        // New deleted items have been found.
        // Add any previously deleted items to the set to prevent the same id from
        // appearing in the list multiple times.
        const existingIds = nextState.doc.attrs[ATTR_DELETEDOBJIDS] ?? [];
        existingIds.forEach((id: string) => deletedIds.add(id));

        // Build step to change document.
        const step = new SetDocAttrStep(
          ATTR_DELETEDOBJIDS,
          Array.from(deletedIds)
        );

        // Create updated transaction to apply the change.
        tr = (tr || nextState.tr).step(step);
      }
    }
    return tr;
  }

  createNewAttributes(schema: Schema): void {
    const contentArr = [];

    ALLOWED_NODES.forEach((name) => {
      const content = this.getContent(name, schema);
      if (content) {
        contentArr.push(content);
        contentArr.push(schema.nodes[name]);
      }
    });

    contentArr.forEach((content) => {
      NEWATTRS.forEach((attr) => {
        this.createAttribute(content, attr, null);
      });
    });
  }

  applyEffectiveSchema(schema: Schema): Schema {
    if (schema?.[SPEC]) {
      this.createNewAttributes(schema);
    }

    return schema;
  }

  createAttribute(
    content: NodeSpec,
    key: string,
    value: string | number | null
  ): void {
    content.attrs ??= {};
    content.attrs[key] ??= {
      default: value,
      hasDefault: true, // Attribute2 expects this despite not being in the schema
      validate: validateAttr,
    } as AttributeSpec;
  }

  getContent(type: string, schema: Schema): NodeSpec {
    const nodes = schema.spec.nodes;
    const content: NodeSpec = nodes.get(type);
    return content;
  }

  // checks enter key applied from begining of a paragraph
  isNewParagraph(
    prevState: EditorState,
    _nextState: EditorState,
    pos: number,
    view: EditorView
  ): boolean {
    let bOk = false;
    if (
      ENTERKEYCODE === view?.['input']?.['lastKeyCode'] &&
      prevState.selection.$from.pos === prevState.selection.$from.start() &&
      pos === prevState.selection.from - 1
    ) {
      bOk = true;
    }
    return bOk;
  }

  private getParentBySelection(doc: Node, sel: TextSelection, type: NodeType) {
    const pos = sel.$cursor ? sel.$cursor.pos : sel.$to.pos;
    return findParentNodeClosestToPos(
      doc.resolve(pos),
      (node) => node.type === type
    );
  }

  private getParentByPosition(doc: Node, pos: number, type: NodeType) {
    return findParentNodeClosestToPos(
      doc.resolve(pos),
      (node) => node.type === type
    );
  }

  // set the dirty flag on each changes on editor and also for undo operations.
  setDirtyFlagOnChange(
    prevState: EditorState,
    nextState: EditorState,
    tr: Transaction,
    docChanged: boolean
  ): Transaction {
    let isDirty = false;
    let isOnLoad = false;
    const { selection, schema } = nextState;
    if (
      !(
        selection instanceof TextSelection &&
        prevState.selection instanceof TextSelection
      )
    ) {
      return tr;
    }

    const para = this.getParentBySelection(
      nextState.doc,
      selection,
      schema.nodes.paragraph
    );
    const para1 = this.getParentBySelection(
      prevState.doc,
      prevState.selection,
      schema.nodes.paragraph
    );

    if (tr) {
      const curSelection = tr['curSelection'];
      if (curSelection) {
        const para2 = this.getParentBySelection(
          tr.doc,
          curSelection,
          schema.nodes.paragraph
        );
        isDirty = !!para2?.node.attrs.dirty;
      }
    }

    if (!isDirty) {
      isDirty = !!para1?.node.attrs.dirty;
    }
    if (para && para1) {
      // on document load the last paragraph becomes dirty, to avoid that we check the position between the two paragraphs
      isOnLoad = para.pos - para1.pos > 3;
    }
    if (para && docChanged && !isOnLoad && (!isDirty && !para.node.attrs.dirty)) {
      tr ??= nextState.tr;
      tr = tr.setNodeMarkup(para.pos, null, {
        ...para.node.attrs,
        dirty: true,
      });
    }
    if (para) {
      const parentTable = this.getParentByPosition(
        nextState.doc,
        para.pos,
        schema.nodes.table
      );
      if (parentTable && !parentTable.node.attrs.dirty) {
        tr ??= nextState.tr;
        tr = tr.setNodeMarkup(parentTable.pos, null, {
          ...parentTable.node.attrs,
          dirty: true,
        });
      }
    }
    return tr;
  }
}

export function validateAttr(value: unknown): boolean {
  return (
    [null, undefined].includes(value) ||
    ['string', 'number'].includes(typeof value)
  );
}
