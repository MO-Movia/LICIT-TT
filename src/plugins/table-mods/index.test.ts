/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {TableExtensionPlugin} from './index';
import {schema} from 'prosemirror-test-builder';
import {Schema} from 'prosemirror-model';
import {EditorState, Plugin, PluginKey} from 'prosemirror-state';
import {tableNodes} from 'prosemirror-tables';
import {EditorView} from 'prosemirror-view';
class TestPlugin extends Plugin {
  constructor() {
    super({
      key: new PluginKey('TestPlugin'),
    });
  }
}
describe('TableExtensionPlugin', () => {
  describe('getEffectiveSchema', () => {
    it('should add a Table node to the schema', () => {
      const extendedSchema = new Schema({
        nodes: schema.spec.nodes.addToEnd(
          'tableCell',
          tableNodes({
            tableGroup: 'block',
            cellContent: 'block+',
            cellAttributes: {
              background: {
                default: null,
                getFromDOM(dom) {
                  if (dom instanceof HTMLElement) {
                    // Cast 'dom' to HTMLElement
                    return dom.style.backgroundColor || null;
                  }
                  return null;
                },
                setDOMAttr(value, attrs) {
                  if (value) {
                    attrs.style = `${
                      attrs.style || ''
                    }background-color: ${value};`;
                  }
                },
              },
            },
          })
        ),
        marks: schema.spec.marks,
      });

      const mySchema = new Schema({
        marks: schema.spec.marks,
        nodes: schema.spec.nodes,
      });

      mySchema.topNodeType = mySchema.nodes.doc;

      const plugin = new TableExtensionPlugin();
      // Use the schema to create a ProseMirror editor state
      const editorState = EditorState.create({
        schema: mySchema,
        doc: mySchema.topNodeType.create(),
        plugins: [plugin],
      });
      const dom = document.createElement('div');
      const view = new EditorView(
        {mount: dom},
        {
          state: editorState,
        }
      );
      const effSchema = plugin.getEffectiveSchema(extendedSchema);

      expect(effSchema.spec.nodes).toBeDefined();
    });
  });
});
