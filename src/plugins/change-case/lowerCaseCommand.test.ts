/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { LowerCaseCommand } from './LowerCaseCommand';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';

describe('LowerCaseCommand', () => {

    const plugin = new LowerCaseCommand();
    const mySchema = new Schema({
        nodes: {
            // Define the document node
            doc: {
                content: 'block+',
            },
            // Define the paragraph node
            paragraph: {
                content: 'text*',
                group: 'block',
                parseDOM: [{ tag: 'p' }],
                toDOM() {
                    return ['p', 0];
                },
            },
            // Define the text node
            text: {
                group: 'inline',
            },
        },
        marks: {
            // Define a simple mark, for example bold
            bold: {
                parseDOM: [{ tag: 'strong' }],
                toDOM() {
                    return ['strong'];
                },
            },
        },
    });

    // Create a mock document with a paragraph containing mixed-case text
    const mockdoc = Node.fromJSON(mySchema, {
        type: 'doc',
        content: [
            {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Hello, ProseMirror! THIS should be lowercase.' }],
            },
        ],
    });
    const state = { tr: { selection: { empty: true }, scrollIntoView: () => { }, replaceWith: () => { } }, doc: mockdoc, selection: { from: 0, to: 40 }, schema: mySchema } as unknown as EditorState;

    it('should be defined', () => {
        expect(plugin).toBeDefined();
    });
    it('should handle isEnabledcall and call _isEnabled and return boolean', () => {
        const state = { tr: { selection: { empty: true } } } as unknown as EditorState;
        expect(plugin.isEnabled(state)).toBeFalsy();
    });
    it('should handle isEnabledcall and call _isEnabled and return boolean when tr.selection.empty is false', () => {
        const state = { tr: { selection: { empty: false } } } as unknown as EditorState;
        expect(plugin.isEnabled(state)).toBeTruthy();
    });
    it('should handle execute and return true', () => {

        expect(plugin.execute(state, () => { }, {} as unknown as EditorView)).toBeTruthy();
    });
    it('should handle renderLabel and return null', () => {
        expect(plugin.renderLabel()).toBeNull();
    });
    it('should handle isActive and return true', () => {
        expect(plugin.isActive()).toBeTruthy();
    });
    it('should handle waitForUserInput', () => {
        expect(plugin.waitForUserInput()).toBeDefined();
    });
    it('should handle executeWithUserInput', () => {
        expect(plugin.executeWithUserInput()).toBeTruthy();
    });
    it('should handle cancel and return null', () => {
        expect(plugin.cancel()).toBeNull();
    });
    it('should handle executeCustom and return tr', () => {
        expect(plugin.executeCustom(state, {} as unknown as Transform)).toStrictEqual({});
    });

});