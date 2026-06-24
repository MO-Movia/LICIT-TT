/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {
  FloatingMenuPlugin,
  getDecorations,
  positionAboveOrBelow,
  closeExistingPopup,
  createOnCloseHandler,
  openFloatingMenu,
  stepAddsParagraph,
  shouldRescanDecorations,
  getClosestHTMLElement,
  createHamburgerWidget,
  createDecorationMarksWidget,
  createPointerDownHandler,
  createContextMenuHandler,
  createOutsideClickHandler,
  isFloatingMenuParagraphParent,
} from './FloatingMenuPlugin';
import {Plugin, EditorState, Transaction} from 'prosemirror-state';
import {Node, NodeType, Schema} from 'prosemirror-model';
import {DecorationSet, EditorView} from 'prosemirror-view';
import {CMPluginKey} from './model';

// Mock external dependencies
jest.mock('../../commands/ui/createPopUp', () => ({
  createPopUp: jest.fn(),
  PopUpHandle: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
  })),
  Rect: {},
}));

jest.mock('../../core/KeyCommand', () => ({
  createKeyMapPlugin: jest.fn(() => []),
  makeKeyMapWithCommon: jest.fn((prefix, keys) => ({
    common: `${prefix}_${keys}`,
  })),
}));

jest.mock('./FloatingPopup', () => ({
  FloatingMenu: jest.fn(() => 'mocked-floating-menu'),
}));

import { createKeyMapPlugin } from '../../core/KeyCommand';
import { createPopUp } from '../../commands/ui/createPopUp';

