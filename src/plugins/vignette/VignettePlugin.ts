// Plugin to handle Citation.
import {Plugin, PluginKey} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {Schema} from 'prosemirror-model';
import {VignetteCommand} from './VignetteCommand';
import {
  VignetteTableCellNodeSpec,
  VignetteTableNodeSpec,
} from './VignetteNodeSpec';
import {TABLE, TABLE_CELL} from './Constants';
import {DarkThemeIcon, LightThemeIcon} from './images';

export class VignettePlugin extends Plugin {
  _view: EditorView = null;
  constructor() {
    super({
      key: new PluginKey('VignettePlugin'),
      state: {
        init(_config, _state) {
          // do nothing
        },
        apply(_tr, _set) {
          //do nothing
        },
      },
      props: {
        nodeViews: {},
      },
    });
  }

  getEffectiveSchema(schema: Schema): Schema {
    let nodes = schema.spec.nodes.update(
      TABLE,
      VignetteTableNodeSpec(schema.spec.nodes.get(TABLE))
    );
    nodes = nodes.update(
      TABLE_CELL,
      VignetteTableCellNodeSpec(schema.spec.nodes.get(TABLE_CELL))
    );
    const marks = schema.spec.marks;

    return new Schema({
      nodes: nodes,
      marks: marks,
    });
  }

  initButtonCommands(theme: string) {

    let image = null;
    if ('light' == theme) {
      image = LightThemeIcon;
    } else {
      image = DarkThemeIcon;
    }
    return {
      [`[${image}] Add Vignette`]: new VignetteCommand(),
    };
  }
}
