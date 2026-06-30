/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { Decoration, DecorationSet } from 'prosemirror-view';

const PLACE_HOLDER_ID = { name: 'CursorPlaceholderPlugin' };
const CURSOR_PLACEHOLDER_PLUGIN_KEY = new PluginKey('CursorPlaceholderPlugin');

// https://prosemirror.net/examples/upload/
const SPEC = {
  // Upgrade outdated packages.
  key: CURSOR_PLACEHOLDER_PLUGIN_KEY,
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, set: DecorationSet): DecorationSet {
      // ProseMirror DecorationSet.map(mapping, doc) � not Array.map
      set = set.map(tr.mapping, tr.doc);    // NOSONAR
      const action = tr.getMeta(this);
      if (!action) {
        return set;
      }
      if (action.add) {
        const widget = document.createElement('molm-czi-cursor-placeholder');
        widget.className = 'molm-czi-cursor-placeholder';
        const deco = Decoration.widget(action.add.pos, widget, {
          id: PLACE_HOLDER_ID,
        });
        set = set.add(tr.doc, [deco]);
      } else if (action.remove) {
        const found = set.find(null, null, specFinder);
        set = set.remove(found);
      }

      return set;
    },
  },
  props: {
    decorations: (state): DecorationSet | null => {
      const plugin = singletonInstance;
      return plugin ? (plugin.getState(state) as DecorationSet) : null;
    },
  },
};

export class CursorPlaceholderPlugin extends Plugin {
  constructor() {
    super(SPEC);
  }
}

export function specFinder(spec: Record<string, unknown>): boolean {
  return spec.id === PLACE_HOLDER_ID;
}

export function resetInstance(): void {
  singletonInstance = new CursorPlaceholderPlugin();
}
function findCursorPlaceholderPos(state: EditorState): number | null {
  if (!singletonInstance) {
    return null;
  }
  const decos = singletonInstance.getState(state) as DecorationSet;
  const found = decos?.find(null, null, specFinder);
  const pos = found?.length ? found[0].from : null;
  return pos || null;
}

export function isPlugin(
  plugin: CursorPlaceholderPlugin | null,
  tr: Transaction
): boolean {
  if (!plugin || !tr.selection) {
    return true;
}
else{
  return false;
}
}
export function showCursorPlaceholder(state: EditorState): Transform {
  const plugin = singletonInstance;
  let { tr } = state;
  if (isPlugin(plugin,tr)) {
    return tr;
  }

  const pos = findCursorPlaceholderPos(state);
  if (pos === null) {
    if (!tr.selection.empty) {
      // Replace the selection with a placeholder.
      tr = tr.deleteSelection();
    }
    tr = tr.setMeta(plugin, {
      add: {
        pos: tr.selection.from,
      },
    });
  }

  return tr;
}

export function hideCursorPlaceholder(state: EditorState): Transform {
  const plugin = singletonInstance;
  let { tr } = state;
  if (!plugin) {
    return tr;
  }
  const pos = findCursorPlaceholderPos(state);
  if (pos !== null) {
    tr = tr.setMeta(plugin, {
      remove: {},
    });
  }

  return tr;
}

let singletonInstance: CursorPlaceholderPlugin = new CursorPlaceholderPlugin();