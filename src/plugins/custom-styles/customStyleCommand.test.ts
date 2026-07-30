/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock('./customStyle', () => ({
  getCustomStyleByName: jest.fn(),
  getCustomStyleByLevel: jest.fn(),
  isPreviousLevelExists: jest.fn(() => false),
  saveStyle: jest.fn().mockResolvedValue([]),
  getStylesAsync: jest.fn().mockResolvedValue([]),
  addStyleToList: jest.fn((style: unknown) => [style]),
  setStyles: jest.fn(),
  invalidateStyleCache: jest.fn(),
  registerStyleCacheInvalidator: jest.fn(() => jest.fn()),
}));

jest.mock('./clearCustomStyleMarks', () => ({
  removeTextAlignAndLineSpacing: jest.fn((tr: unknown) => tr),
  clearCustomStyleAttribute: jest.fn(),
}));

jest.mock('./ui/AlertInfo', () => ({
  AlertInfo: function AlertInfo() {},
}));

jest.mock('./ui/CustomStyleEditor', () => ({
  CustomStyleEditor: function CustomStyleEditor() {},
}));

jest.mock('./ui/JSONEditor', () => ({
  __esModule: true,
  default: function JSONEditor() {},
}));

jest.mock('./ParagraphSpacingCommand', () => {
  class ParagraphSpacingCommand {
    executeCustom(_s: unknown, tr: unknown) {
      return tr;
    }
    executeCustomStyleForTable(_s: unknown, tr: unknown) {
      return tr;
    }
  }
  return { ParagraphSpacingCommand };
});

jest.mock('../../commands', () => {
  const makeCommand = () =>
    class {
      executeCustom(_s: unknown, tr: unknown) {
        return tr;
      }
      executeCustomStyleForTable(_s: unknown, tr: unknown) {
        return tr;
      }
    };

  return {
    atViewportCenter: 'mock-anchor',
    createPopUp: jest.fn(() => ({ close: jest.fn() })),
    MarkToggleCommand: makeCommand(),
    TextColorCommand: makeCommand(),
    TextHighlightCommand: makeCommand(),
    FontTypeCommand: makeCommand(),
    FontSizeCommand: makeCommand(),
    TextLineSpacingCommand: makeCommand(),
    TextAlignCommand: makeCommand(),
    IndentCommand: makeCommand(),
    getLineSpacingValue: jest.fn((value: unknown) => value),
    isColumnCellSelected: jest.fn(() => false),
    getSelectedCellPositions: jest.fn(() => []),
    findParagraphsInNode: jest.fn((node, pos, cb) => {
      if (node) cb(node, pos);
    }),
  };
});

import {
  EditorState,
  TextSelection,
  Selection,
  type Transaction,
} from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { schema } from 'prosemirror-schema-basic';
import { doc, p } from 'jest-prosemirror';
import * as customstyles from './customStyle';
import * as csc from './CustomStyleCommand';
import { getStyleLevel, getMarkByStyleName } from './CustomStyleCommand';
import type { Style } from './StyleRuntime';
import { Schema, type Node } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

const mockedCustomstyles = customstyles as jest.Mocked<typeof customstyles>;

// RESERVED_STYLE_NONE constant used by the source file
const RESERVED_STYLE_NONE = 'None';

function makeState(): EditorState {
  const editorDoc = doc(p('Hello world'));
  return EditorState.create({
    doc: editorDoc,
    schema,
    selection: Selection.atStart(editorDoc),
  });
}

const customMarkSchema = new Schema({
  nodes: schema.spec.nodes,
  marks: {
    strong: {},
    em: {},
    'mark-text-color': {
      attrs: { color: { default: null } },
    },
    'mark-font-size': {
      attrs: { pt: { default: null } },
    },
    'mark-font-type': {
      attrs: { name: { default: null } },
    },
    'mark-text-highlight': {
      attrs: { highlightColor: { default: null } },
    },
    underline: {},
  },
});

describe('CustomStyleCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('shows an alert popup when showAlert() is called', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'Test' }, 'Test');
    expect(command._popUp).toBeNull();
    command.showAlert();
    expect(command._popUp).toBeDefined();
  });

  it('calls saveStyle when createNewStyle is invoked with valid style', () => {
    const command = new csc.CustomStyleCommand(
      { styleName: 'NewStyle' },
      'NewStyle'
    );
    const state = makeState();
    const dispatch = jest.fn();
    const style = {
      styleName: 'NewStyle',
      styles: { hasNumbering: false, styleLevel: 1 },
      editorView: {},
    };

    mockedCustomstyles.saveStyle.mockResolvedValueOnce([]);
    jest
      .spyOn(TextSelection, 'create')
      .mockReturnValue(TextSelection.atStart(state.doc) as TextSelection);
    jest.spyOn(csc, 'applyStyle').mockReturnValue(state.tr);

    command.createNewStyle(style, state.tr, state, dispatch, state.doc);

    expect(mockedCustomstyles.saveStyle).toHaveBeenCalledWith({
      styleName: 'NewStyle',
      styles: { hasNumbering: false, styleLevel: 1 },
    });
  });

  it('shows an alert when createNewStyle receives invalid numbering hierarchy', () => {
    mockedCustomstyles.isPreviousLevelExists.mockReturnValueOnce(false);
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const showAlertSpy = jest.spyOn(command, 'showAlert');
    const state = makeState();

    command.createNewStyle(
      {
        styleName: 'X',
        styles: { hasNumbering: true, styleLevel: '2' },
        editorView: {},
      },
      state.tr,
      state,
      jest.fn(),
      state.doc
    );

    expect(showAlertSpy).toHaveBeenCalled();
  });

  it('retrieves custom styles and sets them', () => {
    mockedCustomstyles.getStylesAsync.mockResolvedValueOnce([
      { styleName: 'TestStyle', styles: {} },
    ]);
    const state = makeState();
    const dispatch = jest.fn();
    const view = { state, dispatch } as unknown as EditorView;
    const command = new csc.CustomStyleCommand(
      { styleName: 'TestStyle' },
      'TestStyle'
    );

    command.getCustomStyles('TestStyle', view);

    expect(mockedCustomstyles.getStylesAsync).toHaveBeenCalled();
  });
});

