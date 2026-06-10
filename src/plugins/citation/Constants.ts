/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node} from 'prosemirror-model';
import {Transform} from 'prosemirror-transform';
export const CITATION_NOTE = 'citationnote';
export const MARK_UNDERLINE = 'underline';
export const MARK_TEXT_HIGHLIGHT = 'mark-text-highlight';
export const HASCITATION = 'hasCitation';
export const MARKFROM = 'markFrom';
export const PARAGRAPH = 'paragraph';
export const HEADING = 'heading';
export const HIGHLIGHTDECO = 'citationHighLightDecoration';
export enum MODE {
  new = 1,
  modify = 2,
  delete = 3,
}

export interface Marking {
  portionMarking?: string;
}
export interface CapcoService<T extends Marking> {
  openManagementDialog(selectedCapco?: T): Promise<Marking | null>;
}

export type CitationRuntime<T extends Marking> = {
  capcoService: CapcoService<T>;
};

//to get the selected node
export function getNode(
  from: number,
  to: number,
  tr: Transform
): Node | undefined {
  let selectedNode: Node | undefined;
  tr.doc.nodesBetween(from, to, (node, _startPos) => {
    if (node.type.name === 'paragraph') {
      selectedNode ??= node;
    }
  });
  return selectedNode;
}
