/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node as ProseMirrorNode, Schema} from 'prosemirror-model';
import {EditorState, TextSelection} from 'prosemirror-state';
import TableCellStyleInheritancePlugin from './tableCellStyleInheritancePlugin';

const tableCellAttrs = {
  fontName: {default: null},
  fontNameOverridden: {default: null},
  fontSize: {default: null},
  fontSizeOverridden: {default: null},
  textColor: {default: null},
  textColorOverridden: {default: null},
  letterSpacing: {default: null},
  letterSpacingOverridden: {default: null},
  lineHeight: {default: null},
  lineHeightOverridden: {default: null},
  textAlign: {default: null},
  textAlignOverridden: {default: null},
};

const schema = new Schema({
  nodes: {
    doc: {content: 'block+'},
    text: {group: 'inline'},
    paragraph: {
      attrs: {
        align: {default: null},
        lineSpacing: {default: null},
        overriddenAlign: {default: null},
        overriddenAlignValue: {default: null},
        overriddenLineSpacing: {default: null},
        overriddenLineSpacingValue: {default: null},
      },
      content: 'inline*',
      group: 'block',
    },
    table: {
      content: 'table_row+',
      group: 'block',
      tableRole: 'table',
    },
    table_row: {
      content: '(table_cell | table_header)+',
      tableRole: 'row',
    },
    table_cell: {
      attrs: tableCellAttrs,
      content: 'paragraph+',
      tableRole: 'cell',
    },
    table_header: {
      attrs: tableCellAttrs,
      content: 'paragraph+',
      tableRole: 'header_cell',
    },
  },
  marks: {
    'mark-font-size': {
      attrs: {
        pt: {default: null},
        overridden: {default: false},
      },
      toDOM: (mark) => [
        'span',
        {
          style: `font-size: ${mark.attrs.pt}pt`,
          overridden: mark.attrs.overridden,
        },
        0,
      ],
    },
    'mark-font-type': {
      attrs: {
        name: {default: null},
        overridden: {default: false},
      },
      toDOM: (mark) => [
        'span',
        {
          style: `font-family: ${mark.attrs.name}`,
          overridden: mark.attrs.overridden,
        },
        0,
      ],
    },
    'mark-text-color': {
      attrs: {
        color: {default: null},
        overridden: {default: false},
      },
      toDOM: (mark) => [
        'span',
        {
          style: `color: ${mark.attrs.color}`,
          overridden: mark.attrs.overridden,
        },
        0,
      ],
    },
    'mark-letter-spacing': {
      attrs: {
        letterSpacing: {default: null},
        overridden: {default: false},
      },
      toDOM: (mark) => [
        'span',
        {
          style: `letter-spacing: ${mark.attrs.letterSpacing}`,
          overridden: mark.attrs.overridden,
        },
        0,
      ],
    },
  },
});

function createDoc(): ProseMirrorNode {
  const paragraph = schema.nodes.paragraph.create(null, schema.text('a'));
  const cell = schema.nodes.table_cell.create(
    {
      fontName: 'Verdana',
      fontNameOverridden: true,
      fontSize: '15px',
      fontSizeOverridden: true,
      textColor: '#123456',
      textColorOverridden: true,
      letterSpacing: '1px',
      letterSpacingOverridden: true,
      lineHeight: '1.5',
      lineHeightOverridden: true,
      textAlign: 'center',
      textAlignOverridden: true,
    },
    [paragraph]
  );
  const row = schema.nodes.table_row.create(null, [cell]);
  return schema.nodes.doc.create(null, [schema.nodes.table.create(null, [row])]);
}

function findFirstNode(
  doc: ProseMirrorNode,
  typeName: string
): ProseMirrorNode | null {
  let found: ProseMirrorNode | null = null;
  doc.descendants((node) => {
    if (node.type.name === typeName) {
      found = node;
      return false;
    }

    return true;
  });
  return found;
}

function findTextPos(doc: ProseMirrorNode, text: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (node.isText && node.text === text) {
      found = pos;
      return false;
    }

    return true;
  });
  return found;
}

