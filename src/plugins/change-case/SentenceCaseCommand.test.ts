/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { SentanceCaseCommand } from './SentenceCaseCommand';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';

describe('SentanceCaseCommand', () => {

    const plugin = new SentanceCaseCommand();
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

    // Create a mock document with a paragraph containing non-uppercase text
    const mockdoc = Node.fromJSON(mySchema, {
        type: 'doc',
        content: [
            {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Hello, ProseMirror!' }],
            },
        ],
    });
    const state = { tr: { selection: { empty: true }, scrollIntoView: () => { }, replaceWith: () => { } }, doc: mockdoc, selection: { from: 0, to: 20 }, schema: mySchema } as unknown as EditorState;
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
    it('should handle execute and return true when prevnode is null', () => {
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

        // Mock document with multiple paragraphs
        const mockdoc = Node.fromJSON(mySchema, {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Hello, ProseMirror!' }],
                },
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'This should be transformed.' }],
                },
            ],
        });
        const state = { tr: { selection: { empty: true }, scrollIntoView: () => { }, replaceWith: () => { } }, doc: mockdoc, selection: { from: 30, to: 50 ,$anchor:{nodeBefore:{text:'text'}}}, schema: mySchema } as unknown as EditorState;

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

    it('should handle parseSelectedText', () => {
        expect(plugin.parseSelectedText('This is a text')).toBeDefined();
    });
    it('should handle parseSelectedText when text has .', () => {
        expect(plugin.parseSelectedText('What is a text? This is a text.')).toBeDefined();
    });
    it('should handle parseSelectedText when text has . (case 2)', () => {
        expect(plugin.parseSelectedText('What?? is?? a text? This??is a ??text.')).toBeDefined();
    });
    it('should handle checkDelimeter', () => {
        expect(plugin.checkDelimeter('This is a text?.')).toBeUndefined();
    });

});