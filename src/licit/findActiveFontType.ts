/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState, TextSelection } from 'prosemirror-state';

import { MARK_FONT_TYPE } from '../commands/MarkNames';
import findActiveMark from './findActiveMark';

// This should map to `--czi-content-font-size` at `czi-editor.css`.
export const FONT_TYPE_NAME_DEFAULT = 'Arial';

function normalizeFontFamily(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const quoted = /^(?:"([^"]+)"|'([^']+)')/.exec(normalized);
  return (quoted?.[1] ?? quoted?.[2] ?? normalized.split(',')[0])
    .trim()
    .replace(/^["']|["']$/g, '');
}

function findCellFontFamily(state: EditorState): string | null {
  const resolvedPositions = [state.selection.$from, state.selection.$to].filter(
    Boolean
  );
  const values: string[] = [];

  for (const $pos of resolvedPositions) {
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth);
      if (
        node.type.spec.tableRole === 'cell' ||
        node.type.spec.tableRole === 'header_cell'
      ) {
        const value = normalizeFontFamily(node.attrs.fontName);
        if (value) {
          values.push(value);
        }
        break;
      }
    }
  }

  return values.length && values.every((value) => value === values[0])
    ? values[0]
    : null;
}

export default function findActiveFontType(state: EditorState): string {
  const { schema, doc, selection, tr } = state;
  const markType = schema.marks[MARK_FONT_TYPE];
  if (!markType) {
    return FONT_TYPE_NAME_DEFAULT;
  }
  const { from, to, empty } = selection;

  if (empty) {
    const storedMarks =
      tr.storedMarks ||
      state.storedMarks ||
      (selection as TextSelection).$cursor?.marks?.() ||
      [];
    const sm = storedMarks.find((m) => m.type === markType);
    return (
      normalizeFontFamily(sm?.attrs?.name) ??
      findCellFontFamily(state) ??
      FONT_TYPE_NAME_DEFAULT
    );
  }

  const mark = findActiveMark(doc, from, to, markType);
  const fontName = mark?.attrs.name;
  return (
    normalizeFontFamily(fontName) ??
    findCellFontFamily(state) ??
    FONT_TYPE_NAME_DEFAULT
  );
}