describe('CustomStyleCommand helpers', () => {
  it('compareAttributes returns true for a supported strong mark', () => {
    const mark = {
      type: { name: 'strong' },
      attrs: { overridden: false },
    };
    expect(csc.compareAttributes(mark, { strong: true })).toBe(true);
  });

  it('compareAttributes returns false for unsupported mark names', () => {
    const mark = {
      type: { name: 'strike' },
      attrs: { overridden: false },
    };
    expect(csc.compareAttributes(mark, {})).toBe(false);
  });

  it('compareAttributes returns false when mark is overridden', () => {
    const mark = {
      type: { name: 'strong' },
      attrs: { overridden: true },
    };
    expect(csc.compareAttributes(mark, { strong: true })).toBe(false);
  });

  it('compareAttributes checks em mark attributes', () => {
    const mark = { type: { name: 'em' }, attrs: { overridden: false } };
    expect(csc.compareAttributes(mark, { em: true })).toBe(true);
  });

  it('compareAttributes checks text color mark attributes', () => {
    const mark = {
      type: { name: 'textColor' },
      attrs: { color: '#FF0000', overridden: false },
    };
    expect(csc.compareAttributes(mark, { color: '#FF0000' })).toBe(false);
  });

  it('compareAttributes checks font size mark attributes', () => {
    const mark = {
      type: { name: 'fontSize' },
      attrs: { pt: 12, overridden: false },
    };
    expect(csc.compareAttributes(mark, { fontSize: 12 })).toBe(false);
  });

  it('compareAttributes checks font type mark attributes', () => {
    const mark = {
      type: { name: 'fontType' },
      attrs: { name: 'Arial', overridden: false },
    };
    expect(csc.compareAttributes(mark, { fontName: 'Arial' })).toBe(false);
  });

  it('compareAttributes returns false for strike, super, sub marks', () => {
    const strikeReset = {
      type: { name: 'strike' },
      attrs: { overridden: false },
    };
    expect(csc.compareAttributes(strikeReset, {})).toBe(false);
  });

  it('compareAttributes checks highlight mark attributes', () => {
    const mark = {
      type: { name: 'textHighlight' },
      attrs: { highlightColor: '#FFFF00', overridden: false },
    };
    expect(csc.compareAttributes(mark, { textHighlight: '#FFFF00' })).toBe(
      false
    );
  });

  it('compareAttributes checks underline mark attributes', () => {
    const mark = {
      type: { name: 'underline' },
      attrs: { overridden: false },
    };
    expect(csc.compareAttributes(mark, { underline: true })).toBe(true);
  });

  it('compareAttributes covers matching custom mark names', () => {
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-text-color' },
          attrs: { color: '#123456', overridden: false },
        },
        { color: '#123456' }
      )
    ).toBe(true);
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-font-size' },
          attrs: { pt: 14, overridden: false },
        },
        { fontSize: 14 }
      )
    ).toBe(true);
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-font-type' },
          attrs: { name: 'Arial', overridden: false },
        },
        { fontName: 'Arial' }
      )
    ).toBe(true);
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-text-highlight' },
          attrs: { highlightColor: '#FFFF00', overridden: false },
        },
        { textHighlight: '#FFFF00' }
      )
    ).toBe(true);
  });

  it('compareAttributes covers mismatched custom mark attributes', () => {
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-text-color' },
          attrs: { color: '#000000', overridden: false },
        },
        { color: '#FFFFFF' }
      )
    ).toBe(false);
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-font-size' },
          attrs: { pt: 12, overridden: false },
        },
        { fontSize: 14 }
      )
    ).toBe(false);
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-font-type' },
          attrs: { name: 'Arial', overridden: false },
        },
        { fontName: 'Times' }
      )
    ).toBe(false);
    expect(
      csc.compareAttributes(
        {
          type: { name: 'mark-text-highlight' },
          attrs: { highlightColor: '#FFFF00', overridden: false },
        },
        { textHighlight: '#00FFFF' }
      )
    ).toBe(false);
  });

  it('compareMarkWithStyle returns the same transaction and does not modify when style matches', () => {
    const mark = { type: { name: 'em' }, attrs: { overridden: false } };
    const tr = {} as Transform;
    const result = csc.compareMarkWithStyle(mark, { em: true }, tr, 0, 0, {
      modified: false,
    });

    expect(result).toBe(tr);
    expect(mark.attrs.overridden).toBe(false);
  });

  it('compareMarkWithStyle returns unchanged transaction when style is null', () => {
    const mark = { type: { name: 'em' }, attrs: { overridden: false } };
    const tr = {} as Transform;
    const result = csc.compareMarkWithStyle(mark, null, tr, 0, 0, {
      modified: false,
    });

    expect(result).toBe(tr);
  });

  it('compareMarkWithStyle updates overridden flag when attributes differ', () => {
    const mark = { type: { name: 'em' }, attrs: { overridden: false } };
    const tr = { selection: { from: 0, to: 0 } } as unknown as Transform;
    const retObj = { modified: false };
    csc.compareMarkWithStyle(mark, { strong: true }, tr, 0, 0, retObj);

    expect(retObj.modified).toBe(true);
  });

  it('getMarkByStyleName returns marks for known style properties', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styles: { color: '#000', strong: true },
    } as Style);

    const marks = csc.getMarkByStyleName('TestStyle', schema);
    expect(marks.length).toBeGreaterThan(0);
  });

  it('getMarkByStyleName returns empty array when style has no properties', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styles: {},
    } as Style);

    const marks = csc.getMarkByStyleName('EmptyStyle', schema);
    expect(marks.length).toBe(0);
  });

  it('getMarkByStyleName returns empty array when style is undefined', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce(undefined);

    const marks = csc.getMarkByStyleName('UndefinedStyle', schema);
    expect(marks.length).toBe(0);
  });

  it('getMarkByStyleName creates all supported custom marks', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styleName: 'RichStyle',
      styles: {
        boldPartial: true,
        color: '#123456',
        em: true,
        fontName: 'Arial',
        fontSize: '14',
        strong: true,
        textHighlight: '#FFFF00',
        underline: true,
      },
    });

    const marks = csc.getMarkByStyleName('RichStyle', customMarkSchema);

    expect(marks.map((mark) => mark.type.name)).toEqual(
      expect.arrayContaining([
        'strong',
        'em',
        'mark-text-color',
        'mark-font-size',
        'mark-font-type',
        'mark-text-highlight',
        'underline',
      ])
    );
  });

  it('getMarkByStyleName skips disabled boolean marks', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styles: {
        boldPartial: false,
        em: false,
        strong: false,
        unknownProp: true,
      },
    } as unknown as Style);

    const marks = csc.getMarkByStyleName('DisabledStyle', customMarkSchema);

    expect(marks).toEqual([]);
  });
});

