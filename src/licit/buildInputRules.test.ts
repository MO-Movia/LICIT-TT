/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { NodeSpec, Schema } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import buildInputRules, { orderedListRule } from './buildInputRules';
import { EditorView } from 'prosemirror-view';

describe('buildInputRules()', () => {
  let schema;
  let inputRulePlugin;

  function createSchema(includeOrderedList = true) {
    const nodes: Record<string, NodeSpec> = {
      doc: {content: 'block+'},
      paragraph: {
        group: 'block',
        content: 'text*',
        toDOM: () => ['p', 0],
        parseDOM: [{tag: 'p'}],
      },
      text: { inline: true },
    };

    if (includeOrderedList) {
      nodes.ordered_list = {
        content: 'list_item+',
        group: 'block',
        attrs: {order: {default: 1}},
        parseDOM: [
          {
            tag: 'ol',
            getAttrs: (dom) => ({order: dom.getAttribute('start') || 1}),
          },
        ],
        toDOM: (node) => ['ol', {start: node.attrs.order}, 0],
      };
      nodes.list_item = { content: 'paragraph*', toDOM: () => ['li', 0] };
    }

    return new Schema({
      nodes,
    });
  }

  beforeEach(() => {
    schema = createSchema();

    inputRulePlugin = buildInputRules(schema);
  });

  it('should convert "1. " into an ordered_list using orderedListRule', () => {
    // Create initial document with a paragraph to ensure we have text positions
    const doc = schema.topNodeType.createAndFill(null, [
      schema.nodes.paragraph.createAndFill(),
    ])!;

    const state = EditorState.create({
      doc,
      schema,
      plugins: [inputRulePlugin],
    });

    // Create an EditorView mock
    const dispatch = jest.fn();
    const mockView = {
      state,
      dispatch,
    } as unknown as EditorView;

    // Set the correct position for the insertion: from 1, and inserting "1. "
    const from = 1;
    const text = '1. ';
    const to = from;

    // Get the input rule and bind it to the plugin instance
    const rule = inputRulePlugin.spec.props!.handleTextInput!.bind(inputRulePlugin);

    // Apply the rule to simulate text insertion
    const applied = rule(mockView, from, to, text);

    // After applying the rule, the dispatched transaction should wrap the paragraph.
    const newState = applied ? state.apply(dispatch.mock.calls[0][0]) : state;
    const firstNode = newState.doc.firstChild;

    expect(firstNode?.type.name).toBe('ordered_list');

  });

  it('should build input rules without an ordered list rule when the schema has no ordered_list node', () => {
    const schemaWithoutOrderedList = createSchema(false);
    const plugin = buildInputRules(schemaWithoutOrderedList);
    const doc = schemaWithoutOrderedList.topNodeType.createAndFill(null, [
      schemaWithoutOrderedList.nodes.paragraph.createAndFill(),
    ]);
    const state = EditorState.create({
      doc,
      schema: schemaWithoutOrderedList,
      plugins: [plugin],
    });
    const mockView = {
      state,
      dispatch: jest.fn(),
    } as unknown as EditorView;
    const rule = plugin.spec.props.handleTextInput.bind(plugin);

    const applied = rule(mockView, 1, 4, '1. ');

    expect(applied).toBe(false);
    expect(mockView.dispatch).not.toHaveBeenCalled();
  });

  it('should only join an ordered list when the previous list order continues the typed number', () => {
    const rule = orderedListRule(schema.nodes.ordered_list) as unknown as {
      handler: (
        state: EditorState,
        match: RegExpMatchArray,
        start: number,
        end: number
      ) => Transaction | null;
    };
    const continuedList = schema.nodes.ordered_list.create(
      {order: 1},
      schema.nodes.list_item.create(null, schema.nodes.paragraph.create())
    );
    const paragraph = schema.nodes.paragraph.create(null, schema.text('2. '));
    const state = EditorState.create({
      doc: schema.topNodeType.create(null, [continuedList, paragraph]),
      schema,
    });

    const transaction = rule.handler(state, ['2. ', '2'] as unknown as RegExpMatchArray, 7, 10);

    expect(transaction?.doc.childCount).toBe(1);
    expect(transaction?.doc.firstChild?.type.name).toBe('ordered_list');
    expect(transaction?.doc.firstChild?.childCount).toBe(2);
  });
});
