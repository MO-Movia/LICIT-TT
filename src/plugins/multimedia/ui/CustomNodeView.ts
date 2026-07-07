/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node} from 'prosemirror-model';
import {Decoration, EditorView, NodeView} from 'prosemirror-view';
import React from 'react';
import {EditorRuntime, EditorVideoRuntime} from '../Types';

import {SelectionObserver} from './SelectionObserver';
import {createRoot, Root} from 'react-dom/client';

export type EditorFocused = EditorView & {
  focused: boolean;
  runtime: EditorRuntime & EditorVideoRuntime;
  readOnly?: boolean;
};
export type NodeViewProps = {
  decorations: Array<Decoration>;
  editorView: EditorFocused;
  getPos: () => number;
  node: Node;
  dom: Element;
  selected: boolean;
  focused: boolean;
};

// Standard className for selected node.
const SELECTED_NODE_CLASS_NAME = 'ProseMirror-selectednode';

const mountedViews = new Set<CustomNodeView>();
const pendingViews = new Set<CustomNodeView>();

export function onMutation(_mutations, observer: MutationObserver): void {
  const root = document.body;
  if (!root) {
    return;
  }

  const mountingViews = [];
  for (const view of pendingViews) {
    const el = view.dom;
    if (root.contains(el)) {
      pendingViews.delete(view);
      mountingViews.push(view);
      view.__renderReactComponent();
    }
  }

  for (const view of mountedViews) {
    const el: Element = view.dom;
    if (!root.contains(el)) {
      mountedViews.delete(view);
    }
  }

  for (const view of mountingViews) {
    mountedViews.add(view);
  }

  if (mountedViews.size === 0) {
    observer.disconnect();
  }
}

// Workaround to get in-selection views selected.
// See https://discuss.prosemirror.net/t/copy-selection-issue-with-the-image-node/1673/2;
export function onSelection(_entries: [], observer: SelectionObserver): void {
  if (!globalThis.getSelection) {
    console.warn('globalThis.getSelection() is not supported');
    observer.disconnect();
    return;
  }

  const selection = globalThis.getSelection();
  if (!selection?.containsNode) {
    console.warn('selection.containsNode() is not supported');
    observer.disconnect();
    return;
  }

  for (const view of mountedViews) {
    const el = view.dom;
    if (selection.containsNode(el)) {
      view.selectNode();
    } else {
      view.deselectNode();
    }
  }

  if (mountedViews.size === 0) {
    observer.disconnect();
  }
}

const selectionObserver = new SelectionObserver(onSelection);
const mutationObserver = new MutationObserver(onMutation);

// This implements the `NodeView` interface and renders a Node with a react
// Component.
// https://prosemirror.net/docs/ref/#view.NodeView
// https://github.com/ProseMirror/prosemirror-view/blob/master/src/viewdesc.js#L429
export class CustomNodeView implements NodeView {
  dom: HTMLElement;
  _onClick: () => void;
  props: NodeViewProps;
  reactRoot: Root | null = null; // Declare reactRoot
  _selected: boolean;
  _lastRenderedProps: NodeViewProps | null;
  constructor(
    node: Node,
    editorView: EditorFocused,
    getPos: () => number,
    decorations: Array<Decoration>
  ) {
    this.props = {
      decorations,
      editorView,
      getPos,
      node,
      dom: undefined,
      selected: false,
      focused: false,
    };
    // The editor will use this as the node's DOM representation
    const dom = this.createDOMElement();
    this.dom = dom;
    dom.onclick = this._onClick;
    this.props.dom = dom;

    this.reactRoot = null; // To store the root instance
    this._lastRenderedProps = null;
    pendingViews.add(this);
    if (pendingViews.size === 1) {
      // Observe the editorview's dom insteadof root document so that
      // if multiple instances of editor in a page shouldn't cross-talk
      mutationObserver.observe(/*document*/ editorView.dom, {
        childList: true,
        subtree: true,
      });
      selectionObserver.observe(/*document*/ editorView.dom);
    }
  }