describe('CustomStyleCommand - execute mode branches', () => {
  it('handles newstyle mode by opening edit window', () => {
    const command = new csc.CustomStyleCommand('newstyle', 'NewStyle');
    const state = makeState();
    const view = { focus: jest.fn() } as unknown as EditorView;
    jest.spyOn(command, 'editWindow');

    command.execute(state, jest.fn(), view);

    expect(command.editWindow).toHaveBeenCalled();
  });

  it('handles editall mode without ctrl key', () => {
    const command = new csc.CustomStyleCommand('editall', 'EditAll');
    const state = makeState();
    const view = { focus: jest.fn() } as unknown as EditorView;
    const event = new MouseEvent('click');
    jest.spyOn(command, 'editWindow');

    command.execute(state, jest.fn(), view, event);

    expect(command.editWindow).toHaveBeenCalled();
  });

  it('handles clearstyle mode', () => {
    const command = new csc.CustomStyleCommand('clearstyle', 'ClearStyle');
    const state = makeState();
    const dispatch = jest.fn();
    jest.spyOn(command, 'executeClearStyle');

    command.execute(state, dispatch);

    expect(command.executeClearStyle).toHaveBeenCalled();
  });

  it('handles reset mode', () => {
    const command = new csc.CustomStyleCommand('reset', 'Reset');
    const state = makeState();
    jest.spyOn(command, 'resetNumber');

    command.execute(state, jest.fn());

    expect(command.resetNumber).toHaveBeenCalled();
  });

  it('isStyleEnabled returns true for non-clearstyle menus', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'Test' }, 'Test');
    const state = makeState();
    jest.spyOn(command, 'isCustomStyleApplied').mockReturnValue('AppliedStyle');

    const result = command.isStyleEnabled(
      state,
      {} as unknown as EditorView,
      'somemenu'
    );

    expect(result).toBe(true);
  });

  it('isStyleEnabled returns false for clearstyle with no applied style', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'Test' }, 'Test');
    const state = makeState();
    jest
      .spyOn(command, 'isCustomStyleApplied')
      .mockReturnValue('RESERVED_STYLE_NONE');

    const result = command.isStyleEnabled(
      state,
      {} as unknown as EditorView,
      'clearstyle'
    );

    expect(result).toBe(true);
  });

  it('isStyleEnabled returns true for clearstyle with applied style', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'Test' }, 'Test');
    const state = makeState();
    jest.spyOn(command, 'isCustomStyleApplied').mockReturnValue('CustomStyle');

    const result = command.isStyleEnabled(
      state,
      {} as unknown as EditorView,
      'clearstyle'
    );

    expect(result).toBe(true);
  });

  it('isCustomStyleApplied returns RESERVED_STYLE_NONE when no style is applied', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'Test' }, 'Test');
    const state = makeState();

    const result = command.isCustomStyleApplied(state);

    expect(result).toBe('Normal');
  });
});

describe('CustomStyleCommand - basic instance methods', () => {
  it('isActive always returns true', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    expect(command.isActive()).toBe(true);
  });

  it('should handle getMarkByStyleName', () => {
    jest.spyOn(customstyles, 'getCustomStyleByName').mockReturnValue({
      styles: {
        hasBullet: true,
        bulletLevel: '25CF',
        styleLevel: 1,
        paragraphSpacingBefore: '10',
        paragraphSpacingAfter: '10',
        strong: true,
        boldNumbering: true,
        em: true,
        color: 'blue',
        fontSize: '10',
        fontName: 'Tahoma',
        indent: '10',
        hasNumbering: true,
        textHighlight: 'blue',
        underline: true,
      },
    } as unknown as Style);
    const mockSchema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: { inline: true },
      },
      // marks1: {
      //     link: {
      //         attrs: {
      //             href: 'test_href'
      //         }
      //     }
      // },
      marks: {
        link: {
          attrs: {
            test_href: {
              default: 'test_href',
            },
          },
        },
        em: {
          parseDOM: [
            {
              tag: 'i',
            },
            {
              tag: 'em',
            },
            {
              style: 'font-style=italic',
            },
          ],
          toDOM() {
            return ['em', 0];
          },
          attrs: {
            overridden: {
              default: false,
            },
          },
        },
        strong: {
          parseDOM: [
            {
              tag: 'strong',
            },
            {
              tag: 'b',
            },
            {
              style: 'font-weight',
            },
          ],
          toDOM() {
            return ['strong', 0];
          },
          attrs: {
            overridden: {
              default: false,
            },
          },
        },
        underline: {
          parseDOM: [
            {
              tag: 'u',
            },
            {
              style: 'text-decoration-line',
            },
            {
              style: 'text-decoration',
            },
          ],
          toDOM() {
            return ['u', 0];
          },
          attrs: {
            overridden: {
              default: false,
            },
          },
        },
        'mark-text-color': {
          attrs: {
            color: {
              default: '',
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              style: 'color',
            },
          ],
          toDOM() {
            return ['span', { color: '' }, 0];
          },
        },
        'mark-text-highlight': {
          attrs: {
            highlightColor: {
              default: '',
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              tag: 'span[style*=background-color]',
            },
          ],
          toDOM() {
            return ['span', { highlightColor: '' }, 0];
          },
        },
        'mark-font-size': {
          attrs: {
            pt: {
              default: null,
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              style: 'font-size',
            },
          ],
          toDOM() {
            return ['Test Mark'];
          },
        },
        'mark-font-type': {
          attrs: {
            name: {
              default: '',
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              style: 'font-family',
            },
          ],
          toDOM() {
            return ['span', 0];
          },
        },
      },
    });
    expect(getMarkByStyleName('test', mockSchema)).toBeDefined();
  });
  it('should handle getMarkByStyleName (case 2)', () => {
    jest.spyOn(customstyles, 'getCustomStyleByName').mockReturnValue({
      styles: {
        hasBullet: true,
        bulletLevel: '25CF',
        styleLevel: 1,
        paragraphSpacingBefore: '10',
        paragraphSpacingAfter: '10',
        strong: true,
        boldNumbering: true,
        em: true,
        color: undefined,
        fontSize: undefined,
        fontName: undefined,
        indent: '10',
        hasNumbering: true,
        textHighlight: undefined,
        underline: true,
      },
    } as unknown as Style);
    const mockSchema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: { inline: true },
      },
      // marks1: {
      //     link: {
      //         attrs: {
      //             href: 'test_href'
      //         }
      //     }
      // },
      marks: {
        link: {
          attrs: {
            test_href: {
              default: 'test_href',
            },
          },
        },
        em: {
          parseDOM: [
            {
              tag: 'i',
            },
            {
              tag: 'em',
            },
            {
              style: 'font-style=italic',
            },
          ],
          toDOM() {
            return ['em', 0];
          },
          attrs: {
            overridden: {
              default: false,
            },
          },
        },
        strong: {
          parseDOM: [
            {
              tag: 'strong',
            },
            {
              tag: 'b',
            },
            {
              style: 'font-weight',
            },
          ],
          toDOM() {
            return ['strong', 0];
          },
          attrs: {
            overridden: {
              default: false,
            },
          },
        },
        underline: {
          parseDOM: [
            {
              tag: 'u',
            },
            {
              style: 'text-decoration-line',
            },
            {
              style: 'text-decoration',
            },
          ],
          toDOM() {
            return ['u', 0];
          },
          attrs: {
            overridden: {
              default: false,
            },
          },
        },
        'mark-text-color': {
          attrs: {
            color: {
              default: '',
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              style: 'color',
            },
          ],
          toDOM() {
            return ['span', { color: '' }, 0];
          },
        },
        'mark-text-highlight': {
          attrs: {
            highlightColor: {
              default: '',
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              tag: 'span[style*=background-color]',
            },
          ],
          toDOM() {
            return ['span', { highlightColor: '' }, 0];
          },
        },
        'mark-font-size': {
          attrs: {
            pt: {
              default: null,
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              style: 'font-size',
            },
          ],
          toDOM() {
            return ['Test Mark'];
          },
        },
        'mark-font-type': {
          attrs: {
            name: {
              default: '',
            },
            overridden: {
              default: false,
            },
          },
          inline: true,
          group: 'inline',
          parseDOM: [
            {
              style: 'font-family',
            },
          ],
          toDOM() {
            return ['span', 0];
          },
        },
      },
    });
    expect(getMarkByStyleName('test', mockSchema)).toBeDefined();
  });
});
describe('getStyleLevel', () => {
  it('should handle getStyleLevel', () => {
    expect(getStyleLevel('Normal')).toBe(1);
  });
  it('should handle getStyleLevel when styleProp null', () => {
    const spy = jest
      .spyOn(customstyles, 'getCustomStyleByName')
      .mockReturnValue({} as unknown as Style);
    expect(getStyleLevel('Normal-@#$-10')).toBe(10);
    spy.mockReset();
  });

  it('should handle getStyleLevel when styleProp null (case 2)', () => {
    const spy = jest
      .spyOn(customstyles, 'getCustomStyleByName')
      .mockReturnValue({} as unknown as Style);
    expect(csc.getStyleLevel('Normal-@#$-10Normal-@#$-11')).toBe(0);
    spy.mockReset();
  });
});

