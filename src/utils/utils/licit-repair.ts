/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { LicitNode, LicitDocument } from '../models/licit-document';
import { blankNode, textNode } from './licit-gen-json';

/**
 * Node type names for the Enhanced Table-Figure (EIC) plugin. Used by
 * {@link repairEicBodies} to migrate legacy EIC body structure before
 * the document is loaded into ProseMirror.
 */
const EIC_FIGURE = 'enhanced_table_figure';
const EIC_BODY = 'enhanced_table_figure_body';
const EIC_TABLE = 'enhanced_table_figure_table';
const EIC_IMAGE = 'enhanced_table_figure_image';
const EIC_NOTES = 'enhanced_table_figure_notes';

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
  // Migrate legacy EIC body structure. This must happen after
  // processNodeContent so node type names are already migrated.
  repairEicBodies(clonedJSON);
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
  // Convert legacy mark names to Tiptap/Licit schema names.
  // Marks may be plain strings ('bold') or objects ({type: 'bold', ...}).
  if (Array.isArray(node.marks)) {
    node.marks = (node.marks as Array<string | { type: string }>).map(
      migrateMark,
    );
  }
  for (const child of node.content ?? []) {
    if (child) {
      processNodeContent(child);
    }
  }
}

/**
 * Maps legacy ProseMirror mark names to the names used by the
 * Licit-Tiptap schema.  Documents created with the original
 * `@modusoperandi/licit` package may use `bold` / `italic` marks
 * which the Tiptap-based schema expects as `strong` / `em`.
 */
const MARK_MIGRATIONS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
};

/**
 * Migrates a single legacy mark name to the Licit-Tiptap schema name.
 * Handles both string marks ('bold') and object marks ({type: 'bold', ...}).
 *
 * @param mark - The mark to migrate, as a string or object with a `type`.
 * @returns The migrated mark in the same shape as the input.
 */
function migrateMark(mark: string | { type: string }): string | { type: string } {
  if (typeof mark === 'string') {
    return MARK_MIGRATIONS[mark] ?? mark;
  }
  const migrated = MARK_MIGRATIONS[mark.type];
  return migrated ? { ...mark, type: migrated } : mark;
}

/**
 * Migrates legacy EIC (Enhanced Table-Figure) body structure in the
 * raw JSON before the document is loaded into ProseMirror.
 *
 * The EIC body's content spec is
 * `(enhanced_table_figure_table | enhanced_table_figure_image)`
 * (exactly one payload wrapper). Legacy documents have bare `table` or
 * `image` nodes directly inside the body. Without this migration, the
 * block-control plugin's `appendTransaction` normalizer would fix the
 * structure, but ObjectIdPlugin's `appendTransaction` runs first and
 * calls `setNodeMarkup` on the body, which validates content and throws
 * `Invalid content for node enhanced_table_figure_body` before the
 * block-control normalizer gets a chance to run.
 *
 * This function walks all `enhanced_table_figure` nodes and:
 * 1. Wraps bare `table` children in `enhanced_table_figure_table`
 * 2. Wraps bare `image` or `paragraph > image` children in
 *    `enhanced_table_figure_image`
 * 3. Moves extra paragraphs (displaced notes) into a
 *    `enhanced_table_figure_notes` sibling if one doesn't already exist,
 *    or appends them to the existing notes node.
 *
 * @param doc - The document JSON to repair (mutated in place).
 */
function repairEicBodies(doc: LicitDocument): void {
  for (const node of doc.content ?? []) {
    if (node.type === EIC_FIGURE) {
      repairEicFigure(node);
    }
  }
}

/**
 * Repairs a single EIC figure node's body structure.
 *
 * @param figure - The `enhanced_table_figure` node to repair.
 */
function repairEicFigure(figure: LicitNode): void {
  if (!figure.content?.length) return;

  const children = figure.content;
  const bodyIdx = children.findIndex((c) => c?.type === EIC_BODY);
  if (bodyIdx < 0) return;

  const body = children[bodyIdx];
  if (!body.content?.length) return;

  // Check if the body already has valid wrapper nodes.
  const hasWrapper = body.content.some(
    (c) => c?.type === EIC_TABLE || c?.type === EIC_IMAGE,
  );
  if (hasWrapper) return;

  // Migrate legacy body content: wrap bare tables/images in payload
  // wrappers and collect displaced paragraphs as notes.
  const newBodyContent: LicitNode[] = [];
  const recoveredNotes: LicitNode[] = [];
  let foundPayload = false;

  for (const child of body.content) {
    if (!child) continue;

    if (child.type === 'table') {
      // Wrap bare table in enhanced_table_figure_table.
      newBodyContent.push({
        type: EIC_TABLE,
        attrs: {},
        content: [child],
      });
      foundPayload = true;
    } else if (child.type === 'image') {
      // Wrap bare inline image in enhanced_table_figure_image.
      newBodyContent.push({
        type: EIC_IMAGE,
        attrs: {},
        content: [child],
      });
      foundPayload = true;
    } else if (
      child.type === 'paragraph' &&
      child.content?.length === 1 &&
      child.content[0]?.type === 'image'
    ) {
      // Wrap paragraph > image in enhanced_table_figure_image.
      newBodyContent.push({
        type: EIC_IMAGE,
        attrs: {},
        content: [child.content[0]],
      });
      foundPayload = true;
    } else if (foundPayload && child.type === 'paragraph') {
      // Extra paragraph after the payload — treat as displaced notes.
      // Skip empty paragraphs.
      const text = (child.text ?? '').trim();
      const hasContent =
        child.content?.some(
          (c) => c?.type === 'text' && (c.text ?? '').trim(),
        ) ?? false;
      if (text || hasContent) {
        recoveredNotes.push(child);
      }
    } else {
      // Unknown content — keep it as-is (may cause a schema error later,
      // but we don't want to silently drop content).
      newBodyContent.push(child);
    }
  }

  body.content = newBodyContent;

  // If we recovered notes, add them to the existing notes node or
  // create a new one.
  if (recoveredNotes.length > 0) {
    const notesIdx = children.findIndex((c) => c?.type === EIC_NOTES);
    if (notesIdx >= 0) {
      const notes = children[notesIdx];
      notes.content = [...(notes.content ?? []), ...recoveredNotes];
    } else {
      // Insert a notes node after the body.
      const notesNode: LicitNode = {
        type: EIC_NOTES,
        attrs: { styleName: 'Normal' },
        content: recoveredNotes,
      };
      children.splice(bodyIdx + 1, 0, notesNode);
    }
  }
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
