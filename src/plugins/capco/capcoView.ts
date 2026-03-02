/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

/*
 * File: capcoView.ts
 * Project: @mo/licit-capco
 * Created Date: Tuesday March 18th 2025
 * Author: grodgers
 * -----
 * Last Modified:
 * Modified By:
 * -----
 * Copyright (c) 2025 Modus Operandi
 */

import {DOMSerializer, Node} from 'prosemirror-model';
import {EditorView, NodeView} from 'prosemirror-view';

export class CapcoView implements NodeView {
  dom: globalThis.Node;
  constructor(
    private node: Node,
    outerView: EditorView
  ) {
    // We'll need these later
    const spec = DOMSerializer.renderSpec(
      outerView.dom.ownerDocument,
      this.node.type.spec.toDOM(this.node)
    );
    this.dom = spec.dom;
  }

  update(node: Node): boolean {
    if (!node.sameMarkup(this.node)) {
      return false;
    }
    this.node = node;
    return true;
  }

  stopEvent(_event: Event): boolean {
    return false;
  }

  ignoreMutation(): boolean {
    return true;
  }
}
