import {DOMSerializer, Node} from 'prosemirror-model';
import {EditorView, NodeView} from 'prosemirror-view';
import {CacheInput, getGlossaryRuntime, GLOSSARY, IndexItem} from './types';
import tippy from 'tippy.js';

export const cache: Record<
  string,
  Promise<IndexItem | undefined | null> | undefined
> = {};
export function updateCache(values?: CacheInput): void {
  if (Array.isArray(values)) {
    for (const item of values) {
      cache[item.id] = Promise.resolve(item);
    }
  } else {
    values?.then((v) => updateCache(v)).catch(console.warn);
  }
}
export class GlossaryView implements NodeView {
  dom: globalThis.Node;
  contentDOM: HTMLElement;
  constructor(
    private node: Node,
    outerView: EditorView
  ) {
    if (!node?.type?.spec?.toDOM) {
      throw new Error('node "toDom" is not defined');
    }
    // We'll need these later
    const spec = DOMSerializer.renderSpec(
      outerView.dom.ownerDocument,
      node.type.spec.toDOM(this.node)
    );
    this.dom = spec.dom;
    this.contentDOM = spec.contentDOM!;
    this.contentDOM.contentEditable = 'false';
    this.contentDOM.className = GLOSSARY;
    this.updateTooltip(outerView);
  }

  private updateTooltip(view: EditorView): void {
    const id = this.node.attrs.id as string;
    cache[id] ??= getGlossaryRuntime(view)?.glossaryService?.fetchTerm?.(id);

    this.setTooltip(this.node.attrs as IndexItem);
    cache[id]?.then((term) => this.setTooltip(term)).catch(console.warn);
  }

  private setTooltip(term: IndexItem | undefined | null): void {
    tippy(this.contentDOM, {
      content: term?.definition,
    });
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
