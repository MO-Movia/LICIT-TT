import {EditorState} from 'prosemirror-state';
import {builders} from 'prosemirror-test-builder';
import {schema} from 'jest-prosemirror';
import {MultimediaPlugin} from '../index';
import {Icon} from './Icon';

jest.mock('../../src/assets/images/dark/Icon_Multi-media.svg', () => 'Icon SVG content');
jest.mock('../../src/assets/images/light/Icon_Multi-media.svg', () => 'Icon SVG content');
describe('initialize icon', () => {
  const plugin = new MultimediaPlugin();
  const effSchema = plugin.getEffectiveSchema(schema);
  const {doc, p} = builders(effSchema, {p: {nodeType: 'paragraph'}});

  const state = EditorState.create({
    doc: doc(p('Hello World!!')),
    schema: schema,
  });
  state.plugins.concat([plugin]);

  const props = {type: 'type', title: 'title'};
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
      const props = {type, title: 'title'};
      const icon = new Icon(props);
      expect(icon.render()).toBeDefined();
    }
  );
});
