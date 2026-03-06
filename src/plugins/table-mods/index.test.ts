/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {TableExtensionPlugin} from './index';
import {schema} from 'prosemirror-test-builder';
import { Schema } from 'prosemirror-model';
import {tableNodes} from 'prosemirror-tables';

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
      const effSchema = plugin.getEffectiveSchema(extendedSchema);

      expect(effSchema.spec.nodes).toBeDefined();
    });
  });
});
