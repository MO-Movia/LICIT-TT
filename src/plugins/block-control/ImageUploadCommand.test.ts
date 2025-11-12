import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { ImageUploadCommand } from './ImageUploadCommand';
import { ImageUploadEditor } from './ui/ImageUploadEditor';

describe('ImageUploadCommand', () => {
    const command = new ImageUploadCommand();

    const schema = new Schema({
        nodes: {
            doc: { content: 'paragraph' },
            paragraph: { content: 'text*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
            text: { group: 'inline' },
        },
    });

    const state = EditorState.create({
        doc: schema.node('doc', null, [schema.node('paragraph')]),
        schema,
    });

    const baseView = {
        state,
        runtime: {
            canUploadImage: jest.fn(() => true),
            uploadImage: jest.fn(),
        },
    } as unknown as EditorView;

    it('should return true when runtime allows image upload', () => {
        expect(command.isEnabled(state, baseView)).toBe(true);
    });

    it('should return false when view is null', () => {
        expect(command.isEnabled(state, null)).toBe(false);
    });

    it('should return false when runtime is missing', () => {
        const view = { state } as unknown as EditorView;
        expect(command.isEnabled(state, view)).toBe(false);
    });

    it('should return false when canUploadImage returns false', () => {
        const view = {
            state,
            runtime: {
                canUploadImage: () => false,
                uploadImage: jest.fn(),
            },
        } as unknown as EditorView;
        expect(command.isEnabled(state, view)).toBe(false);
    });

    it('should return ImageUploadEditor from getEditor()', () => {
        expect(command.getEditor()).toBe(ImageUploadEditor);
    });
});
