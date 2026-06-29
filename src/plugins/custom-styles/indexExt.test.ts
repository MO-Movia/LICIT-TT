/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock('./ui/Icon', () => ({
  __esModule: true,
  Icon: {
    get: jest.fn(() => null),
  },
}));

import {
  applyStoredMarksAfterHardBreak,
  applyStyleForEmptyParagraph,
  applyStyleForNextParagraph,
  CustomstylePlugin,
  onInitAppendTransaction,
  isDocChanged,
  resetTheDefaultStyleNameToNone,
  setNodeAttrs,
} from './index';
import * as customStyle from './customStyle';
import * as command from './CustomStyleCommand';
import { RESERVED_STYLE_NONE } from './CustomStyleNodeSpec';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

describe('index branch coverage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('onInitAppendTransaction applies styles only when styles are loaded', () => {
    const ref = { loaded: false };
    const tr = {} as unknown as import('prosemirror-state').Transaction;
    const nextState = { tr: {} as unknown as import('prosemirror-state').Transaction };

    jest.spyOn(customStyle, 'isStylesLoaded').mockReturnValue(false);
    expect(onInitAppendTransaction(ref, tr, nextState)).toBe(tr);
    expect(ref.loaded).toBe(false);

    jest.spyOn(customStyle, 'isStylesLoaded').mockReturnValue(true);
    jest.spyOn(command, 'applyLatestStyle').mockReturnValue({ updated: true } as never);
    const state = {
      tr: {
        doc: {
          content: { size: 10 },
          descendants(cb) {
            cb(
              { content: { size: 3 }, type: { name: 'paragraph' }, attrs: {} },
              1
            );
          },
        },
      },
    };

    const result = onInitAppendTransaction(ref, tr, state as never);
    expect(result).toBeDefined();
    expect(ref.loaded).toBe(true);
  });

  it('does not tag init style application for change bars', () => {
    const ref = { loaded: false };
    const setMeta = jest.fn();
    const tr = {
      doc: {
        content: { size: 10 },
        descendants(cb) {
          cb(
            {
              attrs: { styleName: 'Normal' },
              content: { size: 3 },
              type: { name: 'paragraph' },
            },
            1
          );
        },
      },
      setMeta,
    } as unknown as import('prosemirror-state').Transaction;
    const state = { tr };

    jest.spyOn(customStyle, 'isStylesLoaded').mockReturnValue(true);

    expect(onInitAppendTransaction(ref, null, state as never)).toBe(tr);
    expect(setMeta).not.toHaveBeenCalled();
  });

  it('applyStyleForEmptyParagraph applies latest style for eligible node', () => {
    const tr = {} as unknown as import('prosemirror-state').Transaction;
    const node = {
      attrs: { styleName: 'MyStyle' },
      content: { content: [{ marks: [] }] },
    };

    const nextState = {
      selection: {
        $from: { depth: 1, before: () => 2 },
        $to: { end: () => 5 },
      },
      tr: { doc: { nodeAt: () => node } },
    };

    jest.spyOn(customStyle, 'getCustomStyleByName').mockReturnValue({ styles: {} } as never);
    const applyLatestStyleSpy = jest
      .spyOn(command, 'applyLatestStyle')
      .mockReturnValue({ changed: true } as never);

    const result = applyStyleForEmptyParagraph(
      nextState as never,
      tr
    );
    expect(applyLatestStyleSpy).toHaveBeenCalled();
    expect(result).toEqual({ changed: true });
  });

  it('applyStyleForEmptyParagraph skips style apply for list style', () => {
    const tr = {};
    const node = {
      attrs: { styleName: 'ListStyle' },
      content: { content: [{ marks: [] }] },
    };
    const nextState = {
      selection: {
        $from: { depth: 1, before: () => 2 },
        $to: { end: () => 5 },
      },
      tr: { doc: { nodeAt: () => node } },
    };

    jest
      .spyOn(customStyle, 'getCustomStyleByName')
      .mockReturnValue({ styles: { isList: true } } as never);
    const applyLatestStyleSpy = jest.spyOn(command, 'applyLatestStyle');

    const result = applyStyleForEmptyParagraph(nextState as never, tr as never);
    expect(result).toBe(tr);
    expect(applyLatestStyleSpy).not.toHaveBeenCalled();
  });

  it('applyStyleForNextParagraph returns null when not a new paragraph', () => {
    const prevState = { selection: { from: 10 } };
    const nextState = {
      selection: {
        from: 25,
        $from: {},
      },
    };
    const view = { input: { lastKeyCode: 13 } };

    const result = applyStyleForNextParagraph(
      prevState as never,
      nextState as never,
      {} as never,
      view
    );
    expect(result).toBeNull();
  });

  it('applyStyleForNextParagraph applies nextLineStyle and marks for paragraph', () => {
    const tr = {
      setNodeMarkup: jest.fn().mockReturnThis(),
      addStoredMark: jest.fn().mockReturnThis(),
    };
    const prevParagraph = {
      type: { name: 'paragraph' },
      attrs: { styleName: 'Heading1', indent: 1, align: 'left' },
    };
    const listNode = { isText: false, attrs: { indent: 3 } };
    const nextNode = {
      type: { name: 'paragraph' },
      content: { size: 0 },
      descendants: (cb: (node: { type: { name: string } }) => unknown) => {
        cb({ type: { name: 'text' } });
      },
    };

    const $from = {
      depth: 1,
      node: (depth) => {
        if (depth === 0) {
          return {
            child: () => prevParagraph,
            childCount: 1,
          };
        }
        if (depth === -1) {
          return { type: { name: 'paragraph' } };
        }
        return { type: { name: 'doc' } };
      },
      index: () => 1,
      start: () => 2,
    };

    const prevState = {
      selection: { from: 1 },
      doc: { nodeAt: () => listNode },
    };
    const nextState = {
      schema: {},
      selection: { from: 3, $from },
      doc: { nodeAt: () => nextNode },
    };
    const view = { input: { lastKeyCode: 13 } };

    jest.spyOn(customStyle, 'getCustomStyleByName').mockReturnValue({
      styleName: 'Heading1',
      styles: { nextLineStyleName: 'Default', isList: true, lineHeight: '1.5' },
    });
    jest.spyOn(command, 'getMarkByStyleName').mockReturnValue([{} as never]);

    const result = applyStyleForNextParagraph(
      prevState as never,
      nextState as never,
      tr as never,
      view
    );

    expect(result).toBe(tr);
    expect(tr.setNodeMarkup).toHaveBeenCalled();
    expect(tr.addStoredMark).toHaveBeenCalled();
  });

  it('isDocChanged returns false when no transactions changed document', () => {
    expect(
      isDocChanged([
        { docChanged: false } as unknown as import('prosemirror-state').Transaction,
        { docChanged: false } as unknown as import('prosemirror-state').Transaction,
      ])
    ).toBe(false);
  });

  it('RESERVED_STYLE_NONE constant is available for branch-dependent defaults', () => {
    expect(typeof RESERVED_STYLE_NONE).toBe('string');
  });

  it('CustomstylePlugin view and DOM props handle default branches', () => {
    const plugin = new CustomstylePlugin({} as never);
    const view = {
      state: {},
      input: {},
    };

    const pluginView = plugin.spec.view?.(view as never);
    expect(
      pluginView?.update(view as unknown as EditorView, {} as EditorState)
    ).toBeUndefined();
    expect(pluginView?.destroy()).toBeUndefined();
    expect(customStyle.getHidenumberingFlag()).toBe(false);

    expect(
      plugin.props.handlePaste?.call(
        plugin,
        view,
        {},
        { content: { content: [{}] } }
      )
    ).toBe(false);
    expect(
      plugin.props.handleDOMEvents?.keydown?.call(
        plugin,
        view,
        {}
      )
    ).toBeUndefined();
  });

  it('CustomstylePlugin appendTransaction initializes and skips unchanged docs', () => {
    const plugin = new CustomstylePlugin({} as never, true);
    const doc = {
      attrs: { counterFlags: {} },
      descendants: jest.fn(),
    };
    const tr = {
      doc,
      docChanged: false,
      getMeta: jest.fn(),
    };
    const nextState = { tr, doc };

    jest.spyOn(customStyle, 'isStylesLoaded').mockReturnValue(false);
    expect(
      plugin.spec.appendTransaction?.([], {} as never, nextState as never)
    ).toBeNull();

    jest.spyOn(customStyle, 'isStylesLoaded').mockReturnValue(true);
    expect(
      plugin.spec.appendTransaction?.([], {} as never, nextState as never)
    ).toBe(tr);

    expect(
      plugin.spec.appendTransaction?.(
        [{ docChanged: false } as never],
        nextState as never,
        nextState as never
      )
    ).toBeNull();
  });

  it('resetTheDefaultStyleNameToNone normalizes only Default', () => {
    expect(resetTheDefaultStyleNameToNone('Default')).toBe(
      RESERVED_STYLE_NONE
    );
    expect(resetTheDefaultStyleNameToNone('Heading')).toBe('Heading');
  });

  it('setNodeAttrs applies next-line style details and clears overrides', () => {
    jest.spyOn(customStyle, 'getCustomStyleByName').mockReturnValue({
      styles: {
        indent: 4,
        align: 'center',
        lineHeight: '150%',
      },
    } as never);

    const result = setNodeAttrs('Heading', {
      innerLink: 'link',
      reset: 'true',
      styleName: 'Old',
    });

    expect(result).toMatchObject({
      styleName: 'Heading',
      indent: 4,
      align: 'center',
      innerLink: null,
      reset: 'false',
      overriddenAlign: null,
      overriddenIndent: null,
      overriddenLineSpacing: null,
    });
    expect(result.lineSpacing).toBeDefined();
  });

  it('setNodeAttrs resets attrs when next-line style is None', () => {
    jest.spyOn(customStyle, 'getCustomStyleByName').mockReturnValue(undefined);

    expect(setNodeAttrs(RESERVED_STYLE_NONE, { align: 'right' })).toMatchObject(
      {
        styleName: RESERVED_STYLE_NONE,
        indent: null,
        lineSpacing: null,
        align: 'left',
      }
    );
    expect(setNodeAttrs('', { styleName: 'Keep' })).toEqual({
      styleName: 'Keep',
    });
  });

  it('applyStoredMarksAfterHardBreak returns original tr when no paragraph style applies', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
          content: 'text*',
          attrs: { styleName: { default: RESERVED_STYLE_NONE } },
          toDOM: () => ['p', 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        strong: { toDOM: () => ['strong', 0] },
      },
    });
    const doc = schema.node('doc', null, [
      schema.node('paragraph', { styleName: RESERVED_STYLE_NONE }, [
        schema.text('x'),
      ]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1),
    });

    const tr = state.tr;
    expect(applyStoredMarksAfterHardBreak(state, tr)).toBe(tr);
  });

  it('applyStoredMarksAfterHardBreak adds marks from the current style', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
          content: 'text*',
          attrs: { styleName: { default: 'StrongStyle' } },
          toDOM: () => ['p', 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        strong: { toDOM: () => ['strong', 0] },
      },
    });
    const doc = schema.node('doc', null, [
      schema.node('paragraph', { styleName: 'StrongStyle' }, [
        schema.text('x'),
      ]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1),
    });
    const mark = schema.marks.strong.create();
    jest.spyOn(command, 'getMarkByStyleName').mockReturnValue([mark]);

    const result = applyStoredMarksAfterHardBreak(state, state.tr);

    expect(
      (result as unknown as { storedMarks: unknown[] }).storedMarks
    ).toContain(mark);
  });
});
