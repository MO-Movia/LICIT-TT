/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorView} from 'prosemirror-view';
import {
  FloatingMenuItem,
  type FloatingMenuContext,
  type SourceContext,
} from './model';
import {Slice} from 'prosemirror-model';
import type {Transaction} from 'prosemirror-state';

export function editorHasTextSelection(this: void, ctx: FloatingMenuContext) {
  const selection = ctx?.editorView?.state?.selection;
  return !selection || selection.empty
    ? 'No text selected'
    : undefined;
}

export interface MenuConfig {
  hasClipboard?: () => string | false;
}

export function getDefaultMenuItems(config?: MenuConfig): FloatingMenuItem[] {
  return [
    {
      label: 'Copy (Ctrl + C)',
      disabled: editorHasTextSelection,
      onClick: copySelectionRich,
      hotKeys: 'Mod-c',
    },
    {
      label: 'Copy Without Formatting',
      disabled: editorHasTextSelection,
      onClick: copySelectionPlain,
    },
    {
      isEdit: true,
      label: 'Paste (Ctrl + V)',
      disabled: config?.hasClipboard,
      onClick: pasteFromClipboard,
      hotKeys: 'Mod-v',
    },
    {
      isEdit: true,
      label: 'Paste As Plain Text',
      disabled: config?.hasClipboard,
      onClick: pasteAsPlainText,
    },
  ];
}

export async function copySelectionRich(this: void, ctx: FloatingMenuContext) {
  const view = ctx.editorView;
  const {state} = ctx.editorView;
  if (state.selection.empty) return;

  if (!view.hasFocus()) view.focus();

  const slice = state.selection.content();

  const sliceJSON = {
    content: slice.content.toJSON(),
    openStart: slice.openStart,
    openEnd: slice.openEnd,
    sourceContext: createSourceContext(view),
  };

  return navigator.clipboard
    .writeText(JSON.stringify(sliceJSON))
    .then(() => {})
    .catch((err) => console.error('Clipboard write failed', err));
}

export async function copySelectionPlain(this: void, ctx: FloatingMenuContext) {
  const view = ctx.editorView;
  if (!view.hasFocus()) {
    view.focus();
  }
  const {from, to} = view.state.selection;
  if (from === to) return;

  const slice = view.state.doc.slice(from, to);
  const text = slice.content.textBetween(0, slice.content.size, '\n');

  return navigator.clipboard
    .writeText(text)
    .then(() => {})
    .catch((err) => console.error('Clipboard write failed:', err));
}

export async function pasteFromClipboard(this: void, ctx: FloatingMenuContext) {
  const view = ctx.editorView;
  try {
    if (!view.hasFocus()) view.focus();

    const text = await navigator.clipboard.readText();
    let tr: Transaction;

    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const parsed = JSON.parse(text);
      const slice = Slice.fromJSON(view.state.schema, parsed);
      tr = view.state.tr.replaceSelection(slice);
    } else {
      tr = view.state.tr.insertText(
        text,
        view.state.selection.from,
        view.state.selection.to
      );
    }
    view.dispatch(tr.scrollIntoView());
  } catch (err) {
    console.error('Clipboard paste failed:', err);
  }
}

export async function pasteAsPlainText(this: void, ctx: FloatingMenuContext) {
  const view = ctx.editorView;
  try {
    if (!view.hasFocus()) view.focus();

    const text = await navigator.clipboard.readText();
    let plainText = text;

    try {
      const parsed = JSON.parse(text);
      const slice = Slice.fromJSON(view.state.schema, parsed);

      const frag = slice.content;
      plainText = '';
      frag.forEach((node) => {
        plainText += node.textContent + '\n';
      });
      plainText = plainText.trim();
    } catch {
      // Not JSON → just keep as is
    }

    const {state} = view;
    const tr = state.tr.insertText(
      plainText,
      state.selection.from,
      state.selection.to
    );
    view.dispatch(tr.scrollIntoView());
  } catch (err) {
    console.error('Plain text paste failed:', err);
  }
}

export async function clipboardHasData(): Promise<boolean> {
  try {
    const text = await navigator.clipboard.readText();
    return !!text;
  } catch {
    return false;
  }
}

export async function clipboardHasProseMirrorData(): Promise<boolean> {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return false;
    const parsed = JSON.parse(text);
    return !!(
      parsed &&
      typeof parsed === 'object' &&
      parsed.content &&
      (Array.isArray(parsed.content) || parsed.content.type)
    );
  } catch {
    return false;
  }
}

export function createSourceContext(
  editorView: EditorView,
  textPreviewLength = 20
): SourceContext {
  editorView.focus();

  const $from = editorView.state.selection.$from;
  const $to = editorView.state.selection.$to;

  const from = $from.start($from.depth);
  const to = $to.end($to.depth);

  const paragraphEntries: {pos: number; id?: string; text?: string}[] = [];

  editorView.state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'paragraph') {
      paragraphEntries.push({
        pos,
        id: node.attrs?.objectId,
        text: node.textContent?.trim() || undefined,
      });
    }
  });

  paragraphEntries.sort((a, b) => a.pos - b.pos);
  const objectIds = paragraphEntries
    .map((entry) => entry.id)
    .filter((id) => id !== undefined);

  const firstParagraphText =
    paragraphEntries.find((entry) => entry.text)?.text ?? '';

  const initialText = (firstParagraphText || 'Untitled').substring(
    0,
    textPreviewLength
  );

  const sliceModel: SourceContext = {
    source: editorView.state.doc?.attrs?.objectId,
    from: objectIds.length > 0 ? objectIds[0] : '',
    to: objectIds.length > 0 ? objectIds.at(-1) : '',
    ids: objectIds,
    initialText,
  };
  return sliceModel;
}