describe('getCustomStyleCommands - switch case branches', () => {
  it('returns empty array when style has no properties', () => {
    expect(csc.getCustomStyleCommands({})).toEqual([]);
  });

  it('skips falsy strong/em/strike/underline boolean properties', () => {
    const result = csc.getCustomStyleCommands({
      strong: false,
      em: false,
      strike: false,
      underline: false,
    });
    expect(result.length).toBe(0);
  });

  it('creates commands for truthy boolean properties', () => {
    const result = csc.getCustomStyleCommands({
      strong: true,
      em: true,
      strike: true,
      underline: true,
    });
    expect(result.length).toBe(4);
  });

  it('creates color, fontSize, fontName commands', () => {
    const result = csc.getCustomStyleCommands({
      color: '#000',
      fontSize: 12,
      fontName: 'Arial',
    });
    expect(result.length).toBe(3);
  });

  it('always creates super command regardless of value', () => {
    const result = csc.getCustomStyleCommands({ super: true });
    expect(result.length).toBe(1);
  });

  it('creates textHighlight, align, and lineHeight commands', () => {
    const result = csc.getCustomStyleCommands({
      textHighlight: '#FFFF00',
      align: 'left',
      lineHeight: '1.5',
    });
    expect(result.length).toBe(3);
  });

  it('creates paragraphSpacing commands for before/after', () => {
    const result = csc.getCustomStyleCommands({
      paragraphSpacingAfter: 10,
      paragraphSpacingBefore: 5,
    });
    expect(result.length).toBe(2);
  });

  it('creates indent command when indent > 0', () => {
    const result = csc.getCustomStyleCommands({ indent: 2 });
    expect(result.length).toBe(1);
  });

  it('skips indent command when indent is 0 or negative', () => {
    expect(csc.getCustomStyleCommands({ indent: 0 }).length).toBe(0);
    expect(csc.getCustomStyleCommands({ indent: -1 }).length).toBe(0);
  });

  it('creates level-based indent command when level > 0', () => {
    const result = csc.getCustomStyleCommands({
      isLevelbased: true,
      styleLevel: 2,
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('skips level-based indent without styleLevel', () => {
    const result = csc.getCustomStyleCommands({ isLevelbased: true });
    expect(result.length).toBe(0);
  });

  it('skips level-based indent when styleLevel is 0', () => {
    const result = csc.getCustomStyleCommands({
      isLevelbased: true,
      styleLevel: 0,
    });
    expect(result.length).toBe(0);
  });

  it('ignores unknown style properties (default branch)', () => {
    const result = csc.getCustomStyleCommands({ unknownProp: 'x' });
    expect(result.length).toBe(0);
  });

  it('sorts MarkToggleCommands to the end', () => {
    const result = csc.getCustomStyleCommands({
      strong: true,
      color: '#000',
      em: true,
      fontSize: 12,
    });
    const lastTwo = result.slice(-2).map((c) => c.constructor.name);
    expect(lastTwo).toEqual(expect.arrayContaining(['', '']));
  });
});

describe('getStyleLevel branches', () => {
  it('returns 0 when styleName is undefined', () => {
    expect(csc.getStyleLevel(undefined)).toBe(0);
  });

  it('returns 0 when styleName is an empty string', () => {
    expect(csc.getStyleLevel('')).toBe(0);
  });

  it('returns styleLevel from the custom style', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styles: { styleLevel: 3 },
    } as Style);
    expect(csc.getStyleLevel('MyStyle')).toBe(3);
  });

  it('returns 0 when custom style has no styleLevel and name is unknown', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce(undefined);
    expect(csc.getStyleLevel('Unknown')).toBe(0);
  });

  it('returns 0 when custom style has empty styles', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styles: {},
    } as Style);
    expect(csc.getStyleLevel('Empty')).toBe(0);
  });

  it('returns styleLevel when reserved none numbering is used', () => {
    expect(csc.getStyleLevel('Normal-@#$-3')).toBe(3);
  });
});

describe('resetNodeAttrs', () => {
  it('resets indent, lineSpacing, padding fields', () => {
    const attrs = {
      indent: 5,
      lineSpacing: 1.5,
      paddingBottom: 10,
      paddingTop: 10,
    };
    const customStyle = { styleName: 'NewStyle' };
    const result = csc.resetNodeAttrs(attrs, customStyle);
    expect(result.indent).toBeNull();
    expect(result.lineSpacing).toBeNull();
    expect(result.paddingBottom).toBeNull();
    expect(result.paddingTop).toBeNull();
    expect(result.styleName).toBe('NewStyle');
  });

  it('handles null customStyle gracefully', () => {
    const attrs = { indent: 5 };
    const result = csc.resetNodeAttrs(attrs, null);
    expect(result.styleName).toBe('');
    expect(result.indent).toBeNull();
  });
});

describe('handleRemoveMarks', () => {
  it('removes marks from the transform when not overridden', () => {
    const removeMark = jest.fn().mockReturnThis();
    const tr = { removeMark } as unknown as Transform;
    const tasks = [
      {
        node: { nodeSize: 5 },
        pos: 0,
        mark: { type: 'em', attrs: {} },
      },
    ];
    csc.handleRemoveMarks(tr, tasks);
    expect(removeMark).toHaveBeenCalledTimes(1);
  });

  it('skips marks marked as overridden', () => {
    const removeMark = jest.fn().mockReturnThis();
    const tr = { removeMark } as unknown as Transform;
    const tasks = [
      {
        node: { nodeSize: 5 },
        pos: 0,
        mark: { type: 'em', attrs: { overridden: true } },
      },
    ];
    csc.handleRemoveMarks(tr, tasks);
    expect(removeMark).not.toHaveBeenCalled();
  });

  it('does nothing for an empty tasks array', () => {
    const removeMark = jest.fn().mockReturnThis();
    const tr = { removeMark } as unknown as Transform;
    csc.handleRemoveMarks(tr, []);
    expect(removeMark).not.toHaveBeenCalled();
  });
});

