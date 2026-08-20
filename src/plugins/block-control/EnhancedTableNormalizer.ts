/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {
  Fragment,
  Node as ProseMirrorNode,
  NodeType,
  Schema,
} from 'prosemirror-model';
import { Transaction } from 'prosemirror-state';
import {
  ENHANCED_TABLE_FIGURE,
  ENHANCED_TABLE_FIGURE_BODY,
  ENHANCED_TABLE_FIGURE_IMAGE,
  ENHANCED_TABLE_FIGURE_NOTES,
  ENHANCED_TABLE_FIGURE_TABLE,
} from './Constants';

type FigureReplacement = {
  node: ProseMirrorNode;
  pos: number;
  replacement: ProseMirrorNode;
};

type NormalizedBody = {
  body: ProseMirrorNode;
  changed: boolean;
  recoveredNotes: ProseMirrorNode[];
};

/**
 * Migrates legacy EIC bodies to the dedicated table/image payload wrappers.
 * Extra paragraphs accidentally created beside a payload are moved to notes
 * so tightening the body schema does not discard user-authored text.
 */
export function normalizeLegacyEnhancedTableFigureBodies(
  tr: Transaction,
  schema: Schema
): Transaction {
  const eicImageType = schema.nodes[ENHANCED_TABLE_FIGURE_IMAGE];
  const eicTableType = schema.nodes[ENHANCED_TABLE_FIGURE_TABLE];
  const notesType = schema.nodes[ENHANCED_TABLE_FIGURE_NOTES];
  if (!eicImageType || !eicTableType || !notesType) {
    return tr;
  }

  const replacements: FigureReplacement[] = [];
  tr.doc.descendants((node, pos) => {
    if (node.type.name !== ENHANCED_TABLE_FIGURE) {
      return true;
    }

    const replacement = normalizeFigure(
      node,
      eicImageType,
      eicTableType,
      notesType
    );
    if (replacement) {
      replacements.push({ node, pos, replacement });
    }
    return false;
  });

  replacements.reverse();
  for (const { node, pos, replacement } of replacements) {
    tr = tr.replaceWith(pos, pos + node.nodeSize, replacement);
  }
  return tr;
}

function normalizeFigure(
  figure: ProseMirrorNode,
  eicImageType: NodeType,
  eicTableType: NodeType,
  notesType: NodeType
): ProseMirrorNode | null {
  const children = getChildren(figure);
  const bodyIndex = children.findIndex(
    (child) => child.type.name === ENHANCED_TABLE_FIGURE_BODY
  );
  if (bodyIndex < 0) {
    return null;
  }

  const normalized = normalizeBody(
    children[bodyIndex],
    eicImageType,
    eicTableType
  );
  if (!normalized.changed) {
    return null;
  }

  const notesIndex = children.findIndex(
    (child) => child.type.name === ENHANCED_TABLE_FIGURE_NOTES
  );
  const nextChildren: ProseMirrorNode[] = [];

  children.forEach((child, index) => {
    if (index === bodyIndex) {
      nextChildren.push(normalized.body);
      if (notesIndex < 0 && normalized.recoveredNotes.length) {
        nextChildren.push(
          notesType.create({}, Fragment.fromArray(normalized.recoveredNotes))
        );
      }
      return;
    }

    if (index === notesIndex && normalized.recoveredNotes.length) {
      nextChildren.push(
        child.type.create(
          child.attrs,
          child.content.append(Fragment.fromArray(normalized.recoveredNotes)),
          child.marks
        )
      );
      return;
    }
    nextChildren.push(child);
  });

  return figure.type.create(
    figure.attrs,
    Fragment.fromArray(nextChildren),
    figure.marks
  );
}

function normalizeBody(
  body: ProseMirrorNode,
  eicImageType: NodeType,
  eicTableType: NodeType
): NormalizedBody {
  const legacyChildren = getChildren(body);
  const bodyChildren = legacyChildren.map((child) =>
    normalizePayload(child, eicImageType, eicTableType)
  );
  let changed = bodyChildren.some(
    (child, index) => child !== legacyChildren[index]
  );

  const primary = bodyChildren[0];
  const extras = bodyChildren.slice(1);
  const canRecoverExtras =
    !!primary && isPayloadBlock(primary) && extras.every(isRecoverableParagraph);

  let recoveredNotes: ProseMirrorNode[] = [];
  let normalizedChildren = bodyChildren;
  if (extras.length && canRecoverExtras) {
    normalizedChildren = [primary];
    recoveredNotes = extras.filter((child) => !isEmptyParagraph(child));
    changed = true;
  }

  const normalizedBody = changed
    ? body.type.create(
        body.attrs,
        Fragment.fromArray(normalizedChildren),
        body.marks
      )
    : body;
  return { body: normalizedBody, changed, recoveredNotes };
}

function getChildren(node: ProseMirrorNode): ProseMirrorNode[] {
  return Array.from({ length: node.childCount }, (_, index) => node.child(index));
}

function isPayloadBlock(node: ProseMirrorNode): boolean {
  return (
    node.type.spec.tableRole === 'table' ||
    node.type.name === ENHANCED_TABLE_FIGURE_IMAGE ||
    node.type.name === ENHANCED_TABLE_FIGURE_TABLE ||
    getLegacyImage(node) !== null
  );
}

function normalizePayload(
  node: ProseMirrorNode,
  eicImageType: NodeType,
  eicTableType: NodeType
): ProseMirrorNode {
  const image = getLegacyImage(node);
  if (image) {
    return eicImageType.create({}, image);
  }
  return node.type.spec.tableRole === 'table'
    ? eicTableType.create({}, node)
    : node;
}

function getLegacyImage(node: ProseMirrorNode): ProseMirrorNode | null {
  if (node.type.name === 'image') {
    return node;
  }
  if (
    node.type.name === 'paragraph' &&
    node.childCount === 1 &&
    node.firstChild?.type.name === 'image'
  ) {
    return node.firstChild;
  }
  return null;
}

function isRecoverableParagraph(node: ProseMirrorNode): boolean {
  return node.type.name === 'paragraph' && !isPayloadBlock(node);
}

function isEmptyParagraph(node: ProseMirrorNode): boolean {
  let hasNonTextContent = false;
  node.descendants((child) => {
    if (!child.isText) {
      hasNonTextContent = true;
      return false;
    }
    return true;
  });
  return (
    !hasNonTextContent &&
    node.textContent.replaceAll('\u200B', '').trim().length === 0
  );
}
