/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';

import ListPasteNormalizerPlugin from './listPasteNormalizerPlugin';

describe('ListPasteNormalizerPlugin', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'text*', group: 'block' },
      ordered_list: {
        attrs: {
          counterReset: { default: null },
          following: { default: null },
          indent: { default: 0 },
          start: { default: 1 },
          type: { default: 'decimal' },
        },
        content: 'list_item+',
        group: 'block',
      },
      bullet_list: {
        attrs: { indent: { default: 0 } },
        content: 'list_item+',
        group: 'block',
      },
      list_item: {
        attrs: { align: { default: null } },
        content: 'paragraph block*',
        group: 'block',
      },
      text: { group: 'inline' },
    },
  });

  const paragraph = (text: string) =>
    schema.node('paragraph', null, [schema.text(text)]);
  const listItem = (text: string) =>
    schema.node('list_item', null, [paragraph(text)]);
  const listItemWithParagraphs = (text: string[]) =>
    schema.node(
      'list_item',
      null,
      text.map((value) => paragraph(value))
    );
  const orderedList = (text: string | string[], start = 1) => {
    const items = Array.isArray(text) ? text : [text];
    return schema.node(
      'ordered_list',
      { indent: 0, start, type: 'decimal' },
      items.map(listItem)
    );
  };

  it('joins repeated ordered lists created by external paragraph paste', () => {
    const oldState = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        orderedList(['(TBD) A', '(TBD) B', '(TBD) C']),
      ]),
    });
    const newState = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        orderedList(['(TBD) A', '(TBD) B', '(TBD) C']),
        orderedList('(TBD) pasted para1', 4),
        orderedList('(TBD) pasted para2', 4),
        orderedList('(TBD) pasted para3', 4),
      ]),
    });
    const pasteTransaction = oldState.tr
      .insert(oldState.doc.content.size, orderedList('(TBD) pasted para1', 4))
      .setMeta('paste', true);
    const plugin = new ListPasteNormalizerPlugin();

    const tr = plugin.spec.appendTransaction?.(
      [pasteTransaction],
      oldState,
      newState
    );
    const listNode = tr.doc.firstChild;

    expect(tr.docChanged).toBe(true);
    expect(tr.doc.childCount).toBe(1);
    expect(listNode?.type.name).toBe('ordered_list');
    expect(listNode?.childCount).toBe(6);
    expect(listNode?.child(3).textContent).toBe('(TBD) pasted para1');
    expect(listNode?.child(5).textContent).toBe('(TBD) pasted para3');
  });

  it('splits pasted paragraphs that were inserted inside one list item', () => {
    const oldState = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        orderedList(['(TBD) A', '(TBD) B']),
      ]),
    });
    const pastedListItem = listItemWithParagraphs([
      '(TBD) pasted para1',
      '(TBD) pasted para2',
      '(TBD) pasted para3',
    ]);
    const pasteTransaction = oldState.tr
      .insert(oldState.doc.firstChild.nodeSize - 1, pastedListItem)
      .setMeta('paste', true);
    const newState = oldState.apply(pasteTransaction);
    const plugin = new ListPasteNormalizerPlugin();

    const tr = plugin.spec.appendTransaction?.(
      [pasteTransaction],
      oldState,
      newState
    );
    const listNode = tr.doc.firstChild;

    expect(tr.docChanged).toBe(true);
    expect(tr.doc.childCount).toBe(1);
    expect(listNode?.type.name).toBe('ordered_list');
    expect(listNode?.childCount).toBe(5);
    expect(listNode?.child(2).textContent).toBe('(TBD) pasted para1');
    expect(listNode?.child(3).textContent).toBe('(TBD) pasted para2');
    expect(listNode?.child(4).textContent).toBe('(TBD) pasted para3');
  });

  it('does not run for non-paste transactions', () => {
    const state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        orderedList('(TBD) A'),
        orderedList('(TBD) B'),
      ]),
    });
    const plugin = new ListPasteNormalizerPlugin();

    const tr = plugin.spec.appendTransaction?.([state.tr], state, state);

    expect(tr).toBeNull();
  });
});
