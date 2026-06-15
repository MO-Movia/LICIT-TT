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
    it('should detect single sentence delimiters', () => {
        expect(plugin.isSingleSentenceDelimiter('.')).toBeTruthy();
        expect(plugin.isSingleSentenceDelimiter('text')).toBeFalsy();
    });
    it('should split previous content by available delimiters', () => {
        expect(plugin.getDelimiterSeparatedChars('Alpha? Beta')).toStrictEqual([' Beta', 'Alpha']);
        expect(plugin.getDelimiterSeparatedChars('No delimiter')).toStrictEqual(['No delimiter']);
    });
    it('should detect when a new sentence starts', () => {
        expect(plugin.startsNewSentence(['', 'Alpha'], 'Alpha. ', ' Beta')).toBeTruthy();
        expect(plugin.startsNewSentence(['Alpha'], 'Alpha', 'Beta')).toBeFalsy();
    });
    it('should detect wrapped sentence endings', () => {
        expect(plugin.endsWithSentenceWrapper(['"])'])).toBeTruthy();
        expect(plugin.endsWithSentenceWrapper(['a)'])).toBeFalsy();
    });
    it('should process previous content for empty, delimiter, and wrapped values', () => {
        expect(plugin.processPreviousContent('', 'text')).toBeFalsy();
        expect(plugin.processPreviousContent('!', 'text')).toBeTruthy();
        expect(plugin.processPreviousContent('Alpha.")]', 'next')).toBeTruthy();
        expect(plugin.processPreviousContent('Alpha?Beta', 'next')).toBeFalsy();
    });
    it('should resolve sentence case text from paragraph start and previous content', () => {
        expect(plugin.getSentenceCaseText('hello world', 'hello world', null, null)).toBe('Hello world');
        expect(plugin.getSentenceCaseText('next sentence', 'prefix next sentence', '.', null)).toBe('Next sentence');
        expect(plugin.getSentenceCaseText('follow up', 'prefix follow up', null, '!')
        ).toBe('Follow up');
    });
    it('should expose text node selection helpers', () => {
        const textNode = mySchema.text('Hello');
        const nonTextNode = mySchema.nodes.paragraph.create(null, textNode);
        expect(plugin.isSelectedTextNode(textNode, 5, 5, 7)).toBeTruthy();
        expect(plugin.isSelectedTextNode(nonTextNode, 5, 5, 7)).toBeFalsy();
        expect(plugin.getSelectedTextRange(textNode, 5, 6, 9)).toStrictEqual({
            start: 6,
            end: 9,
            text: 'ell',
        });
    });
    it('should choose between previous-node parsing and capitalization', () => {
        expect(plugin.checkPreviousNode('.', 'hello there')).toBe('Hello there');
        expect(plugin.checkPreviousNode('plain text', 'HELLO there')).toBe('HELLO there');
    });

});
