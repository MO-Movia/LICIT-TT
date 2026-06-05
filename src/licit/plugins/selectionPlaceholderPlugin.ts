/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { Decoration, DecorationSet } from 'prosemirror-view';

const PLACE_HOLDER_ID = { name: 'SelectionPlaceholderPlugin' };

let singletonInstance = null;

// https://prosemirror.net/examples/upload/
const SPEC = {
  // [FS] IRAD-1005 2020-07-07
  // Upgrade outdated packages.
  key: new PluginKey('SelectionPlaceholderPlugin'),
  state: {
    init() {
      return DecorationSet.empty;
    },

    apply(tr, decorationSet) {
      decorationSet = decorationSet.map(tr.mapping, tr.doc); //NOSONAR
      const action = tr.getMeta(singletonInstance);
      if (!action) {
        return decorationSet as DecorationSet;
      }
      if (action.add) {
        const deco = Decoration.inline(
          action.add.from,
          action.add.to,
          { class: 'czi-selection-placeholder' },
          { id: PLACE_HOLDER_ID }
        );
        decorationSet = decorationSet.add(tr.doc, [deco]);
      } else if (action.remove) {
        const found = decorationSet.find(null, null, specFinder);
        decorationSet = decorationSet.remove(found);
      }
      return decorationSet as DecorationSet;
    },
  },
  props: {
    decorations: (state:EditorState): DecorationSet | null => {
      const plugin = singletonInstance;
      return plugin ? plugin.getState(state) as DecorationSet : null ;
    },
  },
};

class SelectionPlaceholderPlugin extends Plugin {
  private static _instance: SelectionPlaceholderPlugin = null;

  static get instance(): SelectionPlaceholderPlugin {
    return SelectionPlaceholderPlugin._instance;
  }

  constructor() {
    super(SPEC);
    if (!SelectionPlaceholderPlugin._instance) {
      SelectionPlaceholderPlugin._instance = this;
      singletonInstance = SelectionPlaceholderPlugin._instance;
    }
  }
}

function specFinder(spec: { id: { name: string } }): boolean {
  return spec.id == PLACE_HOLDER_ID;
}

function findSelectionPlaceholder(state: EditorState): Decoration | null {
  if (!singletonInstance) {
    return null;
  }
  if (!state.plugins.includes(singletonInstance)) {
    console.warn('SelectionPlaceholderPlugin is not installed');
    return null;
  }
  const decos = singletonInstance.getState(state);
  const found = decos.find(null, null, specFinder);
  const pos = found.length ? found[0] : null;
  return pos as Decoration || null;
}

export function showSelectionPlaceholder(
  state: EditorState,
  tr?: Transform
): Transform {
  tr = tr || state.tr;
  const plugin = singletonInstance;

  if (
    !plugin ||
    !(tr as Transaction).selection ||
    (tr as Transaction).selection.empty
  ) {
    return tr;
  }

  const deco = findSelectionPlaceholder(state);
  if (deco === null) {
    tr = (tr as Transaction).setMeta(plugin, {
      add: {
        from: (tr as Transaction).selection.from,
        to: (tr as Transaction).selection.to,
      },
    });
  }

  return tr;
}

export function hideSelectionPlaceholder(
  state: EditorState,
  tr?: Transform
): Transform {
  tr = tr || state.tr;
  const plugin = singletonInstance;
  if (!plugin) {
    return tr;
  }

  const deco = findSelectionPlaceholder(state);
  if (deco) {
    tr = (tr as Transaction).setMeta(plugin, {
      remove: {},
    });
  }

  return tr;
}

export default SelectionPlaceholderPlugin;
