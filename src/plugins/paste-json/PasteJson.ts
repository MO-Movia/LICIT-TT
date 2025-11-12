import {Fragment, Schema, Slice} from 'prosemirror-model';
import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
export class PasteJSONPlugin extends Plugin {
  schema!: Schema;
  slice?: Slice;
  constructor() {
    super({
      key: new PluginKey('pasteJSON'),
      props: {
        transformPastedText(text: string): string {
          try {
            const json = JSON.parse(text);

            if (json) {
              (this as PasteJSONPlugin).slice = (
                this as PasteJSONPlugin
              ).getSlice(json);
            }
          } catch {
            /* ignore */
          }
          return text;
        },
        transformPasted(slice: Slice) {
          const lastSlice = (this as PasteJSONPlugin).slice;
          if (0 < slice.content.childCount && lastSlice) {
            slice = lastSlice;
          }
          // reset
          (this as PasteJSONPlugin).slice = undefined;
          return slice;
        },
      },
      appendTransaction(
        _transactions: readonly Transaction[],
        _oldState: EditorState,
        newState: EditorState
      ) {
        (this as PasteJSONPlugin).schema = newState.schema;
        return undefined;
      },
    });
  }

  getSlice(json: {[key: string]: unknown}): Slice {
    return new Slice(Fragment.from(this.schema.nodeFromJSON(json)), 0, 0);
  }

  // Plugin method that supplies plugin schema to editor
  getEffectiveSchema(schema: Schema): Schema {
    return schema;
  }

  insert(json: {[key: string]: unknown}, view: EditorView): void {
    const {from} = view.state.selection;
    const jsonEx = {...json};
    if ('fragment' === json.type) {
      jsonEx.type = 'reference';
    }
    let tr = view.state.tr.insert(from, this.schema.nodeFromJSON(jsonEx));
    const selection = TextSelection.create(tr.doc, from + 5, from + 5);

    tr = tr.setSelection(selection);
    tr = this.insertParagraph(view.state, tr);
    view.dispatch(tr.scrollIntoView());
  }

  // Add empty line after reference
  // To make easier to enter a line after reference
  insertParagraph(state: EditorState, tr: Transaction) {
    const paragraph = state.schema.nodes['paragraph'];
    const textNode = state.schema.text(' ');
    const {from, to} = tr.selection;
    if (from !== to) {
      return tr;
    }
    const paragraphNode = paragraph.create({}, textNode);
    tr = tr.insert(
      from + tr.selection.$head.node(1).nodeSize - 4,
      Fragment.from(paragraphNode)
    );
    return tr;
  }
}
