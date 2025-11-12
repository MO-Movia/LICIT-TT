import { Schema, DOMParser, Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EnhancedTableCommands, addNotesCommand } from './EnhancedTableCommands';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { doc, p } from 'jest-prosemirror';

// Extend the basic schema with necessary nodes
const nodes = basicSchema.spec.nodes.append({
    enhanced_table_figure: {
        group: 'block',
        content: 'enhanced_table_figure_body enhanced_table_figure_notes? enhanced_table_figure_capco',
        attrs: { figureType: { default: 'table' }, orientation: { default: 'landscape' } },
        toDOM: () => ['div', 0],
        parseDOM: [{ tag: 'div' }],
    },
    enhanced_table_figure_body: {
        content: 'table',
        toDOM: () => ['div', 0],
        parseDOM: [{ tag: 'div' }],
    },
    enhanced_table_figure_notes: {
        content: 'text*',
        toDOM: () => ['div', 0],
        parseDOM: [{ tag: 'div' }],
    },
    enhanced_table_figure_capco: {
        content: 'text*',
        toDOM: () => ['div', 0],
        parseDOM: [{ tag: 'div' }],
    },
    table: {
        content: 'table_row+',
        tableRole: 'table',
        toDOM: () => ['table', 0],
        parseDOM: [{ tag: 'table' }],
    },
    table_row: {
        content: 'table_cell+',
        tableRole: 'row',
        toDOM: () => ['tr', 0],
        parseDOM: [{ tag: 'tr' }],
    },
    table_cell: {
        content: 'paragraph+',
        attrs: { background: { default: null } },
        tableRole: 'cell',
        toDOM: (node) => ['td', { style: node.attrs.background ? `background:${node.attrs.background}` : '' }, 0],
        parseDOM: [{ tag: 'td' }],
    },
});

const schema = new Schema({ nodes, marks: basicSchema.spec.marks });

describe('EnhancedTableCommands', () => {
    let command: EnhancedTableCommands;
    let state: EditorState;

    beforeEach(() => {
        command = new EnhancedTableCommands('table');
        const docNode = p('Hello World');
        state = EditorState.create({ doc: docNode, schema });
    });

    test('isEnabled returns true', () => {
        expect(command.isEnabled(state)).toBe(true);
    });

    test('executeCustomStyleForTable returns tr', () => {
        const mockTr = {} as Transaction;
        expect(command.executeCustomStyleForTable(state, mockTr, 0, 0)).toBe(mockTr);
    });

    test('execute inserts enhanced table figure', () => {
        const dispatch = jest.fn();
        const view = { focus: jest.fn() } as any;

        command.execute(state, dispatch, view);

        expect(dispatch).toHaveBeenCalled();
        expect(view.focus).toHaveBeenCalled();
    });

    test('insertEnhancedTableFigure returns unchanged tr when selection is not empty', () => {
        const state = EditorState.create({ schema });
        let tr = state.tr;
        const selection = TextSelection.create(state.doc, 0, 1);
        tr = tr.setSelection(selection); // works now

        const result = command.insertEnhancedTableFigure(tr, schema);
        expect(result).toBe(tr); // unchanged when selection is not empty

    });

    test('createBlueTable creates a table node', () => {
        const tableNode = command.createBlueTable(schema, 2, 2);
        expect(tableNode.type.name).toBe('table');
        expect(tableNode.childCount).toBe(2);
    });

    test('waitForUserInput resolves to undefined', async () => {
        const result = await command.waitForUserInput(state, () => { }, {} as any, {} as any);
        expect(result).toBeUndefined();
    });

    test('executeWithUserInput returns false', () => {
        const result = command.executeWithUserInput(state, () => { }, {} as any, '');
        expect(result).toBe(false);
    });

    test('cancel returns null', () => {
        expect(command.cancel()).toBeNull();
    });
});

describe('addNotesCommand', () => {
    let state: EditorState;
    let tr: Transform;
    let pos: number;

    beforeEach(() => {
        const tableNode = schema.nodes.table.createAndFill();
        const bodyNode = schema.nodes.enhanced_table_figure_body.create({}, tableNode);
        const capcoNode = schema.nodes.enhanced_table_figure_capco.create({}, schema.text('Footer'));
        const figureNode = schema.nodes.enhanced_table_figure.create({}, [bodyNode, capcoNode]);

        const docNode = schema.nodes.doc.create({}, [figureNode]);
        state = EditorState.create({ doc: docNode, schema });
        tr = new Transform(state.doc);
        pos = 0;
    });

    test('adds notes when not present', () => {
        const result = addNotesCommand(tr, schema, pos);
        const newNode = result.doc.nodeAt(pos);
        expect(newNode.childCount).toBe(3);
        expect(newNode.child(1).type.name).toBe('enhanced_table_figure_notes');
    });

    test('does not add notes when already present', () => {
        const notesNode = schema.nodes.enhanced_table_figure_notes.create({}, schema.text('Note'));
        const tableNode = schema.nodes.table.createAndFill();
        const bodyNode = schema.nodes.enhanced_table_figure_body.create({}, tableNode);
        const capcoNode = schema.nodes.enhanced_table_figure_capco.create({}, schema.text('Footer'));
        const figureNode = schema.nodes.enhanced_table_figure.create({}, [bodyNode, notesNode, capcoNode]);

        const docNode = schema.nodes.doc.create({}, [figureNode]);
        state = EditorState.create({ doc: docNode, schema });
        tr = new Transform(state.doc);

        const result = addNotesCommand(tr, schema, pos);
        expect(result).toBe(tr);
    });

    test('returns original tr when node is not enhanced_table_figure', () => {
        const docNode = schema.nodes.doc.create({}, [schema.nodes.paragraph.create()]);
        state = EditorState.create({ doc: docNode, schema });
        tr = new Transform(state.doc);

        const result = addNotesCommand(tr, schema, pos);
        expect(result).toBe(tr);
    });
});