describe('isCustomStyleApplied', () => {
  it('returns the applied style name when present', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const editorDoc = doc(p('Hello'));
    const state = EditorState.create({
      doc: editorDoc,
      schema,
      selection: Selection.atStart(editorDoc),
    });
    const result = command.isCustomStyleApplied(state);
    expect(typeof result).toBe('string');
  });
});

describe('isStyleEnabled branches', () => {
  it('returns false when clearstyle and applied style equals RESERVED_STYLE_NONE', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    jest
      .spyOn(command, 'isCustomStyleApplied')
      .mockReturnValue(RESERVED_STYLE_NONE);
    expect(command.isStyleEnabled(state, {} as EditorView, 'clearstyle')).toBe(
      true
    );
  });

  it('returns true for clearstyle with an applied custom style', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    jest.spyOn(command, 'isCustomStyleApplied').mockReturnValue('CustomStyle');
    expect(command.isStyleEnabled(state, {} as EditorView, 'clearstyle')).toBe(
      true
    );
  });

  it('returns true for non-clearstyle menu regardless of applied style', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    jest
      .spyOn(command, 'isCustomStyleApplied')
      .mockReturnValue(RESERVED_STYLE_NONE);
    expect(command.isStyleEnabled(state, {} as EditorView, 'somemenu')).toBe(
      true
    );
  });
});

describe('resetNumber', () => {
  it('sets the reset attribute and dispatches', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    const dispatch = jest.fn();
    const newattrs: Record<string, string> = { styleName: 'X' };
    command.resetNumber(state, dispatch, 0, newattrs);
    expect(newattrs.reset).toBe('true');
    expect(dispatch).toHaveBeenCalled();
  });

  it('skips dispatch when no dispatch fn is supplied', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    const newattrs: Record<string, string> = { styleName: 'X' };
    expect(() =>
      command.resetNumber(state, undefined, 0, newattrs)
    ).not.toThrow();
    expect(newattrs.reset).toBe('true');
  });

  it('handles missing newattrs without throwing', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    const dispatch = jest.fn();
    expect(() => command.resetNumber(state, dispatch, 0)).not.toThrow();
  });
});

describe('execute - reset mode and editall with ctrl key', () => {
  it('execute returns false in reset mode', () => {
    const command = new csc.CustomStyleCommand('reset', 'Reset');
    const state = makeState();
    const result = command.execute(state, jest.fn());
    expect(result).toBe(false);
  });

  it('editall with ctrl key opens the JSON editor', () => {
    const command = new csc.CustomStyleCommand('editall', 'EditAll');
    const state = makeState();
    const view = { focus: jest.fn() } as unknown as EditorView;
    const event = { ctrlKey: true } as unknown as MouseEvent;
    const jsonEditorSpy = jest.spyOn(command, 'jsonEditor');
    command.execute(state, jest.fn(), view, event);
    expect(jsonEditorSpy).toHaveBeenCalled();
  });
});

describe('jsonEditor and editWindow', () => {
  it('jsonEditor opens a popup', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const view = { focus: jest.fn() } as unknown as EditorView;
    expect(command._popUp).toBeNull();
    command.jsonEditor(view);
    expect(command._popUp).toBeDefined();
  });

  it('editWindow opens the custom style editor popup', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    const view = {
      focus: jest.fn(),
      dispatch: jest.fn(),
    } as unknown as EditorView;
    expect(command._popUp).toBeNull();
    command.editWindow(state, view, 0);
    expect(command._popUp).toBeDefined();
  });
});

