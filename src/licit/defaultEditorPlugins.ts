/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Schema} from 'prosemirror-model';
import {Plugin} from 'prosemirror-state';
import {keymap} from 'prosemirror-keymap';
import ContentPlaceholderPlugin from './plugins/contentPlaceholderPlugin';
import CursorPlaceholderPlugin from './plugins/cursorPlaceholderPlugin';
import EditorPageLayoutPlugin from './plugins/editorPageLayoutPlugin';
import LinkTooltipPlugin from './plugins/linkTooltipPlugin';
import SelectionPlaceholderPlugin from './plugins/selectionPlaceholderPlugin';
import buildInputRules from './buildInputRules';
import { setPluginKey } from '../core';
import TableCellMenuPlugin from './plugins/tableCellMenuPlugin';
import createEditorKeyMap from './createEditorKeyMap';
import { LandscapePlugin } from './plugins/LandscapePlugin';
import ChangeBarPlugin, {
  DEFAULT_CHANGE_BAR_TEST_RANGES,
} from './plugins/changeBarPlugin';

// Creates the default plugin for the editor.
export default class DefaultEditorPlugins {
  plugins: Array<Plugin>;

  constructor(schema: Schema) {
    this.plugins = [
      new ContentPlaceholderPlugin(),
      new CursorPlaceholderPlugin(),
      new EditorPageLayoutPlugin(),
      new LinkTooltipPlugin(),
      new SelectionPlaceholderPlugin(),
      setPluginKey(buildInputRules(schema), 'InputRules'),
      setPluginKey(keymap(createEditorKeyMap()), 'EditorKeyMap'),
      new TableCellMenuPlugin(),
      new LandscapePlugin(),
      new ChangeBarPlugin({
        exposeTestApi: true,
        testRanges: DEFAULT_CHANGE_BAR_TEST_RANGES,
      }),
    ];
  }

  get(): Array<Plugin> {
    return this.plugins;
  }
}
