/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import { CapcoView } from './capcoView';
import { CapcoPlugin } from './index';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Node, Schema } from 'prosemirror-model';
import { builders } from 'prosemirror-test-builder';
import { effectiveSchema, CAPCOMODE } from './editorSchema';

describe('Glossary Plugin Extended', () => {
  const mySchema = new Schema({
    nodes: {
      doc: { content: 'block+' },

      text: {
        group: 'inline',
      },

      paragraph: {
        group: 'block',
        content: 'inline*',
        parseDOM: [{ tag: 'p' }],
        toDOM() {
          return ['p', 0];
        },
      },

      heading: {
        group: 'block',
        content: 'inline*',
        attrs: { level: { default: 1 } },
        defining: true,
        parseDOM: [
          { tag: 'h1', attrs: { level: 1 } },
          { tag: 'h2', attrs: { level: 2 } },
          { tag: 'h3', attrs: { level: 3 } },
        ],
        toDOM(node) {
          return ['h' + node.attrs.level, 0];
        },
      },

      table: {
        group: 'block',
        content: 'table_row+',
        tableRole: 'table',
        isolating: true,
        parseDOM: [{ tag: 'table' }],
        toDOM() {
          return ['table', ['tbody', 0]];
        },
      },

      table_row: {
        content: 'table_cell+',
        tableRole: 'row',
        parseDOM: [{ tag: 'tr' }],
        toDOM() {
          return ['tr', 0];
        },
      },

      table_cell: {
        content: 'block+',
        attrs: {
          colspan: { default: 1 },
          rowspan: { default: 1 },
          colwidth: { default: null },
        },
        tableRole: 'cell',
        isolating: true,
        parseDOM: [{ tag: 'td' }],
        toDOM() {
          return ['td', 0];
        },
      },

      enhanced_table_figure: {
        group: 'block',
        atom: true,
        selectable: true,
        attrs: {
          isValidate: { default: false },
        },
        parseDOM: [
          {
            tag: 'enhanced-table-figure',
            getAttrs(dom) {
              return {
                isValidate: dom.getAttribute('data-validate') === 'true',
              };
            },
          },
        ],
        toDOM(node) {
          return [
            'enhanced-table-figure',
            { 'data-validate': node.attrs.isValidate },
          ];
        },
      },
    },

    marks: {},
  });
  const plugin = new CapcoPlugin(1, 'TBD', {
    capcoService: {
      openManagementDialog: () => Promise.resolve(null),
      saveCapco: () => Promise.resolve(true),
      getCapco: () => Promise.resolve([]),
    },
  });
  const effSchema = plugin.getEffectiveSchema(mySchema);

  const { doc, p } = builders(mySchema, { p: { nodeType: 'paragraph' } });
  let gView: CapcoView;
  beforeEach(() => {
    const state = EditorState.create({
      doc: doc(p('foo')),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    gView = new CapcoView(view.state.doc.nodeAt(0) as unknown as Node, view);
  });

  it('should require toDom defined', () => {
    expect(gView.ignoreMutation()).toBeTruthy();
  });

  it('should ignore mutations', () => {
    expect(
      () =>
        new CapcoView(null as unknown as Node, null as unknown as EditorView)
    ).toThrow();
  });

  it('update should return true', () => {
    const state = EditorState.create({
      doc: doc(p('foo')),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const gView = new CapcoView(
      view.state.doc.nodeAt(0) as unknown as Node,
      view
    );

    gView['node'].sameMarkup(gView['node']);
    expect(gView.update(gView['node'])).toBe(true);
  });

  it('should return false when node markup is the same', () => {
    const state = EditorState.create({
      doc: doc(p('foo')),
      schema: effSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    gView = new CapcoView(view.state.doc.nodeAt(0) as unknown as Node, view);
    const node = view.state.doc.nodeAt(1) as unknown as Node;
    expect(gView.update(node)).toBe(false);
  });

  it('stopEvent should return false', () => {
    expect(gView.stopEvent(null as unknown as Event)).toBe(false);
  });

  it('adds CAPCOMODEKEY to doc node attrs', () => {
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
          attrs: {
            capcoMode: { default: CAPCOMODE.FORCED },
          },
        },
        paragraph: { group: 'block', content: 'text*' },
        text: {},
      },
    });

    const eff = effectiveSchema(schema);

    expect(eff.nodes.doc.spec.attrs?.capcoMode).toBeDefined();
  });

  it('does not mutate schema when spec is missing', () => {
    const schemaWithoutSpec = {} as Schema;
    effectiveSchema(schemaWithoutSpec);
    expect((schemaWithoutSpec).nodes).toBeUndefined();
  });
});
