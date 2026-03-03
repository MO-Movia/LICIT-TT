/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node, Schema } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey } from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import {
  makeKeyMapWithCommon,
  createKeyMapPlugin,
  UICommand,
} from '../../core';
import { InfoIconNodeSpec } from './infoIconNodeSpec';
import { InfoIconView } from './infoIconView';
import { InfoIconCommand } from './infoIconCommand';
import {DarkThemeIcon, LightThemeIcon} from './images';

export const INFO_ICON = 'infoicon';
export const KEY_INFO_ICON = makeKeyMapWithCommon(
  'infoIcon',
  'Mod-Alt' + '-i'
);
const INFO_ICON_CMD = new InfoIconCommand();


function createInfoIconKeyMap() {
  return {
    [KEY_INFO_ICON.common]: (INFO_ICON_CMD as UICommand).execute,
  };
}

export class InfoIconPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('InfoIconPlugin'),
      props: {
        nodeViews: {},
      },
      state: {
        init(_config, _state) {
          this.spec.props.nodeViews[INFO_ICON] = bindInfoIconView.bind(this);
        },
        apply(_tr, _prev, _, _newState) {
          //do nothing
        },
      },
    });
  }

  getEffectiveSchema(schema: Schema): Schema {
    const nodes = schema.spec.nodes.addToEnd('infoicon', InfoIconNodeSpec);
    const marks = schema.spec.marks;
    schema = new Schema({ nodes, marks });
    return schema;
  }

  initKeyCommands(): unknown {
    return createKeyMapPlugin(createInfoIconKeyMap(),
      'InfoIconKeyMap'
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
        [`[${image}] Add Info Icon`]: INFO_ICON_CMD,
      };
    }

public static createInfoIcon(
  state: EditorState,
  dispatch: (tr: Transform) => void,
  view: EditorView
): Transform | boolean {
  return INFO_ICON_CMD.execute(state, dispatch, view);
}
}

export function bindInfoIconView(
  node: Node,
  view: EditorView,
  curPos: boolean | (() => number)
): InfoIconViewExt {
  return new InfoIconViewExt(node, view, curPos);
}

class InfoIconViewExt extends InfoIconView {
  constructor(node: Node, view: EditorView, getCurPos) {
    super(node, view, getCurPos);
  }
}