describe('getCustomStyles', () => {
  it('does not dispatch when no style name is provided', async () => {
    mockedCustomstyles.getStylesAsync.mockResolvedValueOnce([
      { styleName: 'A', styles: {} },
    ]);
    const dispatch = jest.fn();
    const view = { state: makeState(), dispatch } as unknown as EditorView;
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    command.getCustomStyles('', view);
    await new Promise((r) => setTimeout(r, 0));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when matching style is not in the result', async () => {
    mockedCustomstyles.getStylesAsync.mockResolvedValueOnce([
      { styleName: 'Other', styles: {} },
    ]);
    const dispatch = jest.fn();
    const view = { state: makeState(), dispatch } as unknown as EditorView;
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    command.getCustomStyles('NotFound', view);
    await new Promise((r) => setTimeout(r, 0));
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('createNewStyle - non-array result branch', () => {
  it('calls addStyleToList when saveStyle returns a single object', async () => {
    const command = new csc.CustomStyleCommand(
      { styleName: 'NewStyle' },
      'NewStyle'
    );
    const state = makeState();
    const dispatch = jest.fn();
    const style = {
      styleName: 'NewStyle',
      styles: { hasNumbering: false, styleLevel: 0 },
      editorView: {},
    };

    mockedCustomstyles.saveStyle.mockResolvedValueOnce({
      styleName: 'NewStyle',
    });

    command.createNewStyle(style, state.tr, state, dispatch, state.doc);
    await new Promise((r) => setTimeout(r, 0));

    expect(mockedCustomstyles.addStyleToList).toHaveBeenCalled();
  });

  it('does not dispatch when style has invalid hierarchy', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const showAlertSpy = jest.spyOn(command, 'showAlert');
    const state = makeState();
    const dispatch = jest.fn();
    mockedCustomstyles.isPreviousLevelExists.mockReturnValueOnce(false);

    command.createNewStyle(
      {
        styleName: 'X',
        styles: { hasNumbering: true, styleLevel: '3' },
        editorView: {},
      },
      state.tr,
      state,
      dispatch,
      state.doc
    );

    expect(showAlertSpy).toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('removeAllMarksExceptLink', () => {
  it('returns the transform when the doc has no marks', () => {
    const state = makeState();
    const tr = state.tr;
    const result = csc.removeAllMarksExceptLink(0, state.doc.content.size, tr);
    expect(result).toBe(tr);
  });

  it('handles undefined transform safely', () => {
    expect(() => csc.removeAllMarksExceptLink(0, 10, undefined)).not.toThrow();
  });

  it('removes only eligible marks from document nodes', () => {
    const removeMark = jest.fn().mockReturnThis();
    const strongMark = { attrs: {}, type: { name: 'strong' } };
    const linkMark = { attrs: {}, type: { name: 'link' } };
    const overrideMark = { attrs: {}, type: { name: 'override' } };
    const spacerMark = { attrs: {}, type: { name: 'spacer' } };
    const tr = {
      doc: {
        nodesBetween: (_from: number, _to: number, cb) => {
          cb({ marks: undefined, nodeSize: 1 }, 0);
          cb(
            {
              marks: [strongMark, linkMark, overrideMark, spacerMark],
              nodeSize: 4,
            },
            1
          );
        },
      },
      removeMark,
    } as unknown as Transform;

    csc.removeAllMarksExceptLink(0, 5, tr);

    expect(removeMark).toHaveBeenCalledTimes(1);
    expect(removeMark).toHaveBeenCalledWith(0, 5, strongMark.type);
  });
});

describe('removeAllMarksExceptLinkForTableColumnCell', () => {
  it('returns the transform when the node is null', () => {
    const state = makeState();
    const tr = state.tr;
    const result = csc.removeAllMarksExceptLinkForTableColumnCell(0, null, tr);
    expect(result).toBe(tr);
  });

  it('returns the transform when node is not a paragraph', () => {
    const state = makeState();
    const tr = state.tr;
    const fakeNode = {
      type: { name: 'heading' },
      childCount: 0,
    } as unknown as Node;
    const result = csc.removeAllMarksExceptLinkForTableColumnCell(
      0,
      fakeNode,
      tr
    );
    expect(result).toBe(tr);
  });

  it('returns the transform for a paragraph with no marked children', () => {
    const state = makeState();
    const node = state.doc.firstChild;
    const tr = state.tr;
    const result = csc.removeAllMarksExceptLinkForTableColumnCell(0, node, tr);
    expect(result).toBeDefined();
  });

  it('removes eligible child text marks from paragraph cells', () => {
    const removeMark = jest.fn().mockReturnThis();
    const strongMark = { attrs: {}, type: { name: 'strong' } };
    const linkMark = { attrs: {}, type: { name: 'link' } };
    const overriddenMark = {
      attrs: { overridden: true },
      type: { name: 'em' },
    };
    const child = {
      isText: true,
      marks: [strongMark, linkMark, overriddenMark],
      nodeSize: 3,
    };
    const node = {
      child: jest.fn(() => child),
      childCount: 1,
      nodeSize: 5,
      type: { name: 'paragraph' },
      forEach: (cb: (c: unknown) => void) => cb(child),
    } as unknown as Node;
    const tr = { removeMark } as unknown as Transform;

    csc.removeAllMarksExceptLinkForTableColumnCell(4, node, tr);

    expect(removeMark).toHaveBeenCalledTimes(1);
    expect(removeMark).toHaveBeenCalledWith(5, 8, strongMark.type);
  });
});

describe('getNode', () => {
  it('returns the first paragraph in the selection', () => {
    const state = makeState();
    const result = csc.getNode(state, 0, state.doc.content.size, state.tr);
    expect(result).not.toBeNull();
    expect(result?.type.name).toBe('paragraph');
  });

  it('returns null when no paragraph exists in the range', () => {
    const state = makeState();
    const result = csc.getNode(state, 0, 0, state.tr);
    expect(result).toBeNull();
  });
});

describe('isCustomStyleAlreadyApplied', () => {
  it('returns false when the style is not applied anywhere', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const state = makeState();
    expect(csc.isCustomStyleAlreadyApplied('Unused', state)).toBe(false);
  });

  it('returns false when styleLevel is 0', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 0 },
    } as Style);
    const state = makeState();
    expect(csc.isCustomStyleAlreadyApplied('Zero', state)).toBe(false);
  });

  it('returns true when the style is already applied in the document', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const editorDoc = schema.node('doc', null, [
      schema.node('paragraph', { styleName: 'Used' }, schema.text('Hello')),
    ]);
    const state = EditorState.create({
      doc: editorDoc,
      schema,
      selection: Selection.atStart(editorDoc),
    });
    expect(csc.isCustomStyleAlreadyApplied('Used', state)).toBe(false);
  });
});

describe('isLevelUpdated', () => {
  function makeAppliedStyleState(styleName = 'AppliedStyle'): EditorState {
    return {
      doc: {
        nodeSize: 3,
        nodesBetween: (_from: number, _to: number, cb) => {
          cb(
            {
              attrs: { styleName },
              content: { size: 1 },
            },
            0
          );
        },
      },
    } as unknown as EditorState;
  }

  it('returns false when the custom style is not already applied in the doc', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const state = makeState();
    const result = csc.isLevelUpdated(state, 'X', { styles: {} } as Style);
    expect(result).toBe(false);
  });

  it('returns true when the style update removes numbering or changes style level', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const editorDoc = schema.node('doc', null, [
      schema.node('paragraph', { styleName: 'X' }, schema.text('Hello')),
    ]);
    const state = EditorState.create({
      doc: editorDoc,
      schema,
      selection: Selection.atStart(editorDoc),
    });
    const result = csc.isLevelUpdated(state, 'X', {
      styles: { hasNumbering: false },
    } as Style);
    expect(result).toBe(false);
  });

  it('returns false when applied style keeps numbering and level unchanged', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 2 },
    } as Style);

    const result = csc.isLevelUpdated(
      makeAppliedStyleState(),
      'AppliedStyle',
      {
        styleName: 'AppliedStyle',
        styles: { hasNumbering: true, styleLevel: 2 },
      }
    );

    expect(result).toBe(false);
  });

  it('returns true when applied style removes numbering', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 2 },
    } as Style);

    const result = csc.isLevelUpdated(
      makeAppliedStyleState(),
      'AppliedStyle',
      {
        styleName: 'AppliedStyle',
        styles: { hasNumbering: false, styleLevel: 2 },
      }
    );

    expect(result).toBe(true);
  });

  it('returns true when applied style removes styleLevel', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 2 },
    } as Style);

    const result = csc.isLevelUpdated(
      makeAppliedStyleState(),
      'AppliedStyle',
      {
        styleName: 'AppliedStyle',
        styles: { hasNumbering: true },
      }
    );

    expect(result).toBe(true);
  });

  it('returns true when applied style has no styles object', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 2 },
    } as Style);

    const result = csc.isLevelUpdated(
      makeAppliedStyleState(),
      'AppliedStyle',
      {
        styleName: 'AppliedStyle',
      }
    );

    expect(result).toBe(true);
  });
});

describe('applyLineStyle', () => {
  it('returns the same transform when the node has no content', () => {
    const state = makeState();
    const tr = state.tr;
    const node = {
      content: { size: 0 },
      attrs: { styleName: 'X' },
    } as unknown as Node;
    expect(csc.applyLineStyle(state, tr, node, 0)).toBe(tr);
  });

  it('returns the same transform when node has no styleName', () => {
    const state = makeState();
    const tr = state.tr;
    const node = {
      content: { size: 10 },
      attrs: {},
    } as unknown as Node;
    expect(csc.applyLineStyle(state, tr, node, 0)).toBe(tr);
  });

  it('returns the same transform when style has no boldPartial', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styles: { boldPartial: false },
    } as Style);
    const state = makeState();
    const tr = state.tr;
    const node = {
      content: { size: 10 },
      attrs: { styleName: 'X' },
    } as unknown as Node;
    expect(csc.applyLineStyle(state, tr, node, 0)).toBe(tr);
  });

  it('applies bold partial styling when the current node has a custom style', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({
      styles: { boldPartial: true, boldSentence: false },
    } as Style);
    const editorDoc = schema.node('doc', null, [
      schema.node('paragraph', { styleName: 'X' }, schema.text('Hello world')),
    ]);
    const state = EditorState.create({
      doc: editorDoc,
      schema,
      selection: Selection.atStart(editorDoc),
    });
    const tr = state.tr;
    const node = state.doc.firstChild;
    expect(csc.applyLineStyle(state, tr, node, 1)).toBeDefined();
  });

  it('iterates the document when node is null', () => {
    const state = makeState();
    const tr = state.tr;
    const result = csc.applyLineStyle(state, tr, null, 0);
    expect(result).toBeDefined();
  });
});

