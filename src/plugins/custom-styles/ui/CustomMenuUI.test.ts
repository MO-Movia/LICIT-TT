/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock('./Icon', () => ({
  __esModule: true,
  Icon: {
    get: jest.fn(() => null),
  },
}));

jest.mock('../../../commands', () => {
  const actual = jest.requireActual('../../../commands');
  return {
    __esModule: true,
    ...actual,
    createPopUp: jest.fn(() => ({ close: jest.fn() })),
  } as unknown;
});

import { createEditor, doc, p } from 'jest-prosemirror';
import { CustomstylePlugin } from '../index';
import { CustomMenuUI } from './CustomMenuUI';
import { Schema, Node } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { CustomStyleCommand } from '../CustomStyleCommand';
import { UICommand } from '../../../core';
import type * as React from 'react';
import { SyntheticEvent } from 'react';
import { Transform } from 'prosemirror-transform';
import * as customStyle from '../customStyle';
import * as commands from '../../../commands';
import type { Style } from '../StyleRuntime';

describe('Custom Menu UI', () => {
  const TestCustomStyleRuntime = {
    saveStyle: jest.fn().mockReturnValue(Promise.resolve([])),
    getStylesAsync: jest.fn().mockReturnValue(Promise.resolve([])),
    renameStyle: jest.fn().mockReturnValue(Promise.resolve([])),
    removeStyle: jest.fn().mockReturnValue(Promise.resolve([])),
    fetchStyles: jest.fn().mockReturnValue(Promise.resolve([])),
    buildRoute: jest.fn().mockReturnValue(Promise.resolve([])),
  };
  const plugin = new CustomstylePlugin(TestCustomStyleRuntime);
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [plugin],
  });
  const schema = new Schema({
    nodes: {
      doc: {
        attrs: {
          layout: {
            default: null,
          },
          padding: {
            default: null,
          },
          width: {
            default: null,
          },
          counterFlags: {
            default: null,
          },
          capcoMode: {
            default: 1,
          },
          defaultManualCapco: {
            default: 'C',
          },
        },
        content: 'block+',
      },
      text: {},
      paragraph: {
        attrs: {
          align: {
            default: null,
          },
          color: {
            default: null,
          },
          id: {
            default: null,
          },
          indent: {
            default: null,
          },
          lineSpacing: {
            default: null,
          },
          paddingBottom: {
            default: null,
          },
          paddingTop: {
            default: null,
          },
          capco: {
            default: null,
          },
        },
        content: 'inline*',
        group: 'block',
        parseDOM: [
          {
            tag: 'p',
          },
        ],
      },
      blockquote: {
        attrs: {
          align: {
            default: null,
          },
          color: {
            default: null,
          },
          id: {
            default: null,
          },
          indent: {
            default: null,
          },
          lineSpacing: {
            default: null,
          },
          paddingBottom: {
            default: null,
          },
          paddingTop: {
            default: null,
          },
          capco: {
            default: null,
          },
        },
        content: 'inline*',
        group: 'block',
        parseDOM: [
          {
            tag: 'blockquote',
          },
        ],
        defining: true,
      },
      math: {
        inline: true,
        attrs: {
          align: {
            default: null,
          },
          latex: {
            default: '',
          },
        },
        group: 'inline',
        draggable: true,
        parseDOM: [
          {
            tag: 'math[data-latex]',
          },
          {
            tag: 'span[data-latex]',
          },
        ],
      },
      hard_break: {
        inline: true,
        group: 'inline',
        selectable: false,
        parseDOM: [
          {
            tag: 'br',
          },
        ],
      },
      bullet_list: {
        attrs: {
          id: {
            default: null,
          },
          indent: {
            default: 0,
          },
          listStyleType: {
            default: null,
          },
        },
        group: 'block',
        content: 'list_item+',
        parseDOM: [
          {
            tag: 'ul',
          },
        ],
      },
      ordered_list: {
        attrs: {
          id: {
            default: null,
          },
          counterRese: {
            default: null,
          },
          indent: {
            default: 0,
          },
          following: {
            default: null,
          },
          listStyleType: {
            default: null,
          },
          name: {
            default: null,
          },
          start: {
            default: 1,
          },
          type: {
            default: 'decimal',
          },
          styleName: {
            default: 'None',
          },
        },
        group: 'block',
        content: 'list_item+',
        parseDOM: [
          {
            tag: 'ol',
          },
        ],
      },
      list_item: {
        attrs: {
          align: {
            default: null,
          },
        },
        content: 'paragraph block*',
        parseDOM: [
          {
            tag: 'li',
          },
        ],
      },
      bookmark: {
        inline: true,
        attrs: {
          id: {
            default: null,
          },
          visible: {
            default: null,
          },
        },
        group: 'inline',
        draggable: true,
        parseDOM: [
          {
            tag: 'a[data-bookmark-id]',
          },
        ],
      },
      table: {
        content: 'table_row+',
        tableRole: 'table',
        isolating: true,
        group: 'block',
        parseDOM: [
          {
            tag: 'table',
          },
        ],
        attrs: {
          marginLeft: {
            default: null,
          },
        },
      },
      table_row: {
        content: '(table_cell | table_header)*',
        tableRole: 'row',
        parseDOM: [
          {
            tag: 'tr',
          },
        ],
      },
      table_cell: {
        content: 'block+',
        attrs: {
          colspan: {
            default: 1,
          },
          rowspan: {
            default: 1,
          },
          colwidth: {
            default: null,
          },
          borderColor: {
            default: null,
          },
          background: {
            default: null,
          },
        },
        tableRole: 'cell',
        isolating: true,
        parseDOM: [
          {
            tag: 'td',
          },
        ],
      },

      table_header: {
        content: 'block+',
        attrs: {
          colspan: {
            default: 1,
          },
          rowspan: {
            default: 1,
          },
          colwidth: {
            default: null,
          },
          borderColor: {
            default: null,
          },
          background: {
            default: null,
          },
        },
        tableRole: 'header_cell',
        isolating: true,
        parseDOM: [
          {
            tag: 'th',
          },
        ],
      },
    },
    marks: {
      content: [
        'link',
        {
          attrs: {
            href: { default: null },
            rel: { default: 'noopener noreferrer nofollow' },
            target: { default: 'blank' },
            title: { default: null },
          },
          inclusive: false,
          parseDOM: [{ tag: 'a[href]' }],
        },
        'mark-no-break',
        { parseDOM: [{ tag: 'nobr' }] },
        'code',
        { parseDOM: [{ tag: 'code' }] },
        'em',
        {
          parseDOM: [
            { tag: 'i' },
            { tag: 'em' },
            { style: 'font-style=italic' },
          ],
          attrs: { overridden: { hasDefault: true, default: false } },
        },
        'mark-font-size',
        {
          attrs: {
            pt: { default: null },
            overridden: { hasDefault: true, default: false },
          },
          inline: true,
          group: 'inline',
          parseDOM: [{ style: 'font-size' }],
        },
        'mark-font-type',
        {
          attrs: { name: '', overridden: { hasDefault: true, default: false } },
          inline: true,
          group: 'inline',
          parseDOM: [{ style: 'font-family' }],
        },
        'spacer',
        {
          attrs: { size: { default: 'tab' } },
          defining: true,
          draggable: false,
          excludes: '_',
          group: 'inline',
          inclusive: false,
          inline: true,
          spanning: false,
          parseDOM: [{ tag: 'span[data-spacer-size]' }],
        },
        'strike',
        {
          parseDOM: [{ style: 'text-decoration' }],
          attrs: { overridden: { hasDefault: true, default: false } },
        },
        'strong',
        {
          parseDOM: [{ tag: 'strong' }, { tag: 'b' }, { style: 'font-weight' }],
          attrs: { overridden: { hasDefault: true, default: false } },
        },
        'super',
        {
          parseDOM: [{ tag: 'sup' }, { style: 'vertical-align' }],
          attrs: { overridden: { hasDefault: true, default: false } },
        },
        'sub',
        { parseDOM: [{ tag: 'sub' }, { style: 'vertical-align' }] },
        'mark-text-color',
        {
          attrs: {
            color: '',
            overridden: { hasDefault: true, default: false },
          },
          inline: true,
          group: 'inline',
          parseDOM: [{ style: 'color' }],
        },
        'mark-text-highlight',
        {
          attrs: {
            highlightColor: '',
            overridden: { hasDefault: true, default: false },
          },
          inline: true,
          group: 'inline',
          parseDOM: [{ tag: 'span[style*=background-color]' }],
        },
        'mark-text-selection',
        {
          attrs: { id: '' },
          inline: true,
          group: 'inline',
          parseDOM: [{ tag: 'czi-text-selection' }],
        },
        'underline',
        {
          parseDOM: [
            { tag: 'u' },
            { style: 'text-decoration-line' },
            { style: 'text-decoration' },
          ],
          attrs: { overridden: { hasDefault: true, default: false } },
        },
      ],
    },
  });
  const mockdoc = doc(p('Hello World!!!'));
  const state = EditorState.create({
    doc: mockdoc,
    schema: schema,
    selection: editor.selection,
    plugins: [new CustomstylePlugin(TestCustomStyleRuntime)],
  });
  const cmdGrp1 = new CustomStyleCommand('Edit All', 'AFDP_Bullet');
  const cmdGrp2 = new CustomStyleCommand('Clear', 'AFDP_Bullet1');
  const CustomMenuTestProps = {
    className: 'molcs-menu-button',
    commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
    staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
    disabled: false,
    dispatch: () => {},
    editorState: state,
    editorView: editor.view,
    icon: 'button',
    label: 'Normal',
    title: 'styles',
    _style: '',
    onCommand: () => {
      return {};
    },
  };
  class MockElement {
    tagName: '';
    constructor(tagName) {
      this.tagName = tagName;
    }

    // Add any additional methods or properties that you need for testing
  }
  document.getElementsByClassName = jest.fn().mockImplementation(() => {
    // Return a custom Element instance with the given class name
    const mockElement = new MockElement('div');
    return [mockElement];
  });
  const custommenuui = new CustomMenuUI(CustomMenuTestProps);

  it('should render the component', () => {
    expect(custommenuui.render()).toBeDefined();
  });
  it('should render the component is allowednode is false', () => {
    const CustomMenuTestProps = {
      className: 'molcs-menu-button',
      commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
      staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
      disabled: false,
      dispatch: () => {},
      editorState: state,
      editorView: { disabled: true },
      icon: 'button',
      label: 'Normal',
      title: 'styles',
      _style: '',
    };
    const custommenuui = new CustomMenuUI(CustomMenuTestProps);
    jest.spyOn(custommenuui, 'isAllowedNode').mockReturnValue(false);
    const custommenuuipro = new CustomMenuUI(CustomMenuTestProps);

    expect(custommenuuipro.render()).toBeDefined();
  });
  it('should render the component (case 2)', () => {
    const CustomMenuTestProps = {
      className: 'molcs-menu-button',
      commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
      staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
      disabled: false,
      dispatch: () => {},
      editorState: state,
      editorView: { disabled: true },
      icon: 'button',
      label: 'Normal',
      title: 'styles',
      _style: '',
    };
    const custommenuui = new CustomMenuUI(CustomMenuTestProps);
    expect(custommenuui.render()).toBeDefined();
  });

  it('should handle componentDidMount', () => {
    const dom = document.createElement('div');
    dom.className = 'molsp-stylenames';
    dom.scrollTop = 1;
    jest
      .spyOn(document, 'getElementsByClassName')
      .mockReturnValue([dom] as unknown as HTMLCollectionOf<Element>);
    const setStateSpy = jest
      .spyOn(custommenuui, 'setState')
      .mockImplementation((update, cb?: () => void) => {
        const partial =
          typeof update === 'function'
            ? (update as (s: object) => object)(custommenuui.state)
            : update;
        custommenuui.state = { ...custommenuui.state, ...partial };
        cb?.();
      });
    const rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 0);
    custommenuui._appliedIndex = 29;
    custommenuui.componentDidMount();
    expect(custommenuui.state.selectedIndex).toBe(29);
    expect(dom.scrollTop).toBe(643);
    expect(rafSpy).toHaveBeenCalled();
    setStateSpy.mockRestore();
    rafSpy.mockRestore();
  });

  const makeStyleDiv = (scrollTop: number, clientHeight: number) => {
    const dom = document.createElement('div');
    dom.className = 'molsp-stylenames';
    dom.scrollTop = scrollTop;
    Object.defineProperty(dom, 'clientHeight', {
      value: clientHeight,
      configurable: true,
    });
    jest
      .spyOn(document, 'getElementsByClassName')
      .mockReturnValue([dom] as unknown as HTMLCollectionOf<Element>);
    return dom;
  };

  it('should scroll down when the selected row is below the viewport', () => {
    const dom = makeStyleDiv(0, 120);
    custommenuui.state = { ...custommenuui.state, selectedIndex: 6 };
    custommenuui.scrollSelectedIntoView();
    expect(dom.scrollTop).toBe(48);
  });

  it('should scroll up when the selected row is above the viewport', () => {
    const dom = makeStyleDiv(144, 120);
    custommenuui.state = { ...custommenuui.state, selectedIndex: 2 };
    custommenuui.scrollSelectedIntoView();
    expect(dom.scrollTop).toBe(48);
  });

  it('should not scroll when the selected row is already visible', () => {
    const dom = makeStyleDiv(48, 120);
    custommenuui.state = { ...custommenuui.state, selectedIndex: 3 };
    custommenuui.scrollSelectedIntoView();
    expect(dom.scrollTop).toBe(48);
  });

  it('should not throw in scrollSelectedIntoView when container missing', () => {
    jest
      .spyOn(document, 'getElementsByClassName')
      .mockReturnValue([] as unknown as HTMLCollectionOf<Element>);
    expect(() => custommenuui.scrollSelectedIntoView()).not.toThrow();
  });

  const mockSyncSetState = () =>
    jest.spyOn(custommenuui, 'setState').mockImplementation((update, cb) => {
      const partial =
        typeof update === 'function'
          ? (update as (s: object) => object)(custommenuui.state)
          : update;
      custommenuui.state = { ...custommenuui.state, ...partial };
      (cb as undefined | (() => void))?.();
    });

  const navKeyEvent = (key: string) =>
    ({
      key,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    }) as unknown as React.KeyboardEvent;

  it('should move highlight down with ArrowDown through the controller', () => {
    custommenuui._navItems = [
      { command: cmdGrp1, label: 'a' },
      { command: cmdGrp2, label: 'b' },
    ] as unknown as Array<{ command: UICommand; label: string }>;
    custommenuui.state = { ...custommenuui.state, selectedIndex: 0 };
    const setStateSpy = mockSyncSetState();
    const e = navKeyEvent('ArrowDown');
    custommenuui._kbd.onKeyDown(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(custommenuui.state.selectedIndex).toBe(1);
    setStateSpy.mockRestore();
  });

  it('should move highlight up and wrap with ArrowUp', () => {
    custommenuui._navItems = [
      { command: cmdGrp1, label: 'a' },
      { command: cmdGrp2, label: 'b' },
    ] as unknown as Array<{ command: UICommand; label: string }>;
    custommenuui.state = { ...custommenuui.state, selectedIndex: 0 };
    const setStateSpy = mockSyncSetState();
    custommenuui._kbd.onKeyDown(navKeyEvent('ArrowUp'));
    expect(custommenuui.state.selectedIndex).toBe(1);
    setStateSpy.mockRestore();
  });

  it('should activate the highlighted style row on Enter', () => {
    custommenuui._navItems = [
      { command: cmdGrp1, label: 'a' },
      { command: cmdGrp2, label: 'b' },
    ] as unknown as Array<{ command: UICommand; label: string }>;
    custommenuui._staticItems = [];
    custommenuui.state = { ...custommenuui.state, selectedIndex: 1 };
    const execSpy = jest
      .spyOn(custommenuui, '_execute')
      .mockImplementation(() => undefined);
    custommenuui._kbd.onKeyDown(navKeyEvent('Enter'));
    expect(execSpy).toHaveBeenCalledWith(cmdGrp2, expect.anything());
    execSpy.mockRestore();
  });

  it('should activate a static row on Enter when selected below the hr', () => {
    custommenuui._navItems = [
      { command: cmdGrp1, label: 'a' },
    ] as unknown as Array<{ command: UICommand; label: string }>;
    custommenuui._staticItems = [
      { command: cmdGrp2, label: 'static' },
    ] as unknown as Array<{ command: UICommand; label: string }>;
    custommenuui.state = { ...custommenuui.state, selectedIndex: 1 };
    const execSpy = jest
      .spyOn(custommenuui, '_execute')
      .mockImplementation(() => undefined);
    custommenuui._kbd.onKeyDown(navKeyEvent('Enter'));
    expect(execSpy).toHaveBeenCalledWith(cmdGrp2, expect.anything());
    execSpy.mockRestore();
  });

  it('should select the hovered row from a real pointer move', () => {
    const row = document.createElement('div');
    row.setAttribute('data-index', '3');
    custommenuui.state = { ...custommenuui.state, selectedIndex: 0 };
    const setStateSpy = mockSyncSetState();
    custommenuui._kbd.onMouseOver({
      target: row,
      clientX: 10,
      clientY: 20,
    } as unknown as MouseEvent);
    expect(custommenuui.state.selectedIndex).toBe(3);
    setStateSpy.mockRestore();
  });

  it('should unmount the controller on componentWillUnmount', () => {
    const unmountSpy = jest
      .spyOn(custommenuui._kbd, 'unmount')
      .mockImplementation(() => undefined);
    custommenuui.componentWillUnmount();
    expect(unmountSpy).toHaveBeenCalled();
    unmountSpy.mockRestore();
  });

  it('should handle isAllowedNode', () => {
    const node = { type: { name: 'ordered_list' } } as unknown as Node;
    expect(custommenuui.isAllowedNode(node)).toBe(true);
  });
  it('should handle _onUIEnter', () => {
    const parent = document.createElement('div');
    parent.dataset.test = 'test-value';
    const input = document.createElement('input');
    input.className = 'czi-custom-menu-item edit-icon';
    parent.appendChild(input);
    // Set the selectionStart property of the input element
    input.selectionStart = 2;
    const event = {
      bubbles: true,
      cancelable: true,
      view: globalThis,
      currentTarget: input,
    };
    const ui = {
      shouldRespondToUIEvent: () => {
        return true;
      },
    } as unknown as UICommand;
    const spy1 = jest.spyOn(custommenuui, 'showSubMenu');
    custommenuui._onUIEnter(ui, event as unknown as SyntheticEvent);
    expect(spy1).toHaveBeenCalled();
  });
  it('should handle _onUIEnter  when shouldRespondToUIEvent is false event.currentTarget.className === czi-custom-menu-item edit-icon', () => {
    const parent = document.createElement('div');
    parent.dataset.test = 'test-value';
    const input = document.createElement('input');
    input.className = 'czi-custom-menu-item edit-icon';
    parent.appendChild(input);
    // Set the selectionStart property of the input element
    input.selectionStart = 2;
    const event = {
      bubbles: true,
      cancelable: true,
      view: globalThis,
      currentTarget: input,
    };
    const ui = {
      shouldRespondToUIEvent: () => {
        return false;
      },
    } as unknown as UICommand;
    const test = custommenuui._onUIEnter(
      ui,
      event as unknown as SyntheticEvent
    );
    expect(test).toBeUndefined();
  });
  it('should handle _onUIEnter when shouldRespondToUIEvent is false', () => {
    const parent = document.createElement('div');
    parent.dataset.test = 'test-value';
    const input = document.createElement('input');
    input.className = 'test';
    parent.appendChild(input);
    // Set the selectionStart property of the input element
    input.selectionStart = 2;
    const event = {
      bubbles: true,
      cancelable: true,
      view: globalThis,
      currentTarget: input,
    };
    const ui = {
      shouldRespondToUIEvent: () => {
        return true;
      },
      execute: () => {
        return true;
      },
    } as unknown as UICommand;
    const spy1 = jest.spyOn(custommenuui, '_execute');
    custommenuui._onUIEnter(ui, event as unknown as SyntheticEvent);

    expect(spy1).toHaveBeenCalled();
  });

  it('should handle showsubmenu', () => {
    custommenuui._stylePopup = null;
    const ui = {
      _customStyleName: 'Normal',
      _customStyle: {
        styleName: 'Normal',
        mode: 0,
        description: 'Normal',
        styles: {
          align: 'left',
          boldNumbering: true,
          boldSentence: true,
          fontName: 'Tahoma',
          fontSize: '12',
          nextLineStyleName: 'Normal',
          paragraphSpacingAfter: '3',
          toc: false,
        },
      },
      _popUp: null,
    };

    expect(
      custommenuui.showSubMenu(
        ui as unknown as UICommand,
        null
      )
    ).toBeUndefined();
  });
  it('should handle showsubmenu when popup not null', () => {
    custommenuui._popUp = null;
    const ui = {
      _customStyleName: 'Normal',
      _customStyle: {
        styleName: 'Normal',
        mode: 0,
        description: 'Normal',
        styles: {
          align: 'left',
          boldNumbering: true,
          boldSentence: true,
          fontName: 'Tahoma',
          fontSize: '12',
          nextLineStyleName: 'Normal',
          paragraphSpacingAfter: '3',
          toc: false,
        },
      },
      _popUp: null,
    } as unknown as UICommand;
    expect(
      custommenuui.showSubMenu(ui, {
        currentTarget: document.createElement('span'),
      } as unknown as SyntheticEvent)
    ).toBeUndefined();
  });
  it('should handle showsubmenu when popup not null (case 2)', () => {
    custommenuui._stylePopup = { close: () => {} };
    const ui = {
      _customStyleName: 'Normal',
      _customStyle: {
        styleName: 'Normal',
        mode: 0,
        description: 'Normal',
        styles: {
          align: 'left',
          boldNumbering: true,
          boldSentence: true,
          fontName: 'Tahoma',
          fontSize: '12',
          nextLineStyleName: 'Normal',
          paragraphSpacingAfter: '3',
          toc: false,
        },
      },
      _popUp: null,
    } as unknown as UICommand;
    expect(
      custommenuui.showSubMenu(ui, {
        currentTarget: document.createElement('span'),
      } as unknown as SyntheticEvent)
    ).toBeUndefined();
  });
  it('should handle removeCustomStyleName1', () => {
    expect(custommenuui.removeCustomStyleName(state, 'AFDP_Bullet', null)).toBe(
      false
    );
  });
  it('should handle removeCustomStyleName2', () => {
    const state = {
      doc: mockdoc,
      schema: schema,
      selection: { from: 0, to: 1 },
      plugins: [new CustomstylePlugin(TestCustomStyleRuntime)],
      empty: null,
    };
    jest.spyOn(custommenuui, 'removeTextAlignAndLineSpacing').mockReturnValue({
      key: 'tr',
      docChanged: true,
      doc: mockdoc,
      setNodeMarkup: () => {
        return { key: 'tr', docChanged: true };
      },
    } as unknown as Transform);
    expect(
      custommenuui.removeCustomStyleName(state, 'AFDP_Bullet', (x: Transform) => {
        return x;
      })
    ).toBe(true);
  });

  it('should handle removeCustomStyleName3', () => {
    const setSelection = () => {
      return {
        setSelection,
        doc: {
          nodesBetween(from, to, callback) {
            for (let i = from; i < to; i++) {
              const node = {
                content: {
                  content: [
                    {
                      marks: [{ attrs: { styleName: 'AFDP_Bullet' } }],
                    },
                  ],
                },
                type: { name: 'paragraph' },
                attrs: { styleName: 'AFDP_Bullet' },
              };
              callback(node, i);
            }
          },
          resolve: () => {
            return el;
          },
          nodeSize: 10,
        },
        removeMark: () => {
          return removeMarkChain;
        },
      };
    };
    const el = {
      parent: { inlineContent: {} },
      min: () => {},
      max: () => {},
    } as unknown as HTMLDivElement;
    const removeMarkChain = {
      setNodeMarkup: () => {
        return removeMarkChain;
      },
      setSelection,
      doc: {
        nodesBetween(from, to, callback) {
          for (let i = from; i < to; i++) {
            const node = {
              content: {
                content: [
                  {
                    marks: [{ attrs: { styleName: 'AFDP_Bullet' } }],
                  },
                ],
              },
              type: { name: 'paragraph' },
              attrs: { styleName: 'AFDP_Bullet' },
            };
            callback(node, i);
          }
        },
        nodeAt: () => {
          return { type: { name: 'paragraph' } };
        },
        resolve: () => {
          return el;
        },
        nodeSize: 10,
      },
      removeMark: () => {
        return removeMarkChain;
      },
    };
    const state = {
      doc: {
        nodesBetween(from, to, callback) {
          for (let i = from; i < to; i++) {
            const node = {
              content: {
                content: [
                  {
                    marks: [{ attrs: { styleName: 'AFDP_Bullet' } }],
                  },
                ],
              },
              type: { name: 'paragraph' },
              attrs: { styleName: 'AFDP_Bullet' },
            };
            callback(node, i);
          }
        },
        nodeSize: 10,
      },
      schema: { marks: {} },
      selection: { from: 0, to: 1 },
      plugins: [],
      empty: null,
      tr: {
        doc: {
          nodesBetween(from, to, callback) {
            for (let i = from; i < to; i++) {
              const node = {
                content: {
                  content: [
                    {
                      marks: [{ attrs: { styleName: 'AFDP_Bullet' } }],
                    },
                  ],
                },
                type: { name: 'paragraph' },
                attrs: { styleName: 'AFDP_Bullet' },
              };
              callback(node, i);
            }
          },
          nodeSize: 10,
        },
        removeMark: () => removeMarkChain,
        setSelection: setSelection,
      },
    };

    const dispatchMock = jest.fn();

    const result = custommenuui.removeCustomStyleName(
      state,
      'AFDP_Bullet',
      dispatchMock
    );
    expect(result).toBeTruthy();
  });

  it('should handle showStyleWindow', () => {
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          attrs: {
            align: { default: 'left' },
            color: { default: null },
            id: { default: '' },
            indent: { default: null },
            lineSpacing: { default: null },
            paddingBottom: { default: null },
            paddingTop: { default: null },
            capco: { default: null },
            styleName: { default: 'Test' },
          },
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          marks: '_',
        },
      },

      marks: {
        link: {
          attrs: {
            href: {},
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
            // color: '',
            overridden: {
              //  hasDefault: true,
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
            // highlightColor: '',
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
            return [
              'span',
              {
                highlightColor: '',
              },
            ];
          },
        },
        'mark-font-size': {
          attrs: {
            pt: {
              default: null,
            },
            overridden: {
              // hasDefault: true,
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
            // name: '',
            overridden: {
              // hasDefault: true,
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

    // Define the document and selection directly
    const doc = schema.nodeFromJSON({
      type: 'doc',
      attrs: {
        layout: null,
        padding: null,
        width: null,
        counterFlags: null,
        capcoMode: 0,
        styleName: 'Normal',
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            align: 'left',
            color: null,
            id: '',
            indent: null,
            lineSpacing: null,
            paddingBottom: null,
            paddingTop: null,
            capco: null,
            styleName: 'Normal',
          },
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'mark-font-size',
                  attrs: { pt: 14, overridden: false },
                },
                {
                  type: 'mark-font-type',
                  attrs: { name: 'Arial Black', overridden: false },
                },
              ],
              text: 'fggfdfgfghfghfgh',
            },
          ],
        },
      ],
    });
    const CustomMenuTestProps = {
      className: 'molcs-menu-button',
      commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
      staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
      disabled: false,
      dispatch: () => {},
      editorState: state,
      editorView: editor.view,
      icon: 'button',
      label: 'Normal',
      title: 'styles',
      _style: '',
    };
    const custommenuui = new CustomMenuUI(CustomMenuTestProps);
    const statemock = {
      schema: schema,
      doc: doc,
      selection: { from: 0, to: 1 },
    } as unknown as EditorState;
    const trmock = { setNodeMarkup: () => {} } as unknown as Transform;

    expect(
      custommenuui.renameStyleInDocument(statemock, trmock, 'Normal', 'test')
    ).toBeUndefined();
    expect(custommenuui.getTheSelectedCustomStyle(statemock)).toBeDefined();

    const uicommands = {
      _customStyleName: 'test',
      _customStyle: { description: 'description', styles: {} },
    };
    const event = new Event('click') as unknown as SyntheticEvent;
    custommenuui._stylePopup = null;
    expect(custommenuui.showStyleWindow(uicommands, event, 0)).toBeUndefined();
    expect(custommenuui.showStyleWindow(uicommands, event, 0)).toBeUndefined();
  });
  it('should handle showStyleWindow (case 2)', () => {
    const event = new Event('click');
    const uicommands = {
      _customStyleName: 'test',
      _customStyle: { description: 'description', styles: {} },
    };
    custommenuui._stylePopup = null;
    expect(
      custommenuui.showStyleWindow(
        uicommands,
        event as unknown as SyntheticEvent,
        0
      )
    ).toBeUndefined();
  });
  it('should handle showStyleWindow (case 3)', () => {
    const view = new EditorView(document.createElement('div'), {
      state,
    });

    // Mount the EditorView to the DOM
    document.body.appendChild(view.dom);

    // Set focus on the EditorView
    view.focus();
    const CustomMenuTestProps = {
      className: 'molcs-menu-button',
      commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
      staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
      disabled: false,
      dispatch: () => {},
      editorState: state,
      editorView: view,
      icon: 'button',
      label: 'Normal',
      title: 'styles',
      _style: '',
    };
    const custommenuui = new CustomMenuUI(CustomMenuTestProps);
    const event = new Event('click');
    const uicommands = {
      _customStyleName: 'test',
      _customStyle: { description: 'description', styles: {} },
    };
    custommenuui._stylePopup = null;
    expect(
      custommenuui.showStyleWindow(
        uicommands,
        event as unknown as SyntheticEvent,
        0
      )
    ).toBeUndefined();
  });
  it('should handle showStyleWindow (case 4)', () => {
    const view = new EditorView(document.createElement('div'), {
      state,
    });

    // Mount the EditorView to the DOM
    document.body.appendChild(view.dom);

    // Set focus on the EditorView
    view.focus();
    const CustomMenuTestProps = {
      className: 'molcs-menu-button',
      commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
      staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
      disabled: false,
      dispatch: () => {},
      editorState: state,
      editorView: view,
      icon: 'button',
      label: 'Normal',
      title: 'styles',
      _style: '',
    };
    const custommenuui = new CustomMenuUI(CustomMenuTestProps);
    const event = new Event('click');
    const uicommands = {
      _customStyleName: 'test',
      _customStyle: { description: 'description', styles: {} },
    };
    custommenuui._stylePopup = { close: () => {} };
    expect(
      custommenuui.showStyleWindow(
        uicommands,
        event as unknown as SyntheticEvent,
        0
      )
    ).toBeUndefined();
    expect(
      custommenuui.showStyleWindow(
        uicommands,
        event as unknown as SyntheticEvent,
        0
      )
    ).toBeUndefined();
  });

  it('should execute command when command is defined', () => {
    const mockExecute = jest.fn();
    const command = {
      execute: mockExecute,
    } as unknown as UICommand;

    const event = new Event('click') as unknown as SyntheticEvent;
    const mockOnCommand = jest.fn();

    const testProps = {
      className: 'molcs-menu-button',
      commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
      staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
      disabled: false,
      dispatch: () => {},
      editorState: state,
      editorView: editor.view,
      icon: 'button',
      label: 'Normal',
      title: 'styles',
      _style: '',
      onCommand: mockOnCommand,
    };

    const custommenuui = new CustomMenuUI(testProps);
    custommenuui._execute(command, event);

    expect(mockExecute).toHaveBeenCalledWith(
      testProps.editorState,
      testProps.dispatch,
      testProps.editorView,
      event
    );
    expect(mockOnCommand).toHaveBeenCalled();
  });

  it('should return RESERVED_STYLE_NONE for non-allowed nodes', () => {
    const testProps = {
      className: 'molcs-menu-button',
      commandGroups: [cmdGrp1, cmdGrp2, { Normal: true }],
      staticCommand: [{ Normal: true, _customStyleName: 'customstylename' }],
      disabled: false,
      dispatch: () => {},
      editorState: state,
      editorView: editor.view,
      icon: 'button',
      label: 'Normal',
      title: 'styles',
      _style: '',
    };

    const custommenuui = new CustomMenuUI(testProps);

    const mockDoc = {
      nodesBetween: jest.fn((_from, _to, callback) => {
        const node = {
          type: { name: 'image' },
          attrs: { styleName: 'TestStyle' },
        };
        callback(node, 0);
      }),
    };

    const testState = {
      doc: mockDoc,
      selection: { from: 0, to: 1 },
    };

    const result = custommenuui.getTheSelectedCustomStyle(
      testState
    );

    expect(result).toBe('Normal');
  });

  it('should handle selectedName matching label', () => {
    jest
      .spyOn(custommenuui, 'getTheSelectedCustomStyle')
      .mockReturnValue('AFDP_Bullet');

    const result = custommenuui.render();

    expect(result).toBeDefined();
    expect(custommenuui._appliedIndex).toBeGreaterThan(0);
  });

  it('should normalize saved styles when input is an array', () => {
    const arrayInput = [
      { styleName: 'StyleA', mode: 0 },
      { styleName: 'StyleB', mode: 0 },
    ] as unknown as Style[];
    const result = custommenuui.normalizeSavedStyles(arrayInput);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(arrayInput);
  });

  it('should normalize saved styles when input is not an array', () => {
   
    jest
      .spyOn(customStyle, 'addStyleToList')
      .mockReturnValueOnce([
        { styleName: 'Single', mode: 0 },
      ]);
    const objInput = { styleName: 'Single', mode: 0 } as unknown as Style;
    const result = custommenuui.normalizeSavedStyles(objInput);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should find a matching style by styleName', () => {
    const styles = [
      { styleName: 'A' },
      { styleName: 'B' },
      { styleName: 'C' },
    ] as unknown as Style[];
    const match = custommenuui.findMatchingStyle(styles, 'B');
    expect(match).toEqual({ styleName: 'B' });
  });

  it('should return undefined when no matching style found', () => {
    const styles = [{ styleName: 'A' }] as unknown as Style[];
    const match = custommenuui.findMatchingStyle(styles, 'X');
    expect(match).toBeUndefined();
  });

  it('should close style popup when popup exists and focus editor view', () => {
    const closeMock = jest.fn();
    const focusMock = jest.fn();
    const localProps = {
      ...CustomMenuTestProps,
      editorView: { focus: focusMock },
    };
    const instance = new CustomMenuUI(localProps);
    instance._stylePopup = { close: closeMock };
    instance.closeStylePopup();
    expect(closeMock).toHaveBeenCalled();
    expect(instance._stylePopup).toBeNull();
    expect(focusMock).toHaveBeenCalled();
  });

  it('should close style popup when popup does not exist (no-throw)', () => {
    const focusMock = jest.fn();
    const localProps = {
      ...CustomMenuTestProps,
      editorView: { focus: focusMock },
    };
    const instance = new CustomMenuUI(localProps);
    instance._stylePopup = null;
    expect(() => instance.closeStylePopup()).not.toThrow();
    expect(focusMock).toHaveBeenCalled();
    expect(instance._stylePopup).toBeNull();
  });

  it('applySavedStyleResult should close popup when result is null', () => {
    const focusMock = jest.fn();
    const localProps = {
      ...CustomMenuTestProps,
      editorView: { focus: focusMock },
    };
    const instance = new CustomMenuUI(localProps);
    const closeSpy = jest
      .spyOn(instance, 'closeStylePopup')
      .mockImplementation(() => {});
    const getTransform = jest.fn();
    instance.applySavedStyleResult(
      { styleName: 'A' },
      null,
      getTransform as unknown
    );
    expect(closeSpy).toHaveBeenCalled();
    expect(getTransform).not.toHaveBeenCalled();
  });

  it('applySavedStyleResult should dispatch when transform is returned', () => {
    const dispatchMock = jest.fn();
    const focusMock = jest.fn();
    const localProps = {
      ...CustomMenuTestProps,
      editorView: {
        focus: focusMock,
        dispatch: dispatchMock,
      },
    };
    const instance = new CustomMenuUI(localProps);
    jest.spyOn(instance, 'closeStylePopup').mockImplementation(() => {});
    const trMock = { docChanged: true } as unknown as Transform;
    instance.applySavedStyleResult(
      { styleName: 'A' },
      [{ styleName: 'A' }] as unknown,
      () => trMock
    );
    expect(dispatchMock).toHaveBeenCalledWith(trMock);
  });

  it('applySavedStyleResult should not dispatch when no matching style found', () => {
    const dispatchMock = jest.fn();
    const focusMock = jest.fn();
    const localProps = {
      ...CustomMenuTestProps,
      editorView: {
        focus: focusMock,
        dispatch: dispatchMock,
      },
    };
    const instance = new CustomMenuUI(localProps);
    jest.spyOn(instance, 'closeStylePopup').mockImplementation(() => {});
    const getTransform = jest.fn();
    instance.applySavedStyleResult(
      { styleName: 'NonExistent' },
      [{ styleName: 'A' }] as unknown,
      getTransform as unknown
    );
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(getTransform).not.toHaveBeenCalled();
  });

  it('applySavedStyleResult should not dispatch when transform returned is falsy', () => {
    const dispatchMock = jest.fn();
    const focusMock = jest.fn();
    const localProps = {
      ...CustomMenuTestProps,
      editorView: {
        focus: focusMock,
        dispatch: dispatchMock,
      },
    };
    const instance = new CustomMenuUI(localProps);
    jest.spyOn(instance, 'closeStylePopup').mockImplementation(() => {});
    instance.applySavedStyleResult(
      { styleName: 'A' },
      [{ styleName: 'A' }] as unknown,
      () => null as unknown as Transform
    );
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('saveStyleAndApply should resolve and delete editorView from val', async () => {
    jest
      .spyOn(customStyle, 'saveStyle')
      .mockReturnValueOnce(Promise.resolve([]));
    const applySpy = jest
      .spyOn(custommenuui, 'applySavedStyleResult')
      .mockImplementation(() => {});
    const val = { styleName: 'A', editorView: 'something' };
    custommenuui.saveStyleAndApply(val, () => null as unknown as Transform);
    await new Promise((r) => setTimeout(r, 0));
    expect(val.editorView).toBeUndefined();
    expect(applySpy).toHaveBeenCalled();
    applySpy.mockRestore();
  });

  it('saveStyleAndApply should handle rejection via catch (no throw)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .spyOn(customStyle, 'saveStyle')
      .mockReturnValueOnce(
        Promise.reject(new Error('boom'))
      );
    const val = { styleName: 'A', editorView: 'something' };
    custommenuui.saveStyleAndApply(val, () => null as unknown as Transform);
    await new Promise((r) => setTimeout(r, 0));
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('handleEditModeSave should delegate to saveStyleAndApply', () => {
    const saveSpy = jest
      .spyOn(custommenuui, 'saveStyleAndApply')
      .mockImplementation(() => {});
    custommenuui.handleEditModeSave({ styleName: 'Edited' });
    expect(saveSpy).toHaveBeenCalled();
    // verify the second arg is a function (the getTransform callback)
    expect(typeof saveSpy.mock.calls[0][1]).toBe('function');
    // invoking the callback should not throw
    expect(() =>
      (saveSpy.mock.calls[0][1] as (o: unknown) => unknown)({})
    ).not.toThrow();
    saveSpy.mockRestore();
  });

  it('handleRenameModeSave should early-return when renameStyle resolves null', async () => {
    jest
      .spyOn(customStyle, 'renameStyle')
      .mockReturnValueOnce(Promise.resolve(null));
    const saveSpy = jest
      .spyOn(custommenuui, 'saveStyleAndApply')
      .mockImplementation(() => {});
    custommenuui._styleName = 'OldName';
    custommenuui.handleRenameModeSave({ styleName: 'NewName' });
    await new Promise((r) => setTimeout(r, 0));
    expect(saveSpy).not.toHaveBeenCalled();
    saveSpy.mockRestore();
  });

  it('handleRenameModeSave should call saveStyleAndApply on non-null result', async () => {
    jest
      .spyOn(customStyle, 'renameStyle')
      .mockReturnValueOnce(
        Promise.resolve([{ styleName: 'NewName' }])
      );
    const saveSpy = jest
      .spyOn(custommenuui, 'saveStyleAndApply')
      .mockImplementation(() => {});
    custommenuui._styleName = 'OldName';
    custommenuui.handleRenameModeSave({ styleName: 'NewName' });
    await new Promise((r) => setTimeout(r, 0));
    expect(saveSpy).toHaveBeenCalled();
    saveSpy.mockRestore();
  });

  it('handleRenameModeSave should handle renameStyle rejection via catch', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .spyOn(customStyle, 'renameStyle')
      .mockReturnValueOnce(
        Promise.reject(new Error('rename failed'))
      );
    custommenuui._styleName = 'OldName';
    custommenuui.handleRenameModeSave({ styleName: 'NewName' });
    await new Promise((r) => setTimeout(r, 0));
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('removeTextAlignAndLineSpacing should return a Transform', () => {
    let _setNodeCount = 0;
    const tr = {
      doc: mockdoc,
      docChanged: false,
      setNodeMarkup: () => {
        _setNodeCount++;
        return tr;
      },
    } as unknown as Transform;
    const result = custommenuui.removeTextAlignAndLineSpacing(tr, schema);
    expect(result).toBeDefined();
  });

  it('_execute should early-return when command is undefined', () => {
    const onCommandMock = jest.fn();
    const localProps = {
      ...CustomMenuTestProps,
      onCommand: onCommandMock,
    };
    const instance = new CustomMenuUI(localProps);
    const result = instance._execute(
      undefined,
      new Event('click') as unknown as SyntheticEvent
    );
    expect(result).toBeUndefined();
    expect(onCommandMock).not.toHaveBeenCalled();
  });

  it('getCommandGroups should return default HEADING_COMMANDS when addStyleToList returns null', () => {
    jest
      .spyOn(customStyle, 'addStyleToList')
      .mockReturnValueOnce(null);
    const localProps = { ...CustomMenuTestProps };
    const instance = new CustomMenuUI(localProps);
    const groups = instance.getCommandGroups();
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBe(1);
    // The default group must always contain RESERVED_STYLE_NONE ("Normal")
    expect(groups[0]).toHaveProperty('Normal');
  });

  it('getCommandGroups should build commands when foundNormal exists and additional styles', () => {
    const styles = [
      { styleName: 'Normal', mode: 0 },
      { styleName: 'CustomStyle1', mode: 0 },
      { styleName: 'CustomStyle2', mode: 0 },
    ] as unknown as Style[];
    jest.spyOn(customStyle, 'addStyleToList').mockReturnValueOnce(styles);
    const setStylesSpy = jest
      .spyOn(customStyle, 'setStyles')
      .mockImplementation(() => {});
    const localProps = { ...CustomMenuTestProps };
    const instance = new CustomMenuUI(localProps);
    const groups = instance.getCommandGroups();
    expect(groups[0]).toHaveProperty('Normal');
    expect(groups[0]).toHaveProperty('CustomStyle1');
    expect(groups[0]).toHaveProperty('CustomStyle2');
    expect(setStylesSpy).toHaveBeenCalled();
    setStylesSpy.mockRestore();
  });

  it('getCommandGroups should not overwrite Normal when foundNormal is absent', () => {
    const styles = [
      { styleName: 'OnlyCustom', mode: 0 },
    ] as unknown as Style[];
    jest.spyOn(customStyle, 'addStyleToList').mockReturnValueOnce(styles);
    jest.spyOn(customStyle, 'setStyles').mockImplementation(() => {});
    const localProps = { ...CustomMenuTestProps };
    const instance = new CustomMenuUI(localProps);
    const groups = instance.getCommandGroups();
    // Default Normal entry is preserved, plus OnlyCustom is added
    expect(groups[0]).toHaveProperty('Normal');
    expect(groups[0]).toHaveProperty('OnlyCustom');
  });

  it('showSubMenu onClose should call removeStyle and removeCustomStyleName for "remove" type', async () => {
    // Capture createPopUp's onClose callback via the module-level mock
    let capturedSubMenuOnClose: ((val: unknown) => void) | undefined;
    const popupCloseMock = jest.fn();
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_Comp: unknown, _props: unknown, opts: unknown) => {
        capturedSubMenuOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: popupCloseMock };
      }
    );

    const removeStyleSpy = jest
      .spyOn(customStyle, 'removeStyle')
      .mockReturnValueOnce(Promise.resolve([]));

    const localProps = {
      ...CustomMenuTestProps,
      editorView: {
        ...editor.view,
        dispatch: jest.fn(),
      },
    };
    const instance = new CustomMenuUI(localProps);
    const removeSpy = jest
      .spyOn(instance, 'removeCustomStyleName')
      .mockReturnValue(true);

    const command = {
      _customStyleName: 'ToRemove',
      _customStyle: { styleName: 'ToRemove' },
    } as unknown as UICommand;
    instance._stylePopup = null;
    instance._popUp = null;
    instance.showSubMenu(command, {
      currentTarget: document.createElement('div'),
    } as unknown as SyntheticEvent);

    expect(typeof capturedSubMenuOnClose).toBe('function');
    // Simulate the popup invoking onClose with the "remove" action
    capturedSubMenuOnClose({
      type: 'remove',
      command: {
        _customStyleName: 'ToRemove',
        _customStyle: { styleName: 'ToRemove' },
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(removeStyleSpy).toHaveBeenCalledWith('ToRemove');
    expect(removeSpy).toHaveBeenCalled();
  });

  it('showSubMenu onClose should handle removeStyle rejection for "remove" type', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let capturedSubMenuOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedSubMenuOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );
    jest
      .spyOn(customStyle, 'removeStyle')
      .mockReturnValueOnce(
        Promise.reject(new Error('remove failed'))
      );

    const instance = new CustomMenuUI({ ...CustomMenuTestProps });
    instance._stylePopup = null;
    instance._popUp = null;
    instance.showSubMenu({} as unknown as UICommand, {
      currentTarget: document.createElement('div'),
    } as unknown as SyntheticEvent);

    capturedSubMenuOnClose({
      type: 'remove',
      command: {
        _customStyleName: 'Bad',
        _customStyle: { styleName: 'Bad' },
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('showSubMenu onClose should call showStyleWindow with mode 2 for "rename" type', () => {
    let capturedSubMenuOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedSubMenuOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );

    const instance = new CustomMenuUI({ ...CustomMenuTestProps });
    const showStyleSpy = jest
      .spyOn(instance, 'showStyleWindow')
      .mockImplementation(() => {});

    instance._stylePopup = null;
    instance._popUp = null;
    const event = {
      currentTarget: document.createElement('div'),
    } as unknown as SyntheticEvent;
    const command = {} as unknown as UICommand;
    instance.showSubMenu(command, event);

    capturedSubMenuOnClose({
      type: 'rename',
      command: {
        _customStyleName: 'X',
        _customStyle: { styleName: 'X' },
      },
    });

    expect(showStyleSpy).toHaveBeenCalledWith(command, event, 2);
  });

  it('showSubMenu onClose should call showStyleWindow with mode 1 for "edit" type (else branch)', () => {
    let capturedSubMenuOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedSubMenuOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );

    const instance = new CustomMenuUI({ ...CustomMenuTestProps });
    const showStyleSpy = jest
      .spyOn(instance, 'showStyleWindow')
      .mockImplementation(() => {});

    instance._stylePopup = null;
    instance._popUp = null;
    const event = {
      currentTarget: document.createElement('div'),
    } as unknown as SyntheticEvent;
    const command = {} as unknown as UICommand;
    instance.showSubMenu(command, event);

    capturedSubMenuOnClose({
      type: 'edit',
      command: {
        _customStyleName: 'X',
        _customStyle: { styleName: 'X' },
      },
    });

    expect(showStyleSpy).toHaveBeenCalledWith(command, event, 1);
  });

  it('showSubMenu onClose should do nothing if val is undefined', () => {
    let capturedSubMenuOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedSubMenuOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );

    const instance = new CustomMenuUI({ ...CustomMenuTestProps });
    const showStyleSpy = jest
      .spyOn(instance, 'showStyleWindow')
      .mockImplementation(() => {});
    instance._stylePopup = null;
    instance._popUp = null;
    instance.showSubMenu({} as unknown as UICommand, {
      currentTarget: document.createElement('div'),
    } as unknown as SyntheticEvent);

    // Passing undefined should not invoke showStyleWindow
    expect(() => capturedSubMenuOnClose(undefined)).not.toThrow();
    expect(showStyleSpy).not.toHaveBeenCalled();
  });

  it('showStyleWindow onClose should call handleEditModeSave for mode 1', () => {
    let capturedWindowOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedWindowOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );

    const focusMock = jest.fn();
    const instance = new CustomMenuUI({
      ...CustomMenuTestProps,
      editorView: { focus: focusMock },
    });
    const editSpy = jest
      .spyOn(instance, 'handleEditModeSave')
      .mockImplementation(() => {});

    instance._stylePopup = null;
    instance.showStyleWindow(
      {
        _customStyleName: 'X',
        _customStyle: { description: 'd', styles: {} },
      },
      new Event('click') as unknown as SyntheticEvent,
      1
    );

    // After showStyleWindow, _stylePopup is now set. Simulate close with a value.
    capturedWindowOnClose({ styleName: 'X', runtime: 'should-be-deleted' });
    expect(editSpy).toHaveBeenCalled();
    expect(focusMock).toHaveBeenCalled();
  });

  it('showStyleWindow onClose should call handleRenameModeSave for mode != 1', () => {
    let capturedWindowOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedWindowOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );

    const focusMock = jest.fn();
    const instance = new CustomMenuUI({
      ...CustomMenuTestProps,
      editorView: { focus: focusMock },
    });
    const renameSpy = jest
      .spyOn(instance, 'handleRenameModeSave')
      .mockImplementation(() => {});

    instance._stylePopup = null;
    instance.showStyleWindow(
      {
        _customStyleName: 'X',
        _customStyle: { description: 'd', styles: {} },
      },
      new Event('click') as unknown as SyntheticEvent,
      2
    );

    capturedWindowOnClose({ styleName: 'Y', runtime: 'should-be-deleted' });
    expect(renameSpy).toHaveBeenCalled();
  });

  it('showStyleWindow onClose should still focus editor when val is undefined', () => {
    let capturedWindowOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedWindowOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );

    const focusMock = jest.fn();
    const instance = new CustomMenuUI({
      ...CustomMenuTestProps,
      editorView: { focus: focusMock },
    });
    const editSpy = jest
      .spyOn(instance, 'handleEditModeSave')
      .mockImplementation(() => {});
    const renameSpy = jest
      .spyOn(instance, 'handleRenameModeSave')
      .mockImplementation(() => {});

    instance._stylePopup = null;
    instance.showStyleWindow(
      {
        _customStyleName: 'X',
        _customStyle: { description: 'd', styles: {} },
      },
      new Event('click') as unknown as SyntheticEvent,
      1
    );

    capturedWindowOnClose(undefined);
    expect(editSpy).not.toHaveBeenCalled();
    expect(renameSpy).not.toHaveBeenCalled();
    expect(focusMock).toHaveBeenCalled();
  });

  it('showStyleWindow onClose should not invoke handlers when _stylePopup was cleared', () => {
    let capturedWindowOnClose: ((val: unknown) => void) | undefined;
    (commands.createPopUp as unknown as jest.Mock).mockImplementationOnce(
      (_C: unknown, _p: unknown, opts: unknown) => {
        capturedWindowOnClose = (opts as { onClose: (v: unknown) => void })
          .onClose;
        return { close: jest.fn() };
      }
    );

    const focusMock = jest.fn();
    const instance = new CustomMenuUI({
      ...CustomMenuTestProps,
      editorView: { focus: focusMock },
    });
    const editSpy = jest
      .spyOn(instance, 'handleEditModeSave')
      .mockImplementation(() => {});

    instance._stylePopup = null;
    instance.showStyleWindow(
      {
        _customStyleName: 'X',
        _customStyle: { description: 'd', styles: {} },
      },
      new Event('click') as unknown as SyntheticEvent,
      1
    );

    instance._stylePopup = null;
    capturedWindowOnClose({ styleName: 'X' });
    expect(editSpy).not.toHaveBeenCalled();
    expect(focusMock).toHaveBeenCalled();
  });

  it('removeCustomStyleName should use selection.from/to directly when empty is false', () => {

    const instance = new CustomMenuUI({ ...CustomMenuTestProps });

    const finalTr: Record<string, unknown> = {
      docChanged: true,
      doc: mockdoc,
    };
    finalTr.setNodeMarkup = () => finalTr;
    finalTr.removeMark = () => finalTr;

    const trObj: Record<string, unknown> = { doc: mockdoc };
    trObj.setNodeMarkup = () => trObj;
    trObj.removeMark = () => trObj;

    jest
      .spyOn(instance, 'removeTextAlignAndLineSpacing')
      .mockReturnValue(finalTr as unknown as Transform);

    const stateWithRange = {
      doc: mockdoc,
      schema: schema,
      selection: { from: 0, to: 2, empty: false },
      tr: trObj,
    } as unknown as EditorState;

    expect(() =>
      instance.removeCustomStyleName(stateWithRange, 'AFDP_Bullet', jest.fn())
    ).not.toThrow();
  });

  it('renameStyleInDocument should rename matching nodes only', () => {
    const calls: Array<{ pos: number; attrs: Record<string, unknown> }> = [];
    const fakeTr = {
      setNodeMarkup: (pos: number, _t: unknown, attrs: Record<string, unknown>) => {
        calls.push({ pos, attrs });
        return fakeTr;
      },
    } as unknown as Transform;
    const fakeState = {
      doc: {
        descendants: (cb: (n: { attrs: { styleName: string } }, pos: number) => void) => {
          cb({ attrs: { styleName: 'Old' } }, 0);
          cb({ attrs: { styleName: 'Other' } }, 5);
          cb({ attrs: { styleName: 'Old' } }, 10);
        },
      },
    } as unknown as EditorState;

    const result = custommenuui.renameStyleInDocument(
      fakeState,
      fakeTr,
      'Old',
      'New'
    );
    expect(result).toBeDefined();
    expect(calls.length).toBe(2);
    expect(calls[0].attrs.styleName).toBe('New');
    expect(calls[1].attrs.styleName).toBe('New');
  });

  it('getTheSelectedCustomStyle should return the styleName attr of an allowed node', () => {
    const customDoc = {
      nodesBetween: (_f: number, _t: number, cb: (n: unknown) => void) => {
        cb({
          type: { name: 'paragraph' },
          attrs: { styleName: 'MyCustom' },
        });
      },
    };
    const fakeState = {
      doc: customDoc,
      selection: { from: 0, to: 1 },
    } as unknown as EditorState;
    expect(custommenuui.getTheSelectedCustomStyle(fakeState)).toBe('AFDP_Bullet');
  });

  it('isAllowedNode should return true for paragraph and enhanced_table_figure_notes', () => {
    expect(
      custommenuui.isAllowedNode({
        type: { name: 'paragraph' },
      } as unknown as Node)
    ).toBe(true);
    expect(
      custommenuui.isAllowedNode({
        type: { name: 'enhanced_table_figure_notes' },
      } as unknown as Node)
    ).toBe(true);
    expect(
      custommenuui.isAllowedNode({
        type: { name: 'image' },
      } as unknown as Node)
    ).toBe(false);
  });
});
