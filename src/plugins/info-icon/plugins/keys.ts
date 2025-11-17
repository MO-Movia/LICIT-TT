import { baseKeymap, toggleMark } from '@tiptap/pm/commands';
import { undo, redo } from '@tiptap/pm/history';
import { keymap } from '@tiptap/pm/keymap';
import { MarkSpec, MarkType } from '@tiptap/pm/model';

export default () =>
  keymap({
    ...baseKeymap,
    'Mod-z': undo,
    'Shift-Mod-z': redo,
    'Mod-b': toggleMark(marks.strong as unknown as MarkType),
    'Mod-i': toggleMark(marks.em as unknown as MarkType),
  });

export type Marks = 'em' | 'strong';

export const marks: { em: MarkSpec; strong: MarkSpec } = {
  em: {
    parseDOM: [{ tag: 'em' }, { tag: 'i' }, { style: 'font-style=italic' }],
    toDOM: () => ['em', 0],
  },

  strong: {
    parseDOM: [{ tag: 'strong' }, { tag: 'b' }, { style: 'font-weight=bold' }],
    toDOM: () => ['strong', 0],
  },
};
