import { Node, Schema } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  makeKeyMapWithCommon,
  createKeyMapPlugin,
} from '@modusoperandi/licit-doc-attrs-step';
import { InfoIconNodeSpec } from './infoIconNodeSpec';
import { InfoIconView } from './infoIconView';
import { InfoIconCommand } from './infoIconCommand';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
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
