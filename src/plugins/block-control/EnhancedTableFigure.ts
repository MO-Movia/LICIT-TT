/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Plugin, PluginKey} from 'prosemirror-state';
import {Schema} from 'prosemirror-model';
import {EnhancedTableCommands} from './EnhancedTableCommands';
import {
  enhancedTableFigureNodeSpec,
  enhancedTableFigureBodyNodeSpec,
  enhancedTableFigureNotesNodeSpec,
  enhancedTableFigureCapcoNodeSpec,
} from './EnhancedTableNodeSpec';
import {
  ENHANCED_TABLE_FIGURE_BODY,
  ENHANCED_TABLE_FIGURE,
  ENHANCED_TABLE_FIGURE_CAPCO,
  ENHANCED_TABLE_FIGURE_NOTES,
} from './Constants';
import {ImageUploadCommand} from './ImageUploadCommand';
import {EnhancedTableFigureView} from './EnhancedTableFigureView';
import {DarkThemeIcon, LightThemeIcon} from './images';
export class EnhancedTableFigure extends Plugin {
  constructor() {
    super({
      key: new PluginKey('EnhancedTableFigure'),
      state: {
        init(_config, _state) {
          // do nothing
        },
        apply(_tr, _set) {
          //do nothing
        },
      },
      props: {
        nodeViews: {
          enhanced_table_figure(node, view, getPos) {
            return new EnhancedTableFigureView(node, view, getPos);
          },
        },
      },
    });
  }

  getEffectiveSchema(schema: Schema): Schema {
    const nodes = schema.spec.nodes.append({
      [ENHANCED_TABLE_FIGURE]: enhancedTableFigureNodeSpec,
      [ENHANCED_TABLE_FIGURE_BODY]: enhancedTableFigureBodyNodeSpec,
      [ENHANCED_TABLE_FIGURE_NOTES]: enhancedTableFigureNotesNodeSpec,
      [ENHANCED_TABLE_FIGURE_CAPCO]: enhancedTableFigureCapcoNodeSpec,
    });
    const marks = schema.spec.marks;

    return new Schema({
      nodes: nodes,
      marks: marks,
    });
  }

  initButtonCommands(theme: string): unknown {
    let image = null;
    if ('light' == theme) {
      image = LightThemeIcon;
    } else {
      image = DarkThemeIcon;
    }
    return {
      [`[${image}] Insert Enhanced Table-Figure`]: [
        {
          ' Table': new EnhancedTableCommands('table'),
          ' Insert image from computer': new ImageUploadCommand(),
        },
      ],
    };
  }
}
