import { Node } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

export interface HighlightDocProperties {
  liveUpdates?: boolean;
  highlightClass?: string;
  selectedHighlight?: string;
  individualHighlightClass?: string;
  matchWholeWordsOnly?: boolean;
  caseSensitive?: boolean;
}

const highlightPluginKey = new PluginKey<PluginState>(
  'LicitHighlightTextPlugin'
);

export interface PluginState extends HighlightDocProperties {
  decorations: DecorationSet;
  searchTerm?: string;
}

export class LicitHighlightTextPlugin extends Plugin<PluginState> {
  constructor(config: HighlightDocProperties = {}) {
    super({
      key: new PluginKey('LicitHighlightTextPlugin'),
      state: {
        init(): PluginState {
          return {
            highlightClass: 'highlight',
            liveUpdates: true,
            matchWholeWordsOnly: false,
            caseSensitive: false,
            ...config,
            decorations: DecorationSet.empty,
          };
        },
        apply(tr: Transaction, state: PluginState): PluginState {
          const searchMeta = tr.getMeta('search') as PluginState;
          if (searchMeta) {
            const newState = {
              ...state,
              searchTerm: searchMeta.searchTerm,
              highlightClass: searchMeta.highlightClass,
              selectedHighlight: searchMeta.selectedHighlight,
              individualHighlightClass: searchMeta.individualHighlightClass,
              matchWholeWordsOnly: searchMeta.matchWholeWordsOnly,
              caseSensitive: searchMeta.caseSensitive,
            };

            return {
              ...newState,
              decorations: LicitHighlightTextPlugin.findHighlights(
                tr.doc,
                newState.searchTerm,
                newState
              ),
            };
          }

          if (!tr.docChanged || !state.liveUpdates) {
            return {
              ...state,
              decorations: state.decorations.map(tr.mapping, tr.doc),
            };
          }

          if (state.searchTerm) {
            return {
              ...state,
              decorations: LicitHighlightTextPlugin.findHighlights(
                tr.doc,
                state.searchTerm,
                state
              ),
            };
          }

          return {
            ...state,
            decorations: state.decorations.map(tr.mapping, tr.doc),
          };
        },
      },
      props: {
        decorations(state) {
          return this.getState(state)?.decorations;
        },
      },
    });
  }

  static getChangedRanges(tr: Transaction) {
    const ranges: { from: number; to: number }[] = [];

    tr.steps?.forEach((_step, i) => {
      const map = tr.mapping.maps[i];
      map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
        let from = newStart;
        let to = newEnd;

        tr.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isTextblock) {
            from = pos;
            to = pos + node.nodeSize;
            return false;
          }
          return true;
        });

