/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { normalizeLegacyEnhancedTableFigureBodies } from './EnhancedTableNormalizer';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { content: 'inline*', group: 'block' },
    image: {
      attrs: {
        cropData: { default: null },
        src: { default: '' },
        width: { default: null },
      },
      group: 'inline',
      inline: true,
    },
    table: { group: 'block', tableRole: 'table' },
    enhanced_table_figure_image: {
      content: 'inline?',
      group: 'block',
      isolating: true,
    },
    enhanced_table_figure_table: {
      content: 'table',
      group: 'block',
      isolating: true,
    },
    enhanced_table_figure_body: {
      content:
        '(enhanced_table_figure_table | enhanced_table_figure_image)',
    },
    enhanced_table_figure_notes: { content: 'paragraph+', group: 'block' },
    enhanced_table_figure_capco: { content: 'inline*', group: 'block' },
    enhanced_table_figure: {
      content:
        'enhanced_table_figure_body enhanced_table_figure_notes? enhanced_table_figure_capco',
      group: 'block',
    },
  },
});

describe('normalizeLegacyEnhancedTableFigureBodies', () => {
  it('migrates direct and paragraph images while preserving image attrs', () => {
    const directImage = schema.nodes.image.create({
      cropData: { left: 5 },
      src: 'legacy.png',
      width: 320,
    });
    const directState = createFigureState(
      schema.nodes.enhanced_table_figure_body.create({}, directImage)
    );

    const directTr = normalizeLegacyEnhancedTableFigureBodies(
      directState.tr,
      schema
    );
    const directPayload = directTr.doc.firstChild.firstChild.firstChild;

    expect(directPayload.type.name).toBe('enhanced_table_figure_image');
    expect(directPayload.firstChild.attrs).toEqual(
      expect.objectContaining({
        cropData: { left: 5 },
        src: 'legacy.png',
        width: 320,
      })
    );

    const paragraphState = createFigureState(
      schema.nodes.enhanced_table_figure_body.create(
        {},
        imageParagraph('paragraph.png')
      )
    );
    const paragraphTr = normalizeLegacyEnhancedTableFigureBodies(
      paragraphState.tr,
      schema
    );
    expect(
      paragraphTr.doc.firstChild.firstChild.firstChild.firstChild.attrs.src
    ).toBe('paragraph.png');
  });

  it('migrates a direct table and leaves current wrappers unchanged', () => {
    const legacyState = createFigureState(
      schema.nodes.enhanced_table_figure_body.create(
        {},
        schema.nodes.table.create()
      )
    );
    const legacyTr = normalizeLegacyEnhancedTableFigureBodies(
      legacyState.tr,
      schema
    );
    expect(legacyTr.doc.firstChild.firstChild.firstChild.type.name).toBe(
      'enhanced_table_figure_table'
    );

    const currentState = createFigureState(
      schema.nodes.enhanced_table_figure_body.create({}, eicTable())
    );
    const currentTr = normalizeLegacyEnhancedTableFigureBodies(
      currentState.tr,
      schema
    );
    expect(currentTr.steps).toHaveLength(0);
  });

  it('recovers extra body paragraphs into notes and removes empty extras', () => {
    const body = schema.nodes.enhanced_table_figure_body.create({}, [
      schema.nodes.table.create(),
      schema.nodes.paragraph.create({}, schema.text('Recovered note')),
      schema.nodes.paragraph.create(),
    ]);
    const state = createFigureState(body);

    const tr = normalizeLegacyEnhancedTableFigureBodies(state.tr, schema);
    const figure = tr.doc.firstChild;

    expect(figure.firstChild.childCount).toBe(1);
    expect(figure.firstChild.firstChild.type.name).toBe(
      'enhanced_table_figure_table'
    );
    expect(figure.child(1).type.name).toBe('enhanced_table_figure_notes');
    expect(figure.child(1).textContent).toBe('Recovered note');
  });

  it('does not change ordinary images outside EIC figures', () => {
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, imageParagraph('ordinary.png')),
      schema,
    });
    const tr = normalizeLegacyEnhancedTableFigureBodies(state.tr, schema);
    expect(tr.steps).toHaveLength(0);
  });
});

function imageParagraph(src: string): ProseMirrorNode {
  return schema.nodes.paragraph.create(
    {},
    schema.nodes.image.create({ src })
  );
}

function eicTable(): ProseMirrorNode {
  return schema.nodes.enhanced_table_figure_table.create(
    {},
    schema.nodes.table.create()
  );
}

function createFigureState(body: ProseMirrorNode): EditorState {
  const capco = schema.nodes.enhanced_table_figure_capco.create(
    {},
    schema.text('CAPCO')
  );
  const figure = schema.nodes.enhanced_table_figure.create({}, [body, capco]);
  return EditorState.create({
    doc: schema.nodes.doc.create({}, figure),
    schema,
  });
}