describe('TableCellStyleInheritancePlugin', () => {
  it('adds missing table-cell typography to edited cell content', () => {
    const doc = createDoc();
    const state = EditorState.create({
      doc,
      schema,
      plugins: [new TableCellStyleInheritancePlugin()],
      selection: TextSelection.create(doc, findTextPos(doc, 'a') + 1),
    });

    const {state: nextState} = state.applyTransaction(state.tr.insertText('b'));
    const paragraph = findFirstNode(nextState.doc, 'paragraph');
    const text = nextState.doc.nodeAt(findTextPos(nextState.doc, 'ab'));
    const marks = text?.marks.map((mark) => ({
      type: mark.type.name,
      attrs: mark.attrs,
    }));

    expect(paragraph?.attrs).toMatchObject({
      align: 'center',
      overriddenAlign: true,
      overriddenAlignValue: 'center',
      lineSpacing: '1.5',
      overriddenLineSpacing: true,
      overriddenLineSpacingValue: '1.5',
    });
    expect(marks).toEqual(
      expect.arrayContaining([
        {type: 'mark-font-type', attrs: {name: 'Verdana', overridden: true}},
        {type: 'mark-font-size', attrs: {pt: 15, overridden: true}},
        {type: 'mark-text-color', attrs: {color: '#123456', overridden: true}},
        {
          type: 'mark-letter-spacing',
          attrs: {letterSpacing: '1px', overridden: true},
        },
      ])
    );
  });

  it('does not inherit font size from an unmarked cell font-size value', () => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text('x'));
    const cell = schema.nodes.table_cell.create(
      {
        fontName: 'Verdana',
        fontSize: '15px',
        textAlign: 'center',
      },
      [paragraph]
    );
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.table.create(null, [
        schema.nodes.table_row.create(null, [cell]),
      ]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      plugins: [new TableCellStyleInheritancePlugin()],
      selection: TextSelection.create(doc, findTextPos(doc, 'x') + 1),
    });

    const {state: nextState} = state.applyTransaction(state.tr.insertText('y'));
    const text = nextState.doc.nodeAt(findTextPos(nextState.doc, 'xy'));
    const markTypes = text?.marks.map((mark) => mark.type.name);

    expect(markTypes).not.toContain('mark-font-type');
    expect(markTypes).not.toContain('mark-font-size');
  });

  it('replaces conflicting marks with table-cell overrides', () => {
    const conflictingFontSize = schema.marks['mark-font-size'].create({
      pt: 10,
      overridden: true,
    });
    const conflictingFontType = schema.marks['mark-font-type'].create({
      name: 'Arial',
      overridden: true,
    });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('z', [conflictingFontSize, conflictingFontType]),
    ]);
    const cell = schema.nodes.table_cell.create(
      {
        fontName: 'Verdana',
        fontNameOverridden: true,
        fontSize: '15px',
        fontSizeOverridden: true,
      },
      [paragraph]
    );
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.table.create(null, [
        schema.nodes.table_row.create(null, [cell]),
      ]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      plugins: [new TableCellStyleInheritancePlugin()],
      selection: TextSelection.create(doc, findTextPos(doc, 'z') + 1),
    });

    const {state: nextState} = state.applyTransaction(state.tr.insertText('!'));
    const text = nextState.doc.nodeAt(findTextPos(nextState.doc, 'z!'));
    const marks = text?.marks.map((mark) => ({
      type: mark.type.name,
      attrs: mark.attrs,
    }));

    expect(marks).toEqual(
      expect.arrayContaining([
        {type: 'mark-font-type', attrs: {name: 'Verdana', overridden: true}},
        {type: 'mark-font-size', attrs: {pt: 15, overridden: true}},
      ])
    );
  });

  it('inherits table-header overrides', () => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text('h'));
    const headerCell = schema.nodes.table_header.create(
      {
        fontName: 'Georgia',
        fontNameOverridden: true,
        textAlign: 'right',
        textAlignOverridden: true,
      },
      [paragraph]
    );
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.table.create(null, [
        schema.nodes.table_row.create(null, [headerCell]),
      ]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      plugins: [new TableCellStyleInheritancePlugin()],
      selection: TextSelection.create(doc, findTextPos(doc, 'h') + 1),
    });

    const {state: nextState} = state.applyTransaction(state.tr.insertText('!'));
    const paragraphNode = findFirstNode(nextState.doc, 'paragraph');
    const text = nextState.doc.nodeAt(findTextPos(nextState.doc, 'h!'));
    const markTypes = text?.marks.map((mark) => mark.type.name);

    expect(paragraphNode?.attrs.align).toBe('right');
    expect(markTypes).toContain('mark-font-type');
  });
});
