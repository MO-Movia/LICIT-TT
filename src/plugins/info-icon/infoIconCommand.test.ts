/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {InfoIconCommand} from './infoIconCommand';
import {EditorState} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {Schema, Fragment} from 'prosemirror-model';
import {createPopUp} from '../../commands';
import {getNode} from './constants';

jest.mock('../../commands', () => ({
  createPopUp: jest.fn(),
}));

jest.mock('./constants', () => ({
  getNode: jest.fn(),
}));

jest.mock('./infoIconDialog', () => ({
  InfoIconDialog: jest.fn(),
}));

describe('InfoIconCommand', () => {
  const infoCommand = new InfoIconCommand('');

  const mockSchema = new Schema({
    nodes: {
      doc: {
        content: 'block+',
      },
      paragraph: {
        content: 'inline*',
        group: 'block',
        parseDOM: [{tag: 'p'}],
        toDOM: () => ['p', 0],
      },
      heading: {
        attrs: {level: {default: 1}},
        content: 'inline*',
        group: 'block',
        defining: true,
        parseDOM: [
          {tag: 'h1', attrs: {level: 1}},
          {tag: 'h2', attrs: {level: 2}},
          {tag: 'h3', attrs: {level: 3}},
        ],
        toDOM: (node) => ['h' + node.attrs.level, 0],
      },
      text: {
        group: 'inline',
      },
      image: {
        inline: true,
        attrs: {
          src: {},
          alt: {default: null},
          title: {default: null},
        },
        group: 'inline',
        draggable: true,
        parseDOM: [
          {
            tag: 'img[src]',
            getAttrs: (dom) => ({
              src: dom.getAttribute('src'),
              alt: dom.getAttribute('alt'),
              title: dom.getAttribute('title'),
            }),
          },
        ],
        toDOM: (node) => [
          'img',
          {
            src: node.attrs.src,
            alt: node.attrs.alt,
            title: node.attrs.title,
          },
        ],
      },
      illustration: {
        inline: false,
        attrs: {
          url: {},
          caption: {default: null},
        },
        group: 'block',
        draggable: true,
        parseDOM: [
          {
            tag: "div[data-type='illustration']",
            getAttrs: (dom) => ({
              url: dom.getAttribute('data-url'),
              caption: dom.getAttribute('data-caption'),
            }),
          },
        ],
        toDOM: (node) => [
          'div',
          {'data-type': 'illustration', 'data-url': node.attrs.url},
          ['img', {src: node.attrs.url, alt: 'Illustration'}],
          ['p', {class: 'caption'}, node.attrs.caption || ''],
        ],
      },
      hard_break: {
        inline: true,
        group: 'inline',
        selectable: false,
        parseDOM: [{tag: 'br'}],
        toDOM: () => ['br'],
      },
    },
    marks: {
      bold: {
        parseDOM: [
          {tag: 'strong'},
          {tag: 'b', getAttrs: (node) => node.style.fontWeight != 'normal' && null},
        ],
        toDOM: () => ['strong', 0],
      },
      italic: {
        parseDOM: [
          {tag: 'em'},
          {tag: 'i', getAttrs: (node) => node.style.fontStyle != 'normal' && null},
        ],
        toDOM: () => ['em', 0],
      },
      link: {
        attrs: {
          href: {},
          title: {default: null},
        },
        inclusive: false,
        parseDOM: [
          {
            tag: 'a[href]',
            getAttrs: (dom) => ({
              href: dom.getAttribute('href'),
              title: dom.getAttribute('title'),
            }),
          },
        ],
        toDOM: (node) => ['a', {href: node.attrs.href, title: node.attrs.title}, 0],
      },
    },
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    (infoCommand as unknown as {_popUp: unknown})._popUp = null;
  });

  describe('constructor', () => {
    it('should set _color when color argument is provided', () => {
      const cmd = new InfoIconCommand('red');
      expect((cmd as unknown as {_color: string})._color).toBe('red');
    });

    it('should leave _color undefined when no argument provided', () => {
      const cmd = new InfoIconCommand();
      expect((cmd as unknown as {_color: string})._color).toBeUndefined();
    });
  });

  describe('isEnabled', () => {
    it('should return true when selection is empty', () => {
      const state = {
        tr: {selection: {empty: true}},
      } as unknown as EditorState;
      expect(infoCommand.isEnabled(state)).toBe(true);
    });

    it('should return false when selection is not empty', () => {
      const state = {
        tr: {selection: {empty: false}},
      } as unknown as EditorState;
      expect(infoCommand.isEnabled(state)).toBe(false);
    });
  });

  describe('_isEnabled', () => {
    it('should return true when selection is empty', () => {
      const state = {
        tr: {selection: {empty: true}},
      } as unknown as EditorState;
      expect(
        (infoCommand as unknown as {_isEnabled: (s: EditorState) => boolean})._isEnabled(state)
      ).toBe(true);
    });

    it('should return false when selection is not empty', () => {
      const state = {
        tr: {selection: {empty: false}},
      } as unknown as EditorState;
      expect(
        (infoCommand as unknown as {_isEnabled: (s: EditorState) => boolean})._isEnabled(state)
      ).toBe(false);
    });
  });

  describe('createInfoObject', () => {

    it('should accept mode value 0 (new)', () => {
      const view = {} as unknown as Parameters<typeof infoCommand.createInfoObject>[0];
      const result = infoCommand.createInfoObject(view, 0);
      expect(result.mode).toBe(0);
    });

    it('should accept mode value 2 (delete)', () => {
      const view = {} as unknown as Parameters<typeof infoCommand.createInfoObject>[0];
      const result = infoCommand.createInfoObject(view, 2);
      expect(result.mode).toBe(2);
    });
  });

  describe('waitForUserInput', () => {
    it('should resolve with undefined when popup already exists', async () => {
      (infoCommand as unknown as {_popUp: unknown})._popUp = {close: jest.fn()};
      const result = await infoCommand.waitForUserInput({} as EditorState);
      expect(result).toBeUndefined();
      expect(createPopUp as jest.Mock).not.toHaveBeenCalled();
    });

    it('should create popup and resolve when onClose fires', async () => {
      (infoCommand as unknown as {_popUp: unknown})._popUp = null;
      let capturedOnClose: ((val: unknown) => void) | undefined;
      (createPopUp as jest.Mock).mockImplementation((_dialog, _props, options) => {
        capturedOnClose = options.onClose;
        return {close: jest.fn()};
      });

      const promise = infoCommand.waitForUserInput(
        {} as EditorState,
        jest.fn(),
        {} as Parameters<typeof infoCommand.waitForUserInput>[2]
      );

      expect(createPopUp as jest.Mock).toHaveBeenCalled();
      expect(capturedOnClose).toBeDefined();

      capturedOnClose('userValue');
      const result = await promise;
      expect(result).toBe('userValue');
    });

    it('should not resolve twice if onClose fires when popup is already cleared', async () => {
      (infoCommand as unknown as {_popUp: unknown})._popUp = null;
      let capturedOnClose: ((val: unknown) => void) | undefined;
      (createPopUp as jest.Mock).mockImplementation((_dialog, _props, options) => {
        capturedOnClose = options.onClose;
        return {close: jest.fn()};
      });

      const promise = infoCommand.waitForUserInput(
        {} as EditorState,
        jest.fn(),
        {} as Parameters<typeof infoCommand.waitForUserInput>[2]
      );

      (infoCommand as unknown as {_popUp: unknown})._popUp = null;
      capturedOnClose('ignored');
      (infoCommand as unknown as {_popUp: unknown})._popUp = {close: jest.fn()};
      capturedOnClose('resolved');

      const result = await Promise.race([
        promise,
        new Promise((res) => setTimeout(() => res('timeout'), 50)),
      ]);
      expect(['resolved', 'timeout']).toContain(result);
    });
  });

  describe('executeWithUserInput', () => {
    it('should return false and not throw when dispatch is undefined', () => {
      const result = infoCommand.executeWithUserInput(
        {} as EditorState,
        undefined,
        undefined,
        null
      );
      expect(result).toBe(false);
    });

    it('should dispatch tr but skip insertion when node is null', () => {
      (getNode as jest.Mock).mockReturnValue(null);
      const tr = {
        setSelection: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        setNodeMarkup: jest.fn().mockReturnThis(),
      };
      const state = {
        selection: {from: 0, to: 0},
        tr,
      } as unknown as EditorState;
      const dispatch = jest.fn();
      const result = infoCommand.executeWithUserInput(
        state,
        dispatch,
        undefined,
        {foo: 'bar'}
      );
      expect(tr.insert).not.toHaveBeenCalled();
      expect(tr.setNodeMarkup).not.toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith(tr);
      expect(result).toBe(false);
    });

    it('should dispatch tr but skip insertion when infoIcon is null', () => {
      (getNode as jest.Mock).mockReturnValue({type: 'someNode'});
      const tr = {
        setSelection: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        setNodeMarkup: jest.fn().mockReturnThis(),
      };
      const state = {
        selection: {from: 0, to: 0},
        tr,
      } as unknown as EditorState;
      const dispatch = jest.fn();
      const result = infoCommand.executeWithUserInput(
        state,
        dispatch,
        undefined,
        null
      );
      expect(tr.insert).not.toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith(tr);
      expect(result).toBe(false);
    });

    it('should insert info icon and call setNodeMarkup once when no list ancestor', () => {
      (getNode as jest.Mock).mockReturnValue({type: 'someNode'});
      jest.spyOn(Fragment, 'from').mockReturnValue({} as unknown as Fragment);

      const infoiconCreate = jest.fn().mockReturnValue({type: 'infoiconNode'});
      const tr = {
        setSelection: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        setNodeMarkup: jest.fn().mockReturnThis(),
      };
      const $head = {
        depth: 1,
        node: jest.fn().mockReturnValue({
          type: {name: 'paragraph'},
          attrs: {},
        }),
        path: [],
      };
      const state = {
        selection: {from: 0, to: 5, $head},
        tr,
        schema: {
          nodes: {
            infoicon: {
              attrs: {foo: 'bar'},
              create: infoiconCreate,
            },
          },
        },
      } as unknown as EditorState;
      const infoIcon = {
        attrs: {},
        infoIcon: 'iconName',
        editorView: {state: {schema: mockSchema, doc: {content: []}}},
      };

      jest
        .spyOn(infoCommand, 'getFragm')
        .mockReturnValue(document.createDocumentFragment());

      const dispatch = jest.fn();
      const result = infoCommand.executeWithUserInput(
        state,
        dispatch,
        undefined,
        infoIcon
      );

      expect(tr.insert).toHaveBeenCalledTimes(1);
      expect(tr.setNodeMarkup).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should call setNodeMarkup twice when an ordered_list ancestor exists', () => {
      (getNode as jest.Mock).mockReturnValue({type: 'someNode'});
      jest.spyOn(Fragment, 'from').mockReturnValue({} as unknown as Fragment);

      const infoiconCreate = jest.fn().mockReturnValue({type: 'infoiconNode'});
      const tr = {
        setSelection: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        setNodeMarkup: jest.fn().mockReturnThis(),
      };
      const $head = {
        depth: 2,
        node: jest.fn().mockImplementation((d) => {
          if (d === 2) {
            return {
              type: {name: 'ordered_list'},
              attrs: {listAttr: 'val'},
            };
          }
          return {type: {name: 'paragraph'}, attrs: {}};
        }),
        path: [0, 1, 2, 3, 4, 5, 6, 7],
      };
      const state = {
        selection: {from: 0, to: 5, $head},
        tr,
        schema: {
          nodes: {
            infoicon: {
              attrs: {foo: 'bar'},
              create: infoiconCreate,
            },
          },
        },
      } as unknown as EditorState;
      const infoIcon = {
        attrs: {},
        infoIcon: 'iconName',
        editorView: {state: {schema: mockSchema, doc: {content: []}}},
      };

      jest
        .spyOn(infoCommand, 'getFragm')
        .mockReturnValue(document.createDocumentFragment());

      const dispatch = jest.fn();
      infoCommand.executeWithUserInput(state, dispatch, undefined, infoIcon);

      expect(tr.setNodeMarkup).toHaveBeenCalledTimes(2);
      expect(dispatch).toHaveBeenCalled();
    });

    it('should also work when ancestor is a bullet_list', () => {
      (getNode as jest.Mock).mockReturnValue({type: 'someNode'});
      jest.spyOn(Fragment, 'from').mockReturnValue({} as unknown as Fragment);

      const infoiconCreate = jest.fn().mockReturnValue({type: 'infoiconNode'});
      const tr = {
        setSelection: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        setNodeMarkup: jest.fn().mockReturnThis(),
      };
      const $head = {
        depth: 2,
        node: jest.fn().mockImplementation((d) => {
          if (d === 2) {
            return {
              type: {name: 'bullet_list'},
              attrs: {bulletAttr: 'x'},
            };
          }
          return {type: {name: 'paragraph'}, attrs: {}};
        }),
        path: [0, 1, 2, 3, 4, 5, 6, 7],
      };
      const state = {
        selection: {from: 0, to: 5, $head},
        tr,
        schema: {
          nodes: {
            infoicon: {
              attrs: {foo: 'bar'},
              create: infoiconCreate,
            },
          },
        },
      } as unknown as EditorState;
      const infoIcon = {
        attrs: {},
        infoIcon: 'iconName',
        editorView: {state: {schema: mockSchema, doc: {content: []}}},
      };

      jest
        .spyOn(infoCommand, 'getFragm')
        .mockReturnValue(document.createDocumentFragment());

      const dispatch = jest.fn();
      infoCommand.executeWithUserInput(state, dispatch, undefined, infoIcon);

      expect(tr.setNodeMarkup).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeCustomStyleForTable', () => {
    it('should return the same transform unchanged', () => {
      const tr = {marker: 'tr-instance'} as unknown as Transform;
      const result = infoCommand.executeCustomStyleForTable(
        {} as EditorState,
        tr,
        0,
        5
      );
      expect(result).toBe(tr);
    });
  });

  it('should handle cancel', () => {
    expect(infoCommand.cancel()).toBeNull();
  });

  describe('createInfoIconAttrs', () => {
    it('should build attrs with from, to, description and infoIcon', () => {
      const infoIcon = {attrs: {someAttr: 'a'}, infoIcon: 'myIcon'};
      const result = infoCommand.createInfoIconAttrs(
        1,
        5,
        'desc',
        infoIcon
      ) as {
        from: number;
        to: number;
        description: string;
        infoIcon: string;
      };
      expect(result.from).toBe(1);
      expect(result.to).toBe(5);
      expect(result.description).toBe('desc');
      expect(result.infoIcon).toBe('myIcon');
    });
  });

  it('should handle getFragm', () => {
    jest.spyOn(infoCommand, 'getDocContent').mockReturnValue([]);
    expect(
      infoCommand.getFragm({
        editorView: {state: {doc: {content: {}}, schema: mockSchema}},
      })
    ).toBeDefined();
  });

  describe('getDocContent', () => {
    it('should return doc content from editorView state', () => {
      const content = {items: [1, 2, 3]};
      const infoIcon = {editorView: {state: {doc: {content}}}};
      expect(infoCommand.getDocContent(infoIcon)).toBe(content);
    });
  });

  describe('isList', () => {
    it('should return true when node type is ordered_list', () => {
      const $head = {node: () => ({type: {name: 'ordered_list'}})};
      expect(infoCommand.isList($head, 1)).toBe(true);
    });

    it('should return true when node type is bullet_list', () => {
      const $head = {node: () => ({type: {name: 'bullet_list'}})};
      expect(infoCommand.isList($head, 1)).toBe(true);
    });

    it('should return false for non-list node types', () => {
      const $head = {node: () => ({type: {name: 'paragraph'}})};
      expect(infoCommand.isList($head, 1)).toBe(false);
    });
  });

  describe('getParentNodeSize', () => {
    it('should return parent nodeSize minus 2', () => {
      const state = {
        selection: {$head: {parent: {nodeSize: 10}}},
      } as unknown as EditorState;
      expect(infoCommand.getParentNodeSize(state)).toBe(8);
    });
  });

  describe('getParentStartPos', () => {
    it('should return pos minus parentOffset', () => {
      const head = {pos: 15, parentOffset: 5};
      expect(infoCommand.getParentStartPos(head)).toBe(10);
    });
  });

  it('should handle renderLabel', () => {
    expect(infoCommand.renderLabel()).toBeUndefined();
  });

  it('should handle isActive and return false', () => {
    expect(infoCommand.isActive()).toBe(false);
  });

  it('should handle executeCustom and return tr unchanged', () => {
    const tr = {key: 'value'} as unknown as Transform;
    expect(
      infoCommand.executeCustom(
        {state: {schema: null}} as unknown as EditorState,
        tr
      )
    ).toBe(tr);
  });
});