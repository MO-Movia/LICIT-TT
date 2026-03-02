/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import type { LicitNode, LicitDocument } from '../models/licit-document';
import { blankNode, textNode } from './licit-gen-json';

/**
 * Repairs simple errors in a licit document and migrate legacy licit documents.
 * @param docJson document to repair/update.
 * @returns a valid version of the Licit document.
 */
export function repairDoc(docJson: LicitDocument): LicitDocument {
  const clonedJSON = structuredClone(docJson);
  for (const node of clonedJSON?.content ?? []) {
    processNodeContent(node);
  }
  return clonedJSON;
}

function processNodeContent(this: void, node: LicitNode): void {
  switch (node?.type) {
    case 'text':
      repairTextNode(node);
      break;
    case 'table_cell':
      node.type = 'tableCell'; // czi to tiptap type
      repairTableCellNode(node);
      break;
    case 'table_header':
      node.type = 'tableHeader'; // czi to tiptap type
      repairTableCellNode(node);
      break;
    case 'table_row':
      node.type = 'tableRow'; // czi to tiptap type
      break;
    case 'hard_break':
      node.type = 'hardBreak'; // czi to tiptap type
      break;
    case 'horizontal_rule':
      node.type = 'horizontalRule'; // czi to tiptap type
      break;
  }
  node.content?.forEach(processNodeContent);
}
function repairTextNode(content: LicitNode): void {
  content.text ??= ' ';
}

function repairTableCellNode(content: LicitNode): void {
  if (
    Array.isArray(content.attrs?.colwidth) &&
    content.attrs.colwidth[0] == null
  ) {
    content.attrs.colwidth = null;
  }
  if (content?.attrs?.background) {
    // prefer tiptap style if present
    content.attrs.backgroundColor ??= content.attrs.background;
    delete content.attrs.background;
  }
  if (!content.content?.length) {
    content.content = [
      {
        ...blankNode('paragraph'),
        content: [textNode()],
      },
    ];
  }
}
