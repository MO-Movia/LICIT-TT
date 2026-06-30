/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type {Node} from 'prosemirror-model';
import {Schema} from 'prosemirror-model';
import {Plugin} from 'prosemirror-state';
import type {EditorView} from 'prosemirror-view';
import { makeKeyMapWithCommon, createKeyMapPlugin } from '../../core';
import {GlossaryNodeSpec} from './glossaryNodeSpec';
import {GlossaryView, updateCache} from './glossaryView';
import type {GlossaryRuntime} from './types';
import {GLOSSARY_PLUGIN_KEY, GLOSSARY} from './types';
import {GlossaryCommand} from './glossaryCommand';
import {DarkThemeIcon, LightThemeIcon} from './images';

export const KEY_GLOSSARY = makeKeyMapWithCommon(
  GLOSSARY,
  'Mod-Alt' + '-g'
) as {common: string};

export class GlossaryPlugin extends Plugin<{runtime?: GlossaryRuntime}> {
  constructor(private readonly runtime?: GlossaryRuntime) {
    super({
      key: GLOSSARY_PLUGIN_KEY,
      props: {
        nodeViews: {
          [GLOSSARY]: bindGlossaryView,
        },
      },
      state: {
        init(_config, _state) {
          return {runtime};
        },
        apply(_tr, _prev, _, _newState) {
          return _prev;
        },
      },
    });
    updateCache(runtime?.cache);
  }

  getEffectiveSchema(schema: Schema): Schema {
    const nodes = schema.spec.nodes.addToEnd(GLOSSARY, GlossaryNodeSpec);
    const marks = schema.spec.marks;
    schema = new Schema({nodes, marks});
    return schema;
  }

  initKeyCommands(): unknown {
    return createKeyMapPlugin(
      {
        [KEY_GLOSSARY.common]: new GlossaryCommand(this.runtime)
          .waitForUserInput,
      },
      'GlossaryKeyMap'
    );
  }

  initButtonCommands(theme: string): unknown {
    let image = null;
    if ('light' == theme) {
      image = LightThemeIcon;      
    } else {
      image = DarkThemeIcon;
    }
    return {
      [`[${image}] Insert Glossary/Acronym`]: new GlossaryCommand(this.runtime),
    };
  }
}

function bindGlossaryView(node: Node, view: EditorView): GlossaryView {
  return new GlossaryView(node, view);
}
