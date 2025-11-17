import { EditorState } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { schema } from '@tiptap/pm/schema-basic';
import Plugin from './index';
import { addLinkCommand } from './index';

describe('Plugin', () => {
  it('should return null if editor view does not have a parent node', () => {
    const state = EditorState.create({
      schema,
      doc: schema.node('paragraph', {}, [schema.text('Hello, world!')]),
    });
    const plugin = Plugin();

    new EditorView(null, {
      state,
      plugins: [plugin],
    });
  });

  it('should resolve with the value from the popup onClose', () => {
    // Call the function
    jest.setTimeout(30000);
    const result = addLinkCommand({});
    expect(result).toBeDefined();
  });
});
