/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState, Plugin, PluginKey} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {Decoration, DecorationSet} from 'prosemirror-view';

const PLACE_HOLDER_ID = {name: 'CursorPlaceholderPlugin'};

// https://prosemirror.net/examples/upload/
export const SPEC = {
  // [FS] IRAD-1005 2020-07-07
  // Upgrade outdated packages.
  key: new PluginKey('CursorPlaceholderPlugin'),
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, decorationSet) {
      decorationSet = decorationSet.map(tr.mapping, tr.doc); //NOSONAR
      const action = tr.getMeta(CursorPlaceholderPlugin.instance);
      if (!action) {
        return decorationSet as DecorationSet;
      }
      if (action.add) {
        const widget = document.createElement('czi-cursor-placeholder');
        widget.className = 'czi-cursor-placeholder';
        const deco = Decoration.widget(action.add.pos, widget, {
          id: PLACE_HOLDER_ID,
        });
        decorationSet = decorationSet.add(tr.doc, [deco]);
      } else if (action.remove) {
        const found = decorationSet.find(null, null, specFinder);
        decorationSet = decorationSet.remove(found);
      }
      return decorationSet as DecorationSet;
    },
  },
  props: {
    decorations: (state) => {
      return CursorPlaceholderPlugin.instance ? (CursorPlaceholderPlugin.instance.getState(state) as DecorationSet) : null;
    },
  },
};

class CursorPlaceholderPlugin extends Plugin {
  private static _instance: CursorPlaceholderPlugin = null;

  static get instance(): CursorPlaceholderPlugin {
    return CursorPlaceholderPlugin._instance;
  }

  constructor() {
    super(SPEC);
    CursorPlaceholderPlugin._instance = this as CursorPlaceholderPlugin;
  }

  static getInstance(): CursorPlaceholderPlugin {
    if (!CursorPlaceholderPlugin._instance) {
      CursorPlaceholderPlugin._instance = new CursorPlaceholderPlugin();
    }
    return CursorPlaceholderPlugin._instance;
  }
}

function specFinder(spec: Record<string, unknown>): boolean {
  return spec.id === PLACE_HOLDER_ID;
}

export function findCursorPlaceholderPos(state: EditorState): number {
  if (!CursorPlaceholderPlugin.instance) {
    return null;
  }
  const decos = CursorPlaceholderPlugin.instance.getState(state);
  const found = decos.find(null, null, specFinder);
  const pos = found.length ? found[0].from : null;
  return (pos as number) || null;
}

export function showCursorPlaceholder(state: EditorState): Transform {
  const plugin = CursorPlaceholderPlugin.instance;
  let {tr} = state;
  if (!plugin || !tr.selection) {
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
  const plugin = CursorPlaceholderPlugin.instance;
  let {tr} = state;
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

export default CursorPlaceholderPlugin;