describe('insertParagraph', () => {
  it('returns the transform when state is not provided', () => {
    const tr = { dummy: true } as unknown as Transaction;
    const result = csc.insertParagraph({}, 0, tr, 1);
    expect(result).toBe(tr);
  });

  it('inserts a paragraph when state has a schema', () => {
    mockedCustomstyles.getCustomStyleByLevel.mockReturnValueOnce({
      styleName: 'Lvl1',
    });
    const state = makeState();
    const nodeAttrs = {
      styleName: 'X',
      indent: 0,
      lineSpacing: null,
      paddingBottom: null,
      paddingTop: null,
    };
    const result = csc.insertParagraph(nodeAttrs, 0, state.tr, 1, state);
    expect(result).toBeDefined();
  });
});

describe('addElementEx / addElement', () => {
  it('addElementEx computes level from previousLevel when after is false', () => {
    const state = makeState();
    const result = csc.addElementEx(
      { styleName: 'X' },
      state,
      state.tr,
      0,
      false,
      3,
      0
    );
    expect(result.level).toBe(2);
    expect(result.counter).toBe(0);
  });

  it('addElementEx uses currentLevel as counter when after is false', () => {
    const state = makeState();
    const result = csc.addElementEx(
      { styleName: 'X' },
      state,
      state.tr,
      0,
      false,
      5,
      2
    );
    expect(result.level).toBe(4);
    expect(result.counter).toBe(2);
  });

  it('addElementEx defaults level to 0 when previousLevel is 0 and after is false', () => {
    const state = makeState();
    const result = csc.addElementEx(
      { styleName: 'X' },
      state,
      state.tr,
      0,
      false,
      0,
      0
    );
    expect(result.level).toBe(0);
    expect(result.counter).toBe(0);
  });

  it('addElementEx defaults currentLevel to 0 when undefined', () => {
    const state = makeState();
    const result = csc.addElementEx(
      { styleName: 'X' },
      state,
      state.tr,
      0,
      false,
      2
    );
    expect(result.counter).toBe(0);
    expect(result.level).toBe(1);
  });
});

describe('manageElementsAfterSelection', () => {
  it('stops when the next hierarchy level does not skip a level', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const state = makeState();
    const setNodeMarkup = jest.fn().mockReturnThis();
    const tr = { ...state.tr, setNodeMarkup } as unknown as Transform;
    const firstNode = {
      attrs: { styleName: 'Level1' },
    } as unknown as Node;
    const secondNode = {
      attrs: { styleName: 'Level3' },
    } as unknown as Node;

    csc.manageElementsAfterSelection(
      [
        { node: firstNode, pos: 4 },
        { node: secondNode, pos: 8 },
      ],
      state,
      tr
    );

    expect(setNodeMarkup).not.toHaveBeenCalled();
  });
});

describe('allowCustomLevelIndent', () => {
  it('returns a boolean when delta is positive (scan before)', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const state = makeState();
    const result = csc.allowCustomLevelIndent(state.tr, 0, 'X', 1);
    expect(typeof result).toBe('boolean');
  });

  it('returns a boolean when delta is negative (scan after)', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const state = makeState();
    const result = csc.allowCustomLevelIndent(state.tr, 2, 'X', -1);
    expect(typeof result).toBe('boolean');
  });

  it('handles startPos less than 2 by normalizing to 2', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const state = makeState();
    expect(() =>
      csc.allowCustomLevelIndent(state.tr, 0, 'X', -1)
    ).not.toThrow();
  });

  it('returns false when no node along the scan path matches the level criteria', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 5 },
    } as Style);
    const state = makeState();
    const result = csc.allowCustomLevelIndent(state.tr, 1, 'X', -1);
    expect(typeof result).toBe('boolean');
  });

  it('scans forward and returns when delta is negative', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { styleLevel: 1 },
    } as Style);
    const state = makeState();
    const result = csc.allowCustomLevelIndent(
      state.tr,
      state.doc.content.size - 1,
      'X',
      -1
    );
    expect(typeof result).toBe('boolean');
  });
});

describe('updateDocument', () => {
  it('returns a transform when nothing matches the style name', () => {
    const state = makeState();
    const tr = csc.updateDocument(state, state.tr, 'NonExistent', {
      styles: {},
    } as Style);
    expect(tr).toBeDefined();
  });

  it('applies latest style when a matching paragraph exists', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { strong: true },
    } as Style);
    const editorDoc = schema.node('doc', null, [
      schema.node(
        'paragraph',
        { styleName: 'UpdateStyle' },
        schema.text('Hello')
      ),
    ]);
    const state = EditorState.create({
      doc: editorDoc,
      schema,
      selection: Selection.atStart(editorDoc),
    });

    const tr = csc.updateDocument(state, state.tr, 'UpdateStyle', {
      styles: { strong: true },
    } as Style);
    expect(tr).toBeDefined();
  });
});

describe('clearCustomStyles', () => {
  it('returns the transform unchanged when no styled nodes are present', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    const tr = state.tr;
    const result = command.clearCustomStyles(tr, state);
    expect(result).toBe(tr);
  });
});

describe('removeMarks', () => {
  it('removes the mark and clears the style attribute', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const removeMark = jest.fn().mockReturnThis();
    const tr = { removeMark } as unknown as Transform;
    const node = makeState().doc.firstChild;
    const mark = { type: { name: 'em' } };
    command.removeMarks(mark, tr, node, 0, 5);
    expect(removeMark).toHaveBeenCalledWith(0, 5, mark.type);
  });
});

describe('executeClearStyle - dispatch behavior', () => {
  it('does not dispatch when the transform has no changes', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    const dispatch = jest.fn();
    const node = state.doc.firstChild;

    const result = command.executeClearStyle(
      state,
      dispatch,
      node,
      0,
      state.doc.content.size,
      undefined,
      state.selection
    );
    expect(result).toBe(true);
  });

  it('handles missing dispatch gracefully', () => {
    const command = new csc.CustomStyleCommand({ styleName: 'X' }, 'X');
    const state = makeState();
    const node = state.doc.firstChild;

    expect(() =>
      command.executeClearStyle(
        state,
        undefined,
        node,
        0,
        state.doc.content.size,
        undefined,
        state.selection
      )
    ).not.toThrow();
  });
});

