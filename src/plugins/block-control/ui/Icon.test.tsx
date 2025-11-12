import { EditorState } from 'prosemirror-state';
import { builders } from 'prosemirror-test-builder';
import { schema } from 'jest-prosemirror';
import { EnhancedTableFigure } from '../index';
import { Icon } from './Icon';

describe('initialize icon', () => {
  const plugin = new EnhancedTableFigure();
  const effSchema = plugin.getEffectiveSchema(schema);
  const { doc, p } = builders(effSchema, { p: { nodeType: 'paragraph' } });

  const state = EditorState.create({
    doc: doc(p('Hello World!!')),
    schema: schema,
  });
  state.plugins.concat([plugin]);

  const props = { type: 'type', title: 'title' };
  const icon = new Icon(props);
  it('should handle Icon ', () => {
    expect(icon).toBeDefined();
  });

  it('should handle Icon ', () => {
    expect(icon.render()).toBeDefined();
  });

  test.each(['superscript', 'subscript', undefined])(
    'should handle Icon type',
    (type) => {
      const props = { type, title: 'title' };
      const icon = new Icon(props);
      expect(icon.render()).toBeDefined();
    }
  );
});
