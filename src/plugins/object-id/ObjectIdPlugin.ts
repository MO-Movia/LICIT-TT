// Plugin to handle automatic assign unique id to the block nodes.
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
const NEWATTRS = [ATTR_OBJID, ATTR_OBJMETADATA, ATTR_DIRTY];
const ENTERKEYCODE = 13;
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
      appendTransaction: (
        transactions: Transaction[],
        prevState: EditorState,
        nextState: EditorState
      ) => {
        if (transactions.some((tr) => tr.getMeta('skipAppendTransaction'))) {
          return null;
        }
        let tr: Transaction | null = null;
        const self = this as ObjectIdPlugin;
        const docChanged = self.isDocChanged(transactions);
        if (!this.loaded || docChanged) {
          this.loaded = true;
          tr = self.assignIDsForMissing(prevState, nextState, this.view);
          if (this.pastedPara?.content?.childCount > 1) {
            tr = self.assignSameObjectMetaDataForCutPastePara(nextState, tr);
          }
          tr = self.trackDeletedObjectId(prevState, nextState, tr);
          tr = self.setDirtyFlagOnChange(prevState, nextState, tr, docChanged);
          // Restore the stored marks here
          // otherwise the stored marks will be lost
          if (tr && nextState.tr) {
            tr.storedMarks = nextState.tr.storedMarks;
          }
        }
        return tr;
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
    return node.attrs?.[attrName] !== undefined;
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
      trans.doc.descendants((node, pos) => {
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

  assignIDsForMissing(
    prevState: EditorState,
    nextState: EditorState,
    view: EditorView
  ): Transaction | null {
    let tr = nextState.tr;
    let modified = false;
    const objIds = [];
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

    // Adds a unique id to a node
    tr.doc.descendants((node, pos) => {
      const required = this.isRequiredNewId(
        node,
        objIds,
        view,
        prevState,
        nextState,
        pos
      );
      if (required) {
        const newId = createObjectId(prefix, suffix);
        const attrs = node.attrs;
        objIds.push(newId);
        tr.setNodeMarkup(pos, undefined, {
          ...attrs,
          [ATTR_OBJID]: newId,
          [ATTR_OBJMETADATA]: null,
          [ATTR_DIRTY]: true,
        });
        modified = true;
      }
    });

    return modified ? tr : null;
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
      if (objIds.includes(objId)) {
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

    if (docChanged && !isDirty && para && !para.node.attrs.dirty) {
      tr ??= nextState.tr;
      tr = tr.setNodeMarkup(para.pos, null, {
        ...para.node.attrs,
        dirty: true,
      });
    }
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
    return tr;
  }
}

export function validateAttr(value: unknown): boolean {
  return (
    [null, undefined].includes(value) ||
    ['string', 'number'].includes(typeof value)
  );
}