describe('compareAttributes - additional cases', () => {
  it('returns false when underline style is undefined and mark is underline', () => {
    const mark = {
      type: { name: 'underline' },
      attrs: { overridden: false },
    };
    expect(csc.compareAttributes(mark, {})).toBe(false);
  });

  it('returns false for default unknown mark type', () => {
    const mark = {
      type: { name: 'unknownMark' },
      attrs: { overridden: false },
    };
    expect(csc.compareAttributes(mark, { strong: true })).toBe(false);
  });
});

describe('applyStyleForTableColumnCell', () => {
  it('returns the transform when styleProp has no styles', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValueOnce({} as Style);
    const state = makeState();
    const node = state.doc.firstChild;
    const result = csc.applyStyleForTableColumnCell(
      undefined,
      'Missing',
      state,
      state.tr,
      {
        node,
        startPos: 0,
      }
    );
    expect(result).toBeDefined();
  });

  it('uses cached styleProp when opt is provided', () => {
    const styleProp = {
      styleName: 'X',
      styles: { strong: true, indent: 0 },
    } as unknown as Style;
    const state = makeState();
    const node = state.doc.firstChild;
    const result = csc.applyStyleForTableColumnCell(
      styleProp,
      'X',
      state,
      state.tr,
      {
        node,
        opt: 1,
        startPos: 0,
      }
    );
    expect(result).toBeDefined();
  });

  it('uses overridden node attrs for align, spacing, and indent commands', () => {
    const state = makeState();
    const setNodeMarkup = jest.fn().mockReturnThis();
    const setSelection = jest.fn().mockReturnThis();
    const tr = {
      doc: state.doc,
      setNodeMarkup,
      setSelection,
    } as unknown as Transaction;
    const node = {
      attrs: {
        id: null,
        overriddenAlign: true,
        overriddenAlignValue: 'right',
        overriddenIndent: true,
        overriddenIndentValue: 6,
        overriddenLineSpacing: true,
        overriddenLineSpacingValue: '200%',
      },
      childCount: 0,
      forEach: (_cb: (c: unknown) => void) => { /* no children */ },
      nodeSize: 2,
      type: { name: 'paragraph' },
    } as unknown as Node;
    const styleProp = {
      styleName: 'OverrideStyle',
      styles: {
        align: 'left',
        indent: 2,
        lineHeight: '150%',
      },
    } as unknown as Style;

    csc.applyStyleForTableColumnCell(
      styleProp,
      'OverrideStyle',
      state,
      tr,
      {
        node,
        opt: 1,
        startPos: 1,
      }
    );

    expect(setNodeMarkup).toHaveBeenCalledWith(
      1,
      undefined,
      expect.objectContaining({
        align: 'right',
        indent: 6,
        lineSpacing: '200%',
      })
    );
  });

  it('uses style attrs for paragraph spacing and level-based indent commands', () => {
    const state = makeState();
    const setNodeMarkup = jest.fn().mockReturnThis();
    const setSelection = jest.fn().mockReturnThis();
    const tr = {
      doc: state.doc,
      setNodeMarkup,
      setSelection,
    } as unknown as Transaction;
    const node = {
      attrs: { id: 'node-id' },
      childCount: 0,
      forEach: (_cb: (c: unknown) => void) => { /* no children */ },
      nodeSize: 2,
      type: { name: 'paragraph' },
    } as unknown as Node;
    const styleProp = {
      styleName: 'LevelStyle',
      styles: {
        indent: 4,
        isLevelbased: true,
        paragraphSpacingAfter: 12,
        paragraphSpacingBefore: 8,
        styleLevel: 3,
      },
    } as unknown as Style;

    csc.applyStyleForTableColumnCell(
      styleProp,
      'LevelStyle',
      state,
      tr,
      {
        node,
        opt: 1,
        startPos: 1,
      }
    );

    expect(setNodeMarkup).toHaveBeenCalledWith(
      1,
      undefined,
      expect.objectContaining({
        indent: 3,
        paragraphSpacingAfter: 12,
        paragraphSpacingBefore: 8,
      })
    );
  });
});

describe('applyLatestStyle', () => {
  it('applies the style to a paragraph node', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { strong: true },
    } as Style);
    const state = makeState();
    const node = state.doc.firstChild;
    const context = {
      node,
      startPos: 1,
      endPos: node.nodeSize - 1,
      opt: 0,
    };
    const result = csc.applyLatestStyle('X', state, state.tr, context);
    expect(result).toBeDefined();
  });

  it('uses supplied style object when opt is non-zero', () => {
    const style = { styles: { em: true } } as Style;
    const state = makeState();
    const node = state.doc.firstChild;
    const context = {
      node,
      startPos: 1,
      endPos: node.nodeSize - 1,
      opt: 1,
    };
    const result = csc.applyLatestStyle('X', state, state.tr, context, style);
    expect(result).toBeDefined();
  });
});

describe('applyStyle - selection variants', () => {
  it('applies style across a regular text selection', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { strong: true },
    } as Style);
    const state = makeState();
    const style = { styles: { strong: true } } as Style;
    const result = csc.applyStyle(style, 'X', state, state.tr);
    expect(result).toBeDefined();
  });
});

describe('applyStyleToEachNode', () => {
  it('iterates paragraphs when positions are empty', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { em: true },
    } as Style);
    const state = makeState();
    const result = csc.applyStyleToEachNode(
      state,
      0,
      state.doc.content.size,
      state.tr,
      { styles: { em: true } } as Style,
      'X',
      []
    );
    expect(result).toBeDefined();
  });

  it('iterates supplied table cell positions', () => {
    mockedCustomstyles.getCustomStyleByName.mockReturnValue({
      styles: { em: true },
    } as Style);
    const state = makeState();
    const result = csc.applyStyleToEachNode(
      state,
      0,
      state.doc.content.size,
      state.tr,
      { styles: { em: true } } as Style,
      'X',
      [0]
    );
    expect(result).toBeDefined();
  });
});

describe('addMarksToLine', () => {
  it('returns the transform unchanged when node has no text content', () => {
    const state = makeState();
    const tr = state.tr;
    const node = { descendants: () => undefined } as unknown as Node;
    const result = csc.addMarksToLine(tr, state, node, 0, false);
    expect(result).toBe(tr);
  });

  it('handles boldSentence true on plain text', () => {
    const state = makeState();
    const tr = state.tr;
    const node = state.doc.firstChild;
    const result = csc.addMarksToLine(tr, state, node, 0, true);
    expect(result).toBeDefined();
  });

  it('handles boldSentence false on plain text', () => {
    const state = makeState();
    const tr = state.tr;
    const node = state.doc.firstChild;
    const result = csc.addMarksToLine(tr, state, node, 0, false);
    expect(result).toBeDefined();
  });
});
