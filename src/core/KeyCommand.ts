/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {Plugin, PluginKey, EditorState, Command} from 'prosemirror-state';
import {keymap} from 'prosemirror-keymap';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';

export type UserKeyCommand = (
  state: EditorState,
  dispatch?: (tr: Transform) => void,
  view?: EditorView
) => boolean;

// Allow commands that accept extra arguments or return non-boolean values.
// This matches how our keymaps are used at runtime while keeping types flexible.
export type CommandLike = (
  state: EditorState,
  dispatch?: (tr: unknown) => void,
  view?: EditorView,
  ...args: unknown[]
) => unknown;
export type UserKeyMap = {
  [key: string]: UserKeyCommand;
};

export type KeyMapDescription = {
  description: string;
  windows: string;
  mac: string;
  common?: string;
};

type PluginWithSpec = Plugin & {
  spec: {
    key?: PluginKey;
  };
  key?: string; // Store the string name
};

type KeyBindings = Record<string, Command | UserKeyCommand | CommandLike>;

export type KeyMapItem = {
  map: KeyBindings;
  name: string;
};

export function makeKeyMap(
  description: string,
  windows: string,
  mac: string,
  common?: string
): KeyMapDescription {
  return {
    description: description,
    windows: windows,
    mac: mac,
    common: common,
  };
}

export function makeKeyMapWithCommon(
  description: string,
  common: string
): KeyMapDescription {
  const windows = common.replace(/Mod/i, 'Ctrl');
  const mac = common.replace(/Mod/i, 'Cmd');
  return makeKeyMap(description, windows, mac, common);
}
// [FS] IRAD-1005 2020-07-07
// Upgrade outdated packages.
// set plugin keys so that to avoid duplicate key error when keys are assigned automatically.
export function setPluginKey(plugin: Plugin, key: string): Plugin {
  const pluginWithSpec = plugin as PluginWithSpec;

  if (pluginWithSpec?.spec) {
    pluginWithSpec.spec.key = new PluginKey(key + 'Plugin');
    pluginWithSpec.key = key + 'Plugin'; // Store the string name
  }
  return plugin;
}

export function createKeyMapPlugin( pluginKeyMap: KeyBindings | KeyMapItem[],
  name?: string) {
   if (Array.isArray(pluginKeyMap)) {
    // return a flat array of plugins
    return pluginKeyMap.map(({ map, name }) =>
      setPluginKey(keymap(map as Record<string, Command>), name) as object
    );
  }
    // single map fallback (for backward compatibility)
  return [
    setPluginKey(
      keymap(pluginKeyMap as Record<string, Command>),
      name || 'UnnamedKeyMap'
    ),
  ];

}
