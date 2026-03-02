/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Node, Schema } from 'prosemirror-model';
import { ReferenceNodeSpec, REFERENCE } from './ReferenceNodeSpec';
import { ReferenceView } from './ReferenceView';
import { ReferencingPluginOptions } from './Types';

export class ReferencingPlugin extends Plugin {
  constructor(options?: ReferencingPluginOptions) {
    super({
      key: new PluginKey('ReferencingPlugin'),
      props: {
        nodeViews: {
          [REFERENCE]: (
            node: Node,
            view: EditorView,
            getPos: () => number | undefined
          ) => new ReferenceView(node, view, getPos, options?.fetchReference),
        },
      },
    });
  }

  getEffectiveSchema(schema: Schema): Schema {
    const nodes = schema.spec.nodes.addToEnd(REFERENCE, ReferenceNodeSpec);
    const marks = schema.spec.marks;

    return new Schema({
      nodes,
      marks,
    });
  }
}
