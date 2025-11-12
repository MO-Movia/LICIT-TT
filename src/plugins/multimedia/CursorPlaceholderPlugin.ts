import { EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { Decoration, DecorationSet } from 'prosemirror-view';

const PLACE_HOLDER_ID = { name: 'CursorPlaceholderPlugin' };

let singletonInstance: CursorPlaceholderPlugin = null;

// https://prosemirror.net/examples/upload/
const SPEC = {
  // Upgrade outdated packages.
  key: new PluginKey('CursorPlaceholderPlugin'),
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, set) {
      set = set.map(tr.mapping, tr.doc);
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
    decorations: (state) => {
      const plugin = singletonInstance;
      return plugin ? plugin.getState(state) : null;
    },
  },
};

export class CursorPlaceholderPlugin extends Plugin {
  constructor() {
    super(SPEC);
    if (!singletonInstance) {
      singletonInstance = this as CursorPlaceholderPlugin;
    }
  }
}

export function specFinder(spec: Record<string, unknown>): boolean {
  return spec.id === PLACE_HOLDER_ID;
}

export function resetInstance() {
  singletonInstance = null;
}
function findCursorPlaceholderPos(state: EditorState): number | null {
  if (!singletonInstance) {
    return null;
  }
  const decos = singletonInstance.getState(state);
  const found = decos.find(null, null, specFinder);
  const pos = found.length ? found[0].from : null;
  return pos || null;
}

export function isPlugin(plugin,tr):boolean {
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

