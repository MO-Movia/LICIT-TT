/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import { Item } from './item';
import * as utils from './utils';
import * as item from './item';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';

describe('utils', () => {
  it('should handle getCursorPosition', () => {
    function eventHandler(this: HTMLInputElement, ev: MouseEvent) {
      return !!ev;
    }
    const input: HTMLInputElement = document.createElement('input');

    input.addEventListener('click', eventHandler);
    const options = {
      bubbles: true,
      cancelable: true,
      view: window,
      target: input,
    };
    const mevent = new MouseEvent('click', options);
    input.dispatchEvent(mevent);

    expect(utils.getCursorPosition(mevent)).toBe(0);
  });
  it('should handle getCursorPosition 2', () => {
    function eventHandler(this: HTMLInputElement, ev: MouseEvent) {
      return !!ev;
    }
    const input = document.createElement('input');

    input.addEventListener('click', eventHandler);
    const options = {
      code: 'ArrowRight',
      key: 'ArrowUp',
      location: 1,
    };
    const mevent = new KeyboardEvent('keydown', options);
    input.dispatchEvent(mevent);

    expect(utils.getCursorPosition(mevent)).toBe(1);
  });

  it('should handle getValueWithoutSlash', () => {
    expect(utils.getValueWithoutSlash('TEST//')).toBe('TEST');
  });
  it('should handle getValueWithoutSlash else statement', () => {
    expect(utils.getValueWithoutSlash('TEST,,')).toBe('TEST');
  });
  it('should handle getCapcoString else statement', () => {
    expect(utils.getCapcoString('CUI')).toBe('error');
  });
  it('should handle removeAnItem', () => {
    const fnitem = () => {
      return new Item('SCI', 'Sensitive Compartmented Information', 1);
    };
    const items = [new Item('SCT', 'Sensitive Compartmented Information', 2)];
    expect(item.removeAnItem('test', fnitem, items)).toEqual([
      {
        code: 'SCT',
        description: 'Sensitive Compartmented Information',
        display: 'SCT',
        order: 2,
      },
    ]);
  });
  it('should handle removeAnItem branch', () => {
    const fnitem = () => {
      return new Item('SCI', 'Sensitive Compartmented Information', 1);
    };
    const items = [new Item('SCI', 'Sensitive Compartmented Information', 2)];
    expect(item.removeAnItem('test', fnitem, items)).toStrictEqual([]);
  });
  it('should handle safeCapcoParse null', () => {
    expect(utils.safeCapcoParse(undefined).portionMarking).toBe('error');
  });
  it('should handle safeCapcoParse string', () => {
    expect(utils.safeCapcoParse('TBD').portionMarking).toBe('error');
  });
  it('should handle safeCapcoParse object', () => {
    expect(
      utils.safeCapcoParse(JSON.parse('{"portionMarking": "SECRET"}'))
        .portionMarking
    ).toBe('SECRET');
  });
  it('should handle safeCapcoParse json', () => {
    expect(
      utils.safeCapcoParse('{"portionMarking": "SECRET"}').portionMarking
    ).toBe('SECRET');
  });

  it.each([
    ['legacy direct table', 'table', false, false],
    ['wrapped table', 'table', true, false],
    ['wrapped landscape table', 'table', true, true],
    ['legacy paragraph image', 'figure', false, false],
    ['wrapped image', 'figure', true, false],
    ['wrapped landscape image', 'figure', true, true],
  ])('finds the CAPCO payload for a %s', (_name, type, wrapped, landscape) => {
    const {state, capcoPos, payloadPos} = createEicState(
      type,
      wrapped,
      landscape
    );

    expect(utils.getBlockControlCapco(state, capcoPos)).toBe(payloadPos);
    expect(utils.isInsideEnhancedTableFigureBody(state, payloadPos)).toBe(true);
  });

  it('leaves non-EIC positions unchanged', () => {
    const schema = createEicSchema();
    const state = EditorState.create({
      doc: schema.nodes.doc.create({}, schema.nodes.table.create()),
      schema,
    });
    expect(utils.getBlockControlCapco(state, 0)).toBe(0);
    expect(utils.isInsideEnhancedTableFigureBody(state, 0)).toBe(false);
  });
});

function createEicState(
  figureType: string,
  wrapped: boolean,
  landscape: boolean
) {
  const schema = createEicSchema();
  const isImage = figureType === 'figure';
  const payload = isImage
    ? schema.nodes.image.create({src: 'eic.png'})
    : schema.nodes.table.create();
  let bodyPayload = payload;
  if (wrapped) {
    bodyPayload = schema.nodes[
      isImage
        ? 'enhanced_table_figure_image'
        : 'enhanced_table_figure_table'
    ].create({}, payload);
  } else if (isImage) {
    bodyPayload = schema.nodes.paragraph.create({}, payload);
  }

  const body = schema.nodes.enhanced_table_figure_body.create({}, bodyPayload);
  const capco = schema.nodes.enhanced_table_figure_capco.create();
  const figure = schema.nodes.enhanced_table_figure.create(
    {figureType},
    [body, capco]
  );
  const root = landscape
    ? schema.nodes.landscape_section.create({}, figure)
    : figure;
  const state = EditorState.create({
    doc: schema.nodes.doc.create({}, root),
    schema,
  });
  return {
    capcoPos: findNodePosition(state, 'enhanced_table_figure_capco'),
    payloadPos: findNodePosition(state, isImage ? 'image' : 'table'),
    state,
  };
}

function createEicSchema(): Schema {
  return new Schema({
    nodes: {
      doc: {content: 'block+'},
      text: {group: 'inline'},
      paragraph: {content: 'inline*', group: 'block'},
      image: {attrs: {src: {default: ''}}, group: 'inline', inline: true},
      table: {group: 'block'},
      enhanced_table_figure_table: {content: 'table', group: 'block'},
      enhanced_table_figure_image: {content: 'image', group: 'block'},
      enhanced_table_figure_body: {
        content:
          '(table | paragraph | enhanced_table_figure_table | enhanced_table_figure_image)',
      },
      enhanced_table_figure_capco: {content: 'text*'},
      enhanced_table_figure: {
        attrs: {figureType: {default: 'table'}},
        content:
          'enhanced_table_figure_body enhanced_table_figure_capco',
        group: 'block',
      },
      landscape_section: {content: 'block+', group: 'block'},
    },
  });
}

function findNodePosition(state: EditorState, typeName: string): number {
  let found = -1;
  state.doc.descendants((node, pos) => {
    if (found < 0 && node.type.name === typeName) {
      found = pos;
    }
  });
  return found;
}