describe('FloatingMenuPlugin', () => {
  describe('Helper functions', () => {
    describe('stepAddsParagraph', () => {
      it('should return false for non-array content', () => {
        expect(stepAddsParagraph(null)).toBe(false);
        expect(stepAddsParagraph(undefined)).toBe(false);
        expect(stepAddsParagraph('string')).toBe(false);
        expect(stepAddsParagraph(123)).toBe(false);
        expect(stepAddsParagraph({})).toBe(false);
      });

      it('should return false for empty array', () => {
        expect(stepAddsParagraph([])).toBe(false);
      });

      it('should return true when content contains paragraph type', () => {
        const content = [{type: 'paragraph'}];
        expect(stepAddsParagraph(content)).toBe(true);
      });

      it('should return true when nested content contains paragraph type', () => {
        const content = [{type: 'text', content: [{type: 'paragraph'}]}];
        expect(stepAddsParagraph(content)).toBe(true);
      });

      it('should return false when content does not contain paragraph type', () => {
        const content = [{type: 'text'}, {type: 'heading'}];
        expect(stepAddsParagraph(content)).toBe(false);
      });

      it('should handle invalid items in array', () => {
        expect(stepAddsParagraph([null])).toBe(false);
        expect(stepAddsParagraph([undefined])).toBe(false);
        expect(stepAddsParagraph(['string'])).toBe(false);
        expect(stepAddsParagraph([123])).toBe(false);
      });

      it('should handle deeply nested content', () => {
        const content = [
          {
            type: 'text',
            content: [
              {
                type: 'text',
                content: [{type: 'paragraph'}],
              },
            ],
          },
        ];
        expect(stepAddsParagraph(content)).toBe(true);
      });
    });

    describe('shouldRescanDecorations', () => {
      it('should return true when forceRescan meta is set', () => {
        const mockTr = {
          getMeta: jest.fn(() => ({forceRescan: true})),
          steps: [],
        } as unknown as Transaction;

        expect(shouldRescanDecorations(mockTr)).toBe(true);
      });

      it('should return true for setNodeMarkup step type', () => {
        const mockTr = {
          getMeta: jest.fn(() => undefined),
          steps: [
            {
              toJSON: () => ({stepType: 'setNodeMarkup'}),
            },
          ],
        } as unknown as Transaction;

        expect(shouldRescanDecorations(mockTr)).toBe(true);
      });

      it('should return true for replaceAround step type', () => {
        const mockTr = {
          getMeta: jest.fn(() => undefined),
          steps: [
            {
              toJSON: () => ({stepType: 'replaceAround'}),
            },
          ],
        } as unknown as Transaction;

        expect(shouldRescanDecorations(mockTr)).toBe(true);
      });

      it('should return true for replace step type with paragraph content', () => {
        const mockTr = {
          getMeta: jest.fn(() => undefined),
          steps: [
            {
              toJSON: () => ({
                stepType: 'replace',
                slice: {content: [{type: 'paragraph'}]},
              }),
            },
          ],
        } as unknown as Transaction;

        expect(shouldRescanDecorations(mockTr)).toBe(true);
      });

      it('should return false for replace step type without paragraph content', () => {
        const mockTr = {
          getMeta: jest.fn(() => undefined),
          steps: [
            {
              toJSON: () => ({
                stepType: 'replace',
                slice: {content: [{type: 'text'}]},
              }),
            },
          ],
        } as unknown as Transaction;

        expect(shouldRescanDecorations(mockTr)).toBe(false);
      });

      it('should return false for other step types', () => {
        const mockTr = {
          getMeta: jest.fn(() => undefined),
          steps: [
            {
              toJSON: () => ({stepType: 'otherType'}),
            },
          ],
        } as unknown as Transaction;

        expect(shouldRescanDecorations(mockTr)).toBe(false);
      });

      it('should return false for empty steps', () => {
        const mockTr = {
          getMeta: jest.fn(() => undefined),
          steps: [],
        } as unknown as Transaction;

        expect(shouldRescanDecorations(mockTr)).toBe(false);
      });
    });

    describe('getClosestHTMLElement', () => {
      it('should return null for non-Element targets', () => {
        expect(getClosestHTMLElement(null, '.test')).toBeNull();
        expect(getClosestHTMLElement('string' as unknown as EventTarget, '.test')).toBeNull();
        expect(getClosestHTMLElement(123 as unknown as EventTarget, '.test')).toBeNull();
      });

      it('should return matching HTMLElement', () => {
        const div = document.createElement('div');
        div.className = 'test-class';
        expect(getClosestHTMLElement(div, '.test-class')).toBe(div);
      });

      it('should return null when no match found', () => {
        const div = document.createElement('div');
        div.className = 'other-class';
        expect(getClosestHTMLElement(div, '.test-class')).toBeNull();
      });

      it('should find closest ancestor matching selector', () => {
        const child = document.createElement('span');
        const parent = document.createElement('div');
        parent.className = 'test-class';
        parent.appendChild(child);
        expect(getClosestHTMLElement(child, '.test-class')).toBe(parent);
      });

      it('should return null when closest is not HTMLElement', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('test-class');
        // SVG elements are Elements but not HTMLElements in some contexts
        const result = getClosestHTMLElement(svg, '.test-class');
        expect(result === null || result instanceof HTMLElement).toBeTruthy();
      });
    });

    describe('createHamburgerWidget', () => {
      it('should create a hamburger decoration widget', () => {
        const mockNode = {
          type: {name: 'paragraph'},
          attrs: {objectId: 'test-id'},
        } as unknown as Node;
        
        const widget = createHamburgerWidget(5, mockNode);
        expect(widget).toBeDefined();
        expect(widget.spec).toBeDefined();
      });

      it('should use objectId when available', () => {
        const mockNode = {
          type: {name: 'paragraph'},
          attrs: {objectId: 'test-id'},
        } as unknown as Node;
        
        const widget = createHamburgerWidget(5, mockNode);
        expect(widget.spec.key).toBe('float-icon-test-id');
      });

      it('should use position when objectId is not available', () => {
        const mockNode = {
          type: {name: 'paragraph'},
          attrs: {},
        } as unknown as Node;
        
        const widget = createHamburgerWidget(5, mockNode);
        expect(widget.spec.key).toBe('float-icon-5');
      });
    });

    describe('createDecorationMarksWidget', () => {
      it('should create a decoration marks widget', () => {
        const mockNode = {
          type: {name: 'paragraph'},
          attrs: {objectId: 'test-id'},
        } as unknown as Node;
        
        const mockElements = [document.createElement('span')];
        const widget = createDecorationMarksWidget(5, mockNode, mockElements);
        expect(widget).toBeDefined();
        expect(widget.spec).toBeDefined();
      });

      it('should use objectId when available', () => {
        const mockNode = {
          type: {name: 'paragraph'},
          attrs: {objectId: 'test-id'},
        } as unknown as Node;
        
        const mockElements = [document.createElement('span')];
        const widget = createDecorationMarksWidget(5, mockNode, mockElements);
        expect(widget.spec.key).toBe('float-marks-test-id');
      });

      it('should use position when objectId is not available', () => {
        const mockNode = {
          type: {name: 'paragraph'},
          attrs: {},
        } as unknown as Node;
        
        const mockElements = [document.createElement('span')];
        const widget = createDecorationMarksWidget(5, mockNode, mockElements);
        expect(widget.spec.key).toBe('float-marks-5');
      });
    });

    describe('createPointerDownHandler', () => {
      it('should handle float-icon click', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockView = {
          dom: document.createElement('div'),
          editable: true,
        } as unknown as EditorView;
        
        const mockMenuItems = [{label: 'Test', onClick: jest.fn()}];
        const handler = createPointerDownHandler(mockPlugin, mockView, mockMenuItems);
        
        const icon = document.createElement('span');
        icon.className = 'float-icon';
        icon.dataset.pos = '10';
        
        const mockEvent = {
          target: icon,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as PointerEvent;
        
        handler(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
      });

      it('should not handle non-float-icon clicks', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockView = {
          dom: document.createElement('div'),
          editable: true,
        } as unknown as EditorView;
        
        const mockMenuItems = [{label: 'Test', onClick: jest.fn()}];
        const handler = createPointerDownHandler(mockPlugin, mockView, mockMenuItems);
        
        const div = document.createElement('div');
        
        const mockEvent = {
          target: div,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as PointerEvent;
        
        handler(mockEvent);
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('createContextMenuHandler', () => {
      it('should handle alt + right click', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockView = {
          dom: document.createElement('div'),
          editable: true,
        } as unknown as EditorView;
        
        const mockMenuItems = [{label: 'Test', onClick: jest.fn()}];
        const handler = createContextMenuHandler(mockPlugin, mockView, mockMenuItems);
        
        const mockEvent = {
          altKey: true,
          button: 2,
          clientX: 100,
          clientY: 200,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as MouseEvent;
        
        handler(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
      });

      it('should not handle without alt key', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockView = {
          dom: document.createElement('div'),
          editable: true,
        } as unknown as EditorView;
        
        const mockMenuItems = [{label: 'Test', onClick: jest.fn()}];
        const handler = createContextMenuHandler(mockPlugin, mockView, mockMenuItems);
        
        const mockEvent = {
          altKey: false,
          button: 2,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as MouseEvent;
        
        handler(mockEvent);
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      });

      it('should not handle when view is not editable', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockView = {
          dom: document.createElement('div'),
          editable: false,
        } as unknown as EditorView;
        
        const mockMenuItems = [{label: 'Test', onClick: jest.fn()}];
        const handler = createContextMenuHandler(mockPlugin, mockView, mockMenuItems);
        
        const mockEvent = {
          altKey: true,
          button: 2,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
        } as unknown as MouseEvent;
        
        handler(mockEvent);
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('createOutsideClickHandler', () => {
      it('should close popup on outside click', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockClose = jest.fn();
        mockPlugin._popUpHandle = {close: mockClose, update: jest.fn()};
        
        const handler = createOutsideClickHandler(mockPlugin);
        
        const div = document.createElement('div');
        const mockEvent = {
          target: div,
        } as unknown as MouseEvent;
        
        handler(mockEvent);
        expect(mockClose).toHaveBeenCalledWith(null);
        expect(mockPlugin._popUpHandle).toBeNull();
      });

      it('should not close when clicking on context menu', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockClose = jest.fn();
        mockPlugin._popUpHandle = {close: mockClose, update: jest.fn()};
        
        const handler = createOutsideClickHandler(mockPlugin);
        
        const div = document.createElement('div');
        div.className = 'context-menu';
        const mockEvent = {
          target: div,
        } as unknown as MouseEvent;
        
        handler(mockEvent);
        expect(mockClose).not.toHaveBeenCalled();
      });

      it('should not close when clicking on float icon', () => {
        const mockPlugin = new FloatingMenuPlugin();
        const mockClose = jest.fn();
        mockPlugin._popUpHandle = {close: mockClose, update: jest.fn()};
        
        const handler = createOutsideClickHandler(mockPlugin);
        
        const div = document.createElement('div');
        div.className = 'float-icon';
        const mockEvent = {
          target: div,
        } as unknown as MouseEvent;
        
        handler(mockEvent);
        expect(mockClose).not.toHaveBeenCalled();
      });

      it('should handle null popUpHandle', () => {
        const mockPlugin = new FloatingMenuPlugin();
        mockPlugin._popUpHandle = null;
        
        const handler = createOutsideClickHandler(mockPlugin);
        
        const div = document.createElement('div');
        const mockEvent = {
          target: div,
        } as unknown as MouseEvent;
        
        expect(() => handler(mockEvent)).not.toThrow();
      });
    });
  });

  describe('state.apply method branches', () => {
    it('should rescan decorations when forceRescan meta is set', () => {
      const mockTr = {
        getMeta: jest.fn(() => ({forceRescan: true})),
        steps: [],
        docChanged: false,
        mapping: {map: jest.fn()},
      } as unknown as Transaction;

      const mockPlugin = new FloatingMenuPlugin();
      const stateConfig = mockPlugin.spec.state;
      const result = stateConfig.apply(mockTr, {decorations: DecorationSet.empty}, {} as EditorState, {} as EditorState);
      
      expect(result.decorations).toBeDefined();
      expect(mockTr.getMeta).toHaveBeenCalledWith(CMPluginKey);
    });

    it('should map decorations when document has not changed and no forceRescan', () => {
      const mockDecorations = {
        map: jest.fn(() => mockDecorations),
      } as unknown as DecorationSet;
      const mockTr = {
        getMeta: jest.fn(() => undefined),
        steps: [],
        docChanged: false,
        mapping: {map: jest.fn((pos: unknown) => pos)},
        doc: {},
      } as unknown as Transaction;

      const mockPlugin = new FloatingMenuPlugin();
      const stateConfig = mockPlugin.spec.state;
      const result = stateConfig.apply(mockTr, {decorations: mockDecorations}, {} as EditorState, {} as EditorState);
      
      expect(result.decorations).toBeDefined();
      expect(mockDecorations.map).toHaveBeenCalled();
    });

    it('should rescan when document changed and shouldRescanDecorations returns true', () => {
      const mockDoc = {
        descendants: jest.fn(),
      } as unknown as Node;
      const mockTr = {
        getMeta: jest.fn(() => undefined),
        steps: [
          {
            toJSON: () => ({stepType: 'setNodeMarkup'}),
          },
        ],
        docChanged: true,
        mapping: {map: jest.fn()},
        doc: mockDoc,
      } as unknown as Transaction;

      const mockPlugin = new FloatingMenuPlugin();
      const stateConfig = mockPlugin.spec.state;
      const newState = {doc: mockDoc} as unknown as EditorState;
      const result = stateConfig.apply(mockTr, {decorations: DecorationSet.empty}, {} as EditorState, newState);
      
      expect(result.decorations).toBeDefined();
    });

    it('should map decorations when document changed but shouldRescanDecorations returns false', () => {
      const mockDecorations = {
        map: jest.fn(() => mockDecorations),
      } as unknown as DecorationSet;
      const mockTr = {
        getMeta: jest.fn(() => undefined),
        steps: [
          {
            toJSON: () => ({stepType: 'otherType'}),
          },
        ],
        docChanged: true,
        mapping: {map: jest.fn((pos: unknown) => pos)},
        doc: {},
      } as unknown as Transaction;

      const mockPlugin = new FloatingMenuPlugin();
      const stateConfig = mockPlugin.spec.state;
      const result = stateConfig.apply(mockTr, {decorations: mockDecorations}, {} as EditorState, {} as EditorState);
      
      expect(result.decorations).toBeDefined();
      expect(mockDecorations.map).toHaveBeenCalled();
    });

    it('should handle missing getMeta function', () => {
      const mockTr = {
        steps: [],
        docChanged: false,
        mapping: {map: jest.fn((pos: unknown) => pos)},
        doc: {},
      } as unknown as Transaction;

      const mockPlugin = new FloatingMenuPlugin();
      const stateConfig = mockPlugin.spec.state;
      const result = stateConfig.apply(mockTr, {decorations: DecorationSet.empty}, {} as EditorState, {} as EditorState);
      
      expect(result.decorations).toBeDefined();
    });
  });

  describe('getDecorations', () => {
    let mockDoc: Partial<Node>;
    let mockState: Partial<EditorState>;

    beforeEach(() => {
      mockState = {
        doc: {} as Node,
      };

      mockDoc = {
        descendants: jest.fn(),
        type: {name: 'doc'} as unknown as NodeType,
      };
    });

    it('should skip non-paragraph nodes', () => {
      const mockHeading = {
        type: {name: 'heading'},
        attrs: {objectId: 'head1'},
      } as unknown as Node;

      mockDoc.descendants = jest.fn((callback: (node: Node, pos: number, parent: Node | null, index: number) => unknown) => {
        callback(mockHeading, 0, mockDoc as Node, 0);
      });

      // Mock DecorationSet.create to return empty set
      jest.spyOn(DecorationSet, 'create').mockReturnValue(DecorationSet.empty);
      
      getDecorations(mockDoc as Node, mockState as EditorState);
      expect(mockDoc.descendants).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });

    it('should handle null doc', () => {
      jest.spyOn(DecorationSet, 'create').mockReturnValue(DecorationSet.empty);
      
      const decorations = getDecorations(null!, mockState as EditorState);
      expect(decorations).toBeDefined();
      
      jest.restoreAllMocks();
    });

    it('should iterate over document nodes', () => {
      mockDoc.descendants = jest.fn();
      
      jest.spyOn(DecorationSet, 'create').mockReturnValue(DecorationSet.empty);
      
      getDecorations(mockDoc as Node, mockState as EditorState);
      expect(mockDoc.descendants).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });

    it('should skip paragraphs without valid parent', () => {
      const mockParagraph = {
        type: {name: 'paragraph'},
        attrs: {objectId: 'para1'},
      } as unknown as Node;

      const mockInvalidParent = {
        type: {name: 'invalid_parent'},
      } as unknown as Node;

      mockDoc.descendants = jest.fn((callback: (node: Node, pos: number, parent: Node | null, index: number) => unknown) => {
        callback(mockParagraph, 0, mockInvalidParent, 0);
      });

      jest.spyOn(DecorationSet, 'create').mockReturnValue(DecorationSet.empty);
      
      getDecorations(mockDoc as Node, mockState as EditorState);
      expect(mockDoc.descendants).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });

    it('should process paragraphs with doc parent', () => {
      const mockParagraph = {
        type: {name: 'paragraph'},
        attrs: {objectId: 'para1'},
      } as unknown as Node;

      const mockDocParent = {
        type: {name: 'doc'},
      } as unknown as Node;

      mockDoc.descendants = jest.fn((callback: (node: Node, pos: number, parent: Node | null, index: number) => unknown) => {
        callback(mockParagraph, 0, mockDocParent, 0);
      });

      jest.spyOn(DecorationSet, 'create').mockReturnValue(DecorationSet.empty);
      
      getDecorations(mockDoc as Node, mockState as EditorState);
      expect(mockDoc.descendants).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });

    it('should process paragraphs with landscape_section parent', () => {
      const mockParagraph = {
        type: {name: 'paragraph'},
        attrs: {objectId: 'para1'},
      } as unknown as Node;

      const mockLandscapeParent = {
        type: {name: 'landscape_section'},
      } as unknown as Node;

      mockDoc.descendants = jest.fn((callback: (node: Node, pos: number, parent: Node | null, index: number) => unknown) => {
        callback(mockParagraph, 0, mockLandscapeParent, 0);
      });

      jest.spyOn(DecorationSet, 'create').mockReturnValue(DecorationSet.empty);
      
      getDecorations(mockDoc as Node, mockState as EditorState);
      expect(mockDoc.descendants).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });
  });

  describe('isFloatingMenuParagraphParent', () => {
    it('should return true for doc parent', () => {
      const mockParent = {
        type: {name: 'doc'},
      } as unknown as Node;
      
      expect(isFloatingMenuParagraphParent(mockParent)).toBe(true);
    });

    it('should return true for landscape_section parent', () => {
      const mockParent = {
        type: {name: 'landscape_section'},
      } as unknown as Node;
      
      expect(isFloatingMenuParagraphParent(mockParent)).toBe(true);
    });

    it('should return false for other parent types', () => {
      const mockParent = {
        type: {name: 'other_type'},
      } as unknown as Node;
      
      expect(isFloatingMenuParagraphParent(mockParent)).toBe(false);
    });

    it('should return false for null parent', () => {
      expect(isFloatingMenuParagraphParent(null)).toBe(false);
    });

    it('should return false for parent without type', () => {
      const mockParent = {} as unknown as Node;
      
      expect(isFloatingMenuParagraphParent(mockParent)).toBe(false);
    });

    it('should return false for parent with null type', () => {
      const mockParent = {
        type: null,
      } as unknown as Node;
      
      expect(isFloatingMenuParagraphParent(mockParent)).toBe(false);
    });

    it('should return false for parent with type without name', () => {
      const mockParent = {
        type: {},
      } as unknown as Node;
      
      expect(isFloatingMenuParagraphParent(mockParent)).toBe(false);
    });
  });

  describe('positionAboveOrBelow', () => {
    beforeEach(() => {
      // Mock window dimensions
      Object.defineProperty(globalThis, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(globalThis, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
    });

    it('should return default position when anchorRect is not provided', () => {
      const result = positionAboveOrBelow();
      expect(result).toEqual({x: 4, y: 4, w: 0, h: 0});
    });

    it('should position menu below anchor when there is enough space', () => {
      const anchorRect = {x: 100, y: 100, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180, h: 220};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.y).toBeGreaterThan(anchorRect.y + anchorRect.h);
    });

    it('should position menu above anchor when space below is insufficient', () => {
      const anchorRect = {x: 100, y: 900, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180, h: 220};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.y).toBeLessThan(anchorRect.y);
    });

    it('should use default dimensions when bodyRect is not provided', () => {
      const anchorRect = {x: 100, y: 100, w: 50, h: 20};
      const result = positionAboveOrBelow(anchorRect);
      expect(result.w).toBe(180);
      expect(result.h).toBe(220);
    });

    it('should adjust horizontal position to prevent overflow', () => {
      const anchorRect = {x: 1100, y: 100, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 200, h: 220};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.x).toBeLessThanOrEqual(window.innerWidth - 200 - 6);
    });

    it('should ensure minimum horizontal position', () => {
      const anchorRect = {x: 0, y: 100, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180, h: 220};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.x).toBeGreaterThanOrEqual(6);
    });

    it('should ensure minimum vertical position', () => {
      const anchorRect = {x: 100, y: 0, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180, h: 220};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.y).toBeGreaterThanOrEqual(6);
    });

    it('should round coordinates', () => {
      const anchorRect = {x: 100.5, y: 100.7, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180.3, h: 220.9};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.x).toBe(Math.round(result.x));
      expect(result.y).toBe(Math.round(result.y));
      expect(result.w).toBe(Math.round(result.w));
      expect(result.h).toBe(Math.round(result.h));
    });

    it('should adjust vertical position when menu exceeds viewport height', () => {
      const anchorRect = {x: 100, y: 950, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180, h: 300};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.y).toBeLessThanOrEqual(window.innerHeight - 300 - 6);
    });

    it('should handle case when both space above and below are insufficient', () => {
      const anchorRect = {x: 100, y: 500, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180, h: 600};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.y).toBeGreaterThanOrEqual(6);
    });

    it('should handle zero body dimensions', () => {
      const anchorRect = {x: 100, y: 100, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 0, h: 0};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.w).toBe(180);
      expect(result.h).toBe(220);
    });

    it('should handle negative anchor coordinates', () => {
      const anchorRect = {x: -10, y: -5, w: 50, h: 20};
      const bodyRect = {x: 0, y: 0, w: 180, h: 220};

      const result = positionAboveOrBelow(anchorRect, bodyRect);
      expect(result.x).toBeGreaterThanOrEqual(6);
      expect(result.y).toBeGreaterThanOrEqual(6);
    });
  });

  describe('closeExistingPopup', () => {
    it('should close popup when popUpHandle exists', () => {
      const mockPlugin = new FloatingMenuPlugin();
      const mockClose = jest.fn();
      mockPlugin._popUpHandle = {close: mockClose, update: jest.fn()};

      closeExistingPopup(mockPlugin);
      expect(mockClose).toHaveBeenCalledWith(null);
    });

    it('should handle null popUpHandle', () => {
      const mockPlugin = new FloatingMenuPlugin();
      mockPlugin._popUpHandle = null;

      expect(() => closeExistingPopup(mockPlugin)).not.toThrow();
    });
  });

  describe('createOnCloseHandler', () => {
    it('should clear popUpHandle and remove popup-open class', () => {
      const mockPlugin = new FloatingMenuPlugin();
      mockPlugin._popUpHandle = {} as unknown as null;
      
      const mockAnchorEl = document.createElement('div');
      mockAnchorEl.className = 'pm-hamburger-wrapper popup-open';
      
      const handler = createOnCloseHandler(mockPlugin, mockAnchorEl);
      handler();
      
      expect(mockPlugin._popUpHandle).toBeNull();
      expect(mockAnchorEl.classList.contains('popup-open')).toBe(false);
    });

    it('should handle null anchorEl', () => {
      const mockPlugin = new FloatingMenuPlugin();
      mockPlugin._popUpHandle = {} as unknown as null;
      
      const handler = createOnCloseHandler(mockPlugin);
      expect(() => handler()).not.toThrow();
      expect(mockPlugin._popUpHandle).toBeNull();
    });
  });

  describe('FloatingMenuPlugin class', () => {
    it('should create plugin with default menu items', () => {
      const plugin = new FloatingMenuPlugin();
      expect(plugin).toBeInstanceOf(Plugin);
    });

    it('should create plugin with custom menu items', () => {
      const customItems = [
        {
          label: 'Custom Item',
          onClick: jest.fn() as () => void,
        },
      ];
      const plugin = new FloatingMenuPlugin(customItems);
      expect(plugin).toBeInstanceOf(Plugin);
    });

    it('should create plugin with decoration marks', () => {
      const decorationMarks = [
        jest.fn(() => document.createElement('span')),
      ];
      const plugin = new FloatingMenuPlugin([], decorationMarks);
      expect(plugin).toBeInstanceOf(Plugin);
    });

    it('should initialize state with decorations', () => {
      const mockDoc = {descendants: jest.fn()} as unknown as Node;
      const mockState = {doc: mockDoc} as EditorState;
      
      jest.spyOn(DecorationSet, 'create').mockReturnValue(DecorationSet.empty);
      
      const plugin = new FloatingMenuPlugin();
      const stateConfig = plugin.spec.state;
      
      const initialState = stateConfig.init({}, mockState);
      expect(initialState).toBeDefined();
      expect(initialState.decorations).toBeDefined();
      
      jest.restoreAllMocks();
    });

    it('should provide decorations through props', () => {
      const plugin = new FloatingMenuPlugin();
      const props = plugin.spec.props;
      
      const mockState = {} as EditorState;
      const result = props.decorations.call(plugin, mockState);
      // The function should handle the case when pluginState is undefined
      expect(result).toBeUndefined();
    });

    describe('initKeyCommands', () => {
      it('should create keymap plugins for items with hotKeys', () => {
        const menuItems = [
          {
            label: 'Copy',
            onClick: jest.fn(),
            hotKeys: 'Mod-c',
          },
          {
            label: 'Paste',
            onClick: jest.fn(),
          },
        ];
        const plugin = new FloatingMenuPlugin(menuItems);
        
        plugin.initKeyCommands();
        expect(createKeyMapPlugin).toHaveBeenCalled();
      });

      it('should return empty array when no items have hotKeys', () => {
        const menuItems = [
          {
            label: 'Item',
            onClick: jest.fn(),
          },
        ];
        const plugin = new FloatingMenuPlugin(menuItems);
        
        const keyPlugins = plugin.initKeyCommands();
        expect(keyPlugins).toEqual([]);
      });
    });

    describe('getEffectiveSchema', () => {
      it('should return the schema unchanged', () => {
        const plugin = new FloatingMenuPlugin();
        const mockSchema = new Schema({
          nodes: {
            doc: {content: 'paragraph+'},
            paragraph: {content: 'text*'},
            text: {group: 'inline'},
          },
        });
        
        const result = plugin.getEffectiveSchema(mockSchema);
        expect(result).toBe(mockSchema);
      });
    });
  });

  describe('openFloatingMenu (integration)', () => {
    it('should create popup with correct parameters', () => {
      const mockPlugin = new FloatingMenuPlugin();
      const mockView = {
        state: {},
        dom: document.createElement('div'),
      } as unknown as EditorView;
      
      const mockItems = [
        {
          label: 'Test',
          onClick: jest.fn(),
        },
      ];

      openFloatingMenu(mockPlugin, mockView, mockItems, 0, undefined, {x: 100, y: 100});
      
      expect(createPopUp).toHaveBeenCalled();
    });

    it('should close existing popup before opening new one', () => {
      const closeSpy = jest.fn();
      const mockPlugin = new FloatingMenuPlugin();
      mockPlugin._popUpHandle = {close: closeSpy, update: jest.fn()};
      
      const mockView = {
        state: {},
        dom: document.createElement('div'),
      } as unknown as EditorView;
      
      const mockItems = [{label: 'Test', onClick: jest.fn()}];

      openFloatingMenu(mockPlugin, mockView, mockItems);
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
