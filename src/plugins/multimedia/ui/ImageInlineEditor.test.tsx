import {ImageInlineEditor, ImageInlineEditorValue} from './ImageInlineEditor';
import {EditorState} from 'prosemirror-state';
import {schema} from 'prosemirror-test-builder';
import {MultimediaPlugin} from '../index';
import {createEditor, doc, p} from 'jest-prosemirror';
import {EditorView} from 'prosemirror-view';
import '@testing-library/jest-dom';

describe('ImageInlineEditor', () => {
  const plugin = new MultimediaPlugin();
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [plugin],
  });
  const state: EditorState = EditorState.create({
    schema: schema,
    selection: editor.selection,
    plugins: [new MultimediaPlugin()],
  });
  const view1 = new EditorView(document.querySelector('#editor'), {
    state,
  });

  it('should render', () => {
    const imageinlineeditor = new ImageInlineEditor(() => undefined);
    expect(imageinlineeditor).toBeDefined();
  });
  it('should render', () => {
    const imageinlineeditor = new ImageInlineEditor(() => undefined);
    imageinlineeditor.props = {
      onSelect: () => undefined,
      value: {
        align: '',
        src: 'test',
      },
      editorView: view1,
    };

    expect(imageinlineeditor.render()).toBeDefined();
  });

  it('should handle parseLabel when input ""', () => {
    const imageinlineeditor = new ImageInlineEditor(() => undefined);
    expect(imageinlineeditor.parseLabel('')).toStrictEqual({
      icon: null,
      title: null,
    });
  });

  it('should handle empty input', () => {
    const imageinlineeditor = new ImageInlineEditor(() => undefined);
    const input = '';
    const result = imageinlineeditor.parseLabel(input);

    expect(result.title).toBeNull();
    expect(result.icon).toBeNull();
  });

  it('should handle _onClick ', () => {
    const imageinlineeditor = new ImageInlineEditor(() => undefined);
    imageinlineeditor.props = {
      onSelect: (val) => val.align,
      value: {
        align: '',
        src: 'test',
      },
      editorView: view1,
    };
    const spy = jest.spyOn(imageinlineeditor.props, 'onSelect');
    imageinlineeditor._onClick('align_test');
    imageinlineeditor._onRemove(view1);
    imageinlineeditor._onCrop(view1);
    expect(spy).lastReturnedWith('align_test');
  });
  it('should handle prepButtons ', () => {
    const imageinlineeditor = new ImageInlineEditor(() => undefined);
    imageinlineeditor.props = {
      onSelect: (val) => val.align,
      value: null as unknown as ImageInlineEditorValue,
      editorView: view1,
    };
    //const spy = jest.spyOn(imageinlineeditor.props, 'onSelect');

    expect(imageinlineeditor.prepButtons('align_test')).toBeDefined();
  });
});