        ranges.push({
          from: Math.max(0, from),
          to: Math.min(tr.doc.content.size, to),
        });
      });
    });

    return ranges.reduce(
      (merged, current) => {
        const prev = merged[merged.length - 1];
        if (prev && current.from <= prev.to) {
          prev.to = Math.max(prev.to, current.to);
        } else {
          merged.push(current);
        }
        return merged;
      },
      [] as { from: number; to: number }[]
    );
  }

  private static createSearchRegex(
    searchTerm: string,
    matchWholeWordsOnly: boolean,
    caseSensitive = false
  ): RegExp {
    const escapedTerm = searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const flags = caseSensitive ? 'g' : 'gi';

    if (matchWholeWordsOnly) {
      return new RegExp(`\\b${escapedTerm}\\b`, flags);
    }
    return new RegExp(escapedTerm, flags);
  }

  static findHighlights(
    doc: Node,
    searchTerm: string | null | undefined,
    highlightDocProperties: HighlightDocProperties
  ) {
    if (!searchTerm) {
      return DecorationSet.empty;
    }

    return DecorationSet.create(
      doc,
      this.findHighlightsInRange(doc, searchTerm, highlightDocProperties, {
        from: 0,
        to: doc.content.size,
      })
    );
  }

  static findHighlightsInRange(
    doc: Node,
    searchTerm: string | null | undefined,
    highlightDocProperties: HighlightDocProperties,
    range: { from: number; to: number }
  ) {
    if (!searchTerm?.trim()) return [];
    const decorations: Decoration[] = [];
    const matchWholeWordsOnly =
      highlightDocProperties.matchWholeWordsOnly ?? false;
    const caseSensitive = highlightDocProperties.caseSensitive ?? false;
    const regex = this.createSearchRegex(
      searchTerm,
      matchWholeWordsOnly,
      caseSensitive
    );

    const { selectedParaPositions, selectedNodeSize } =
      this.getSelectedParagraphs(doc, highlightDocProperties, range);

    const textParts: {
      text: string;
      pos: number;
      nodeEnd: number;
      parentType: string;
    }[] = [];

    doc.nodesBetween(range.from, range.to, (node, pos) => {
      if (node.isText && node.text) {
        let parentType = 'unknown';
        let depth = 1;

        while (depth <= 3) {
          const parentNode = doc.resolve(pos).node(depth);
          if (
            parentNode &&
            (parentNode.type.name === 'listItem' ||
              parentNode.type.name === 'li')
          ) {
            parentType = parentNode.type.name;
            break;
          }
          depth++;
        }

        textParts.push({
          text: node.text,
          pos,
          nodeEnd: pos + node.nodeSize,
          parentType,
        });
      }
      return true;
    });

    const listItems = textParts.filter(
      (part) => part.parentType === 'listItem' || part.parentType === 'li'
    );
    const nonListItems = textParts.filter(
      (part) => part.parentType !== 'listItem' && part.parentType !== 'li'
    );

    nonListItems.forEach((part) => {
      this.processTextMatches(part.text, regex, part.pos, {
        range,
        selectedParaPositions,
        selectedNodeSize,
        highlightDocProperties,
        decorations,
      });
    });

    const listItemsByParent = new Map<
      string,
      { text: string; parts: typeof textParts }
    >();

    listItems.forEach((part) => {
      const parentKey = `${part.parentType}-${part.pos}`;
      if (!listItemsByParent.has(parentKey)) {
        listItemsByParent.set(parentKey, { text: '', parts: [] });
      }
      const item = listItemsByParent.get(parentKey)!;
      item.text += part.text;
      item.parts.push(part);
    });

    listItemsByParent.forEach((item) => {
      if (regex.test(item.text)) {
        item.parts.forEach((part) => {
          this.processTextMatches(part.text, regex, part.pos, {
            range,
            selectedParaPositions,
            selectedNodeSize,
            highlightDocProperties,
            decorations,
          });
        });
      }
    });

    return decorations;
  }

  private static getSelectedParagraphs(
    doc: Node,
    state: HighlightDocProperties,
    range: { from: number; to: number }
  ) {
    const selectedParaPositions = new Set<number>();
    let selectedNodeSize = 0;

    if (state.selectedHighlight) {
      doc.nodesBetween(range.from, range.to, (node, pos) => {
        if (node.attrs?.objectId === state.selectedHighlight) {
          selectedParaPositions.add(pos);
          selectedNodeSize = node.nodeSize;
        }
        return true;
      });
    }

    return { selectedParaPositions, selectedNodeSize };
  }

  private static processTextMatches(
    text: string,
    regex: RegExp,
    pos: number,
    context: {
      range: { from: number; to: number };
      selectedParaPositions: Set<number>;
      selectedNodeSize: number;
      highlightDocProperties: HighlightDocProperties;
      decorations: Decoration[];
    }
  ) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
        continue;
      }

      const from = pos + match.index;
      const to = from + match[0].length;

      if (match[0].includes('\n')) {
        continue;
      }

      if (from >= context.range.from && to <= context.range.to) {
        const isInSelectedPara = Array.from(context.selectedParaPositions).some(
          (paraPos) =>
            from >= paraPos && to <= paraPos + context.selectedNodeSize
        );

        const highlightClass =
          isInSelectedPara &&
          context.highlightDocProperties.individualHighlightClass
            ? context.highlightDocProperties.individualHighlightClass
            : (context.highlightDocProperties.highlightClass ?? '');

        context.decorations.push(
          Decoration.inline(from, to, { class: highlightClass })
        );
      }
    }
  }

  static updateSearchTerm(
    view: EditorView,
    searchTerm?: string,
    properties: HighlightDocProperties = {}
  ) {
    view.dispatch(
      view.state.tr.setMeta('search', {
        ...properties,
        searchTerm,
      })
    );
  }

  static toggleWholeWordMatching(
    view: EditorView,
    matchWholeWordsOnly: boolean
  ) {
    const { state } = view;
    const pluginState = this.getPluginState(state);

    if (pluginState?.searchTerm) {
      this.updateSearchTerm(view, pluginState.searchTerm, {
        ...pluginState,
        matchWholeWordsOnly,
      });
    }
  }

  static toggleCaseSensitive(view: EditorView, caseSensitive: boolean) {
    const { state } = view;
    const pluginState = this.getPluginState(state);

    if (pluginState?.searchTerm) {
      this.updateSearchTerm(view, pluginState.searchTerm, {
        ...pluginState,
        caseSensitive,
      });
    }
  }

  static refreshHighlights(view: EditorView) {
    const { state } = view;
    const pluginState = this.getPluginState(state);

    if (pluginState?.searchTerm) {
      this.updateSearchTerm(view, pluginState.searchTerm, pluginState);
    }
  }

  static getPluginState(state: EditorState): PluginState | undefined {
    return highlightPluginKey.get(state) as PluginState | undefined;
  }
}

export default LicitHighlightTextPlugin;
