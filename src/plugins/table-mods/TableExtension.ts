/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Plugin, PluginKey} from 'prosemirror-state';
import {Schema} from 'prosemirror-model';
import {
  TableCellNodeSpec,
} from './TableCellNodeSpec';
import {TABLE_CELL} from './Constants';

export class TableExtensionPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TableExtensionPlugin'),
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
    const nodes = schema.spec.nodes.update(
      TABLE_CELL,
      TableCellNodeSpec(schema.spec.nodes.get(TABLE_CELL))
    );
    const marks = schema.spec.marks;

    return new Schema({
      nodes: nodes,
      marks: marks,
    });
  }
}