  update(node: Node, _decorations: Array<Decoration>): boolean {
    const oldNode = this.props.node;
    this.props = {
      ...this.props,
      node,
    };
    // Only re-render if the node actually changed
    if (this._shouldUpdate(oldNode, node)) {
      this.__renderReactComponent();
    }
    return true;
  }
  _shouldUpdate(oldNode, newNode) {
    // Check if node attributes changed (this is a shallow comparison)
    // For deep comparison, you might need to compare individual attributes
    const oldAttrs = oldNode?.attrs;
    const newAttrs = newNode?.attrs;
    if (oldAttrs !== newAttrs) {
      // Check if any attribute actually changed
      const oldKeys = Object.keys(oldAttrs);
      const newKeys = Object.keys(newAttrs);
      if (oldKeys?.length !== newKeys?.length) {
        return true;
      }
      for (const key of oldKeys) {
        if (oldAttrs[key] !== newAttrs[key]) {
          return true;
        }
      }
    }
    // Check if it's a different node entirely
    if (!oldNode?.eq?.(newNode)) {
      return true;
    }
    return false;
  }

  stopEvent(): boolean {
    return false;
  }

  // Mark this node as being the selected node.
  selectNode(): void {
    const wasSelected = this._selected;
    this._selected = true;
    this.dom.classList.add(SELECTED_NODE_CLASS_NAME);
    // Only re-render if selection state changed
    if (!wasSelected) {
      this.__renderReactComponent();
    }
  }

  // Remove selected node marking from this node.
  deselectNode(): void {
    const wasSelected = this._selected;
    this._selected = false;
    this.dom.classList.remove(SELECTED_NODE_CLASS_NAME);
    // Only re-render if selection state changed
    if (wasSelected) {
      this.__renderReactComponent();
    }
  }

  // This should be overwrite by subclass.
  createDOMElement(): HTMLElement {
    // The editor will use this as the node's DOM representation.
    // return document.createElement('span');
    throw new Error('not implemented');
  }

  // This should be overwrite by subclass.
  renderReactComponent(): React.ReactElement {
    throw new Error('not implemented');
  }

  destroy(): void {
    // Called when the node view is removed from the editor or the whole
    // editor is destroyed.
    // sub-class may override this method.
    // When destroying the node view, remove from the set.
    // FIX: This solves the image missing issue.
    pendingViews.delete(this);
    mountedViews.delete(this);
    this.cleanup();
  }

  cleanup() {
    if (this.reactRoot) {
      this.reactRoot.unmount(); // Properly unmount the React root
      this.reactRoot = null;
    }
    this._lastRenderedProps = null;
  }

  __renderReactComponent(): void {
    const {editorView, getPos} = this.props;
    let selected = false;
    let focused = false;
    if (editorView?.state?.selection) {
      const {from} = editorView.state.selection;
      const pos = getPos();
      selected = this._selected;
      // logic: if the node is selected, it's focused (if the editor has focus).
      // pos === from is strict check for cursor position, but for NodeSelection
      // the node itself is the selection.
      focused = editorView.focused && (selected || pos === from);
    }
    // Only re-render if props actually changed
    const propsChanged =
      this._lastRenderedProps?.selected !== selected ||
      this._lastRenderedProps?.focused !== focused ||
      !this._lastRenderedProps?.node?.eq?.(this.props.node);
    if (!propsChanged) {
      return; // Skip render if nothing changed
    }
    // Update the props with new selection/focus state
    this.props.selected = selected;
    this.props.focused = focused;
    // Initialize React root if needed
    if (!this.reactRoot) {
      this.reactRoot = createRoot(this.dom);
    }
    // Render the React component
    this.reactRoot.render(this.renderReactComponent());
    // Store the props we just rendered for comparison next time
    this._lastRenderedProps = {
      ...this.props,
      selected,
      focused,
    };
  }
}
