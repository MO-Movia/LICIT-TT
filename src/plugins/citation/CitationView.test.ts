/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { CitationView } from './CitationView'; // Import CreateCitationObject type
import { Node, Mark } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { Selection } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { CapcoService } from './Constants';

describe('CitationView', () => {
  const citationView = new CitationView(
    {
      type: {
        spec: {
          toDOM: () => {
            return 'Test';
          },
        },
      },
    } as unknown as Node,
    {} as unknown as EditorView,
    () => undefined,
    {} as CapcoService<unknown>
  );

  it('should handle CitationView and showSourceText when classlist null', () => {
    citationView.dom = { classList: null } as unknown as Element;
    expect(
      citationView.showSourceText({} as unknown as MouseEvent)
    ).toBeUndefined();
  });
  it('should handle CitationView and showSourceText when classlist is empty', () => {
    expect(
      citationView.showSourceText({
        clientY: {},
        offsetY: 0,
      } as unknown as MouseEvent)
    ).toBeUndefined();
  });
  it('should handle CitationView and showSourceText when offsetY greater than 1', () => {
    expect(
      citationView.showSourceText({
        clientY: {},
        offsetY: 0.5,
      } as unknown as MouseEvent)
    ).toBeUndefined();
  });
  it('should return true when pNode is not null and pNode.type.name is CITATION_NOTE', () => {
    const pNode = {
      type: {
        name: 'citationnote',
      },
    } as unknown as Node;

    const result = citationView.parentNodeType(pNode);

    expect(result).toBe(true);
  });
  it('should return false when pNode is null', () => {
    const result = citationView.parentNodeType(null);

    expect(result).toBe(false);
  });
  it('should return false when pNode.type.name is not CITATION_NOTE', () => {
    const pNode = {
      type: {
        name: 'SOME_OTHER_NODE',
      },
    } as unknown as Node;

    const result = citationView.parentNodeType(pNode);

    expect(result).toBe(false);
  });
  it('should return the name of the node after the selection', () => {
    const nodeAfter = {
      type: {
        name: 'SOME_NODE_TYPE',
      },
    };
    const selection = {
      $head: {
        nodeAfter: nodeAfter,
      },
    } as unknown as Selection;

    const result = citationView.getNameAfter(selection);

    expect(result).toBe('SOME_NODE_TYPE');
  });
  it('should return the name of the node after the selection 2', () => {
    const nodeAfter = {
      type: {
        name: 'SOME_NODE_TYPE',
      },
    };
    const selection = {
      $head: {
        nodeAfter: nodeAfter,
      },
    } as unknown as Selection;

    const result = citationView.getNameAfter(selection);

    expect(result).toBe('SOME_NODE_TYPE');
  });
  it('stopEvent', () => {
    citationView.dom = { classList: null } as unknown as Element;
    const result = citationView.stopEvent({} as unknown as MouseEvent);
    expect(result).toBe(false);
  });
  it('ignoreMutation', () => {
    citationView.dom = { classList: null } as unknown as Element;
    const result = citationView.ignoreMutation();
    expect(result).toBe(true);
  });
  it('should return a number on calling getFromValue', () => {
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    const e = {
      currentTarget: element,
    } as unknown as MouseEvent;
    expect(citationView.getFromValue(e)).toBe(42);
  });
  it('should return objPos on calling getNodePosEx', () => {
    citationView.outerView = {
      posAtCoords: () => {
        return { pos: 1 };
      },
    } as unknown as EditorView;
    expect(citationView.getNodePosEx(0, 1)).toBe(1);
  });
  it('should return null on calling getNodePosEx', () => {
    citationView.outerView = {
      posAtCoords: () => {
        return null;
      },
    } as unknown as EditorView;
    expect(citationView.getNodePosEx(0, 1)).toBe(null);
  });
  it('should handle hideSourceText when is molcit-citation-submenu-body', () => {
    citationView.outerView = {
      state: { selection: { from: 0 } },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    element.className = 'molcit-citation-submenu-body';
    const e = {
      currentTarget: element,
      target: element,
    } as unknown as MouseEvent;
    expect(citationView.hideSourceText(e)).toBeUndefined();
  });
  it('should handle hideSourceText when className is not molcit-citation-submenu-body', () => {
    citationView.outerView = {
      state: { selection: { from: 0 } },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    element.className = 'molcit';
    const e = {
      currentTarget: element,
      target: element,
    } as unknown as MouseEvent;
    expect(citationView.hideSourceText(e)).toBeUndefined();
  });
  it('should handle hideSourceText when e is null', () => {
    citationView._popUp_subMenu = {
      close: () => {
        return {};
      },
      update: () => {
        return {};
      },
    };
    citationView.outerView = {
      state: {
        selection: { from: 0, $head: { pos: 1 } },
        tr: {
          doc: {
            nodeAt: () => {
              return null;
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    element.className = 'molcit';
    const e = null as unknown as MouseEvent;
    expect(citationView.hideSourceText(e)).toBeUndefined();
  });
  it('should handle hideSourceText when className is not molcit-citation-submenu-body and e.offsetX < 0 and e.offsetY < 0', () => {
    citationView.outerView = {
      state: { selection: { from: 0 } },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    element.className = 'molcit';
    const e = {
      currentTarget: element,
      target: element,
      offsetX: -1,
      offsetY: -1,
    } as unknown as MouseEvent;
    expect(citationView.hideSourceText(e)).toBeUndefined();
  });
  it('should handle hideSourceText when className is not molcit-citation-submenu-body and e.offsetY > 0 && e.offsetX < 10', () => {
    citationView.outerView = {
      state: { selection: { from: 0 } },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    element.className = 'molcit';
    const e = {
      currentTarget: element,
      target: element,
      offsetX: 9,
      offsetY: 1,
    } as unknown as MouseEvent;
    expect(citationView.hideSourceText(e)).toBeUndefined();
  });
  it('should handle hideSourceText when className is not molcit-citation-submenu-body and e.offsetY > 0 && e.offsetX < 10 and null !== nodePos', () => {
    jest.spyOn(citationView, 'getNodePosEx').mockReturnValue(1);
    citationView.outerView = {
      state: {
        selection: { from: 0 },
        tr: {
          doc: {
            nodeAt: () => {
              return null;
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    element.className = 'molcit';
    const e = {
      currentTarget: element,
      target: element,
      offsetX: 9,
      offsetY: 1,
    } as unknown as MouseEvent;
    expect(citationView.hideSourceText(e)).toBeUndefined();
  });
  it('should handle hideSourceText when className is not molcit-citation-submenu-body and e.offsetY > 0 && e.offsetX < 10 and null !== nodePos and parentNode', () => {
    jest.spyOn(citationView, 'getNodePosEx').mockReturnValue(1);
    jest.spyOn(citationView, 'parentNodeType').mockReturnValue(true);
    jest.spyOn(citationView, 'getFromValue').mockReturnValue(1);
    jest.spyOn(citationView, 'updateMarks').mockImplementation(() => {
      return {};
    });
    citationView.outerView = {
      state: {
        schema: { nodes: { paragraph: '' } },
        selection: { from: 0 },
        tr: {
          doc: {
            nodeAt: () => {
              return { type: { name: 'paragraph' } };
            },
            resolve: () => {
              return {};
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const element = document.createElement('div');
    element.setAttribute('from', '42');
    element.className = 'molcit';
    const e = {
      currentTarget: element,
      target: element,
      offsetX: 9,
      offsetY: 1,
    } as unknown as MouseEvent;
    expect(citationView.hideSourceText(e)).toBeUndefined();
  });
  it('should handle getAppliedCustomStyle when from is null and CITATION_NOTE not equal parentNode.type.name', () => {
    citationView.outerView = {
      state: {
        schema: {
          nodes: { paragraph: '' },
          marks: {
            underline: '"test"',
            'mark-text-highlight': '"mark-text-highlight"',
          },
        },
        selection: {
          from: 0,
          $anchor: {
            parent: { attrs: { styleName: 'None' }, type: { name: 'test' } },
          },
        },
        tr: {
          selection: {
            $from: {
              before: () => {
                return {};
              },
            },
          },
          doc: {
            nodeAt: () => {
              return {
                type: { name: 'paragraph' },
                attrs: { styleName: 'test' },
              };
            },
            resolve: () => {
              return {
                parent: {
                  attrs: { styleName: 'None' },
                  type: { name: 'citationnote' },
                },
              };
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
      runtime: { styleProps: [{ styleName: 'test' }] },
    } as unknown as EditorView;
    expect(
      citationView.getAppliedCustomStyle(null)
    ).toStrictEqual(null);
  });
  it('should handle getAppliedHighlightCustomStyle and rfeturn test_colour', () => {
    citationView.outerView = {
      state: {
        schema: { nodes: { paragraph: '' } },
        selection: { from: 0 },
        tr: {
          doc: {
            nodeAt: () => {
              return { type: { name: 'paragraph' } };
            },
            resolve: () => {
              return { parent: { attrs: { styleName: 'bold' } } };
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const mark = {
      attrs: { highlightColor: 'test_colour' },
    } as unknown as Mark;
    expect(citationView.getAppliedHighlightCustomStyle(1, mark)).toBe(
      'test_colour'
    );
  });
  it('should handle getAppliedHighlightCustomStyle and return transparent', () => {
    citationView.outerView = {
      state: {
        schema: { nodes: { paragraph: '' } },
        selection: { from: 0 },
        tr: {
          doc: {
            nodeAt: () => {
              return { type: { name: 'paragraph' } };
            },
            resolve: () => {
              return { parent: { attrs: { styleName: 'None' } } };
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    const mark = {
      attrs: { highlightColor: 'test_colour' },
    } as unknown as Mark;
    expect(citationView.getAppliedHighlightCustomStyle(1, mark)).toBe(
      'transparent'
    );
  });
  it('should handle removeCitationMark', () => {
    const spy = jest
      .spyOn(citationView, 'getAppliedCustomStyle')
      .mockReturnValue({ styles: { underline: '' } });
    citationView.outerView = {
      state: {
        schema: {
          nodes: { paragraph: '' },
          marks: {
            underline: '"underline"',
            'mark-text-highlight': '"mark-text-highlight"',
          },
        },
        selection: { from: 0 },
        tr: {
          doc: {
            nodeAt: () => {
              return { type: { name: 'paragraph' } };
            },
            resolve: () => {
              return { parent: { attrs: { styleName: 'None' } } };
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    expect(
      citationView.removeCitationMark(
        {
          removeMark: () => {
            return {
              removeMark: () => {
                return {};
              },
            };
          },
        } as unknown as Transform,
        0,
        1
      )
    ).toStrictEqual({});
    spy.mockReset();
  });
  it("should handle removeCitationMark when  undefined === style.styles.underline ||'' === style.styles.underline not satisfied", () => {
    const spy = jest
      .spyOn(citationView, 'getAppliedCustomStyle')
      .mockReturnValue({ styles: { underline: 'test' } });
    citationView.outerView = {
      state: {
        schema: {
          nodes: { paragraph: '' },
          marks: {
            underline: '"test"',
            'mark-text-highlight': '"mark-text-highlight"',
          },
        },
        selection: { from: 0 },
        tr: {
          doc: {
            nodeAt: () => {
              return { type: { name: 'paragraph' } };
            },
            resolve: () => {
              return { parent: { attrs: { styleName: 'None' } } };
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    expect(
      citationView.removeCitationMark(
        {
          removeMark: () => {
            return {
              removeMark: () => {
                return {};
              },
            };
          },
        } as unknown as Transform,
        0,
        1
      )
    ).toBeDefined();
    spy.mockReset();
  });
  it("should handle removeCitationMark when  undefined === style.styles.underline ||'' === style.styles.underline not satisfied 2", () => {
    const spy = jest
      .spyOn(citationView, 'getAppliedCustomStyle')
      .mockReturnValue({});
    citationView.outerView = {
      state: {
        schema: {
          nodes: { paragraph: '' },
          marks: {
            underline: '"test"',
            'mark-text-highlight': '"mark-text-highlight"',
          },
        },
        selection: { from: 0 },
        tr: {
          doc: {
            nodeAt: () => {
              return { type: { name: 'paragraph' } };
            },
            resolve: () => {
              return { parent: { attrs: { styleName: 'None' } } };
            },
          },
        },
      },
      posAtCoords: () => {
        return null;
      },
      domAtPos: () => {
        return {};
      },
    } as unknown as EditorView;
    expect(
      citationView.removeCitationMark(
        {
          removeMark: () => {
            return {
              removeMark: () => {
                return {};
              },
            };
          },
        } as unknown as Transform,
        0,
        1
      )
    ).toStrictEqual({});
    spy.mockReset();
  });
  it('should handle selectNode', () => {
    const spy = jest.spyOn(citationView, 'destroyPopup');
    const e = { currentTarget: {} } as unknown as MouseEvent;
    citationView.selectNode(e);
    expect(spy).not.toHaveBeenCalled();
  });
  it('should handle selectNode when e?.currentTarget is null', () => {
    const spy = jest.spyOn(citationView, 'destroyPopup');
    citationView.dom = undefined;
    const e = { currentTarget: null } as unknown as MouseEvent;
    citationView.selectNode(e);
    expect(spy).toHaveBeenCalled();
  });
  it('should handle onCancel  and call view.focus', () => {
    const view1 = {
      focus: () => {
        return {};
      },
    } as unknown as EditorView;
    const spy = jest.spyOn(view1, 'focus');
    citationView.onCancel(view1);
    expect(spy).toHaveBeenCalled();
  });
  it('should handle createCitationObject', () => {
    expect(citationView.createCitationObject()).toBeDefined();
  });
  it('should handle onEditCitation', () => {
    expect(
      citationView.onEditCitation({} as unknown as EditorView)
    ).toBeUndefined();
  });
  it('should handle onRemoveCitation', () => {
    const view = {
      state: {
        tr: {
          selection: {
            $head: {
              pos: 0,
              nodeAfter: { attrs: { from: 0, to: 1 } },
              parentOffset: 4,
              parent: { attrs: {} },
            },
          },
        },
      },
      dispatch: () => {
        return {};
      },
    } as unknown as EditorView;
    const spy = jest.spyOn(citationView, 'removeCitationMark');
    jest.spyOn(citationView, 'removeCitationMark').mockReturnValue({
      delete: () => {
        return {
          setNodeMarkup: () => {
            return {};
          },
        };
      },
    } as unknown as Transform);
    jest.spyOn(citationView, 'getNameAfter').mockReturnValue('citationnote');
    citationView.onRemoveCitation(view);
    expect(spy).toHaveBeenCalled();
  });
  it('should handle onRemoveCitation when selection.$head.parent is null', () => {
    const view = {
      state: {
        tr: {
          selection: {
            $head: {
              pos: 0,
              nodeAfter: { attrs: { from: 0, to: 1 } },
              parentOffset: 4,
              parent: null,
            },
          },
        },
      },
      dispatch: () => {
        return {};
      },
    } as unknown as EditorView;
    const spy = jest.spyOn(citationView, 'removeCitationMark');
    jest.spyOn(citationView, 'removeCitationMark').mockReturnValue({
      delete: () => {
        return {
          setNodeMarkup: () => {
            return {};
          },
        };
      },
    } as unknown as Transform);
    jest.spyOn(citationView, 'getNameAfter').mockReturnValue('citationnote');
    citationView.onRemoveCitation(view);
    expect(spy).toHaveBeenCalled();
  });
  it('should handle onRemoveCitation when CITATION_NOTE != this.getNameAfter(selection)', () => {
    const view = {
      state: {
        tr: {
          selection: {
            $head: {
              pos: 0,
              nodeAfter: { attrs: { from: 0, to: 1 } },
              parentOffset: 4,
              parent: null,
            },
          },
        },
      },
      dispatch: () => {
        return {};
      },
    } as unknown as EditorView;
    const spy = jest.spyOn(citationView, 'removeCitationMark');
    jest.spyOn(citationView, 'removeCitationMark').mockReturnValue({
      delete: () => {
        return {
          setNodeMarkup: () => {
            return {};
          },
        };
      },
    } as unknown as Transform);
    jest.spyOn(citationView, 'getNameAfter').mockReturnValue('test');
    citationView.onRemoveCitation(view);
    expect(spy).not.toHaveBeenCalled();
  });
  it('should handle onCitationMouseOut and call destroyPopup', () => {
    const spy = jest.spyOn(citationView, 'destroyPopup');
    citationView.onCitationMouseOut();
    expect(spy).toHaveBeenCalled();
  });
  it('should handle updateCitation', () => {
    const view = {
      dispatch: () => {
        return {};
      },
      state: {
        tr: {
          setSelection: () => {
            return {
              setNodeMarkup: () => {
                return {};
              },
            };
          },
        },
      },
    } as unknown as EditorView;
    const spy1 = jest.spyOn(view, 'dispatch');
    citationView.updateCitation(view, {});
    expect(spy1).toHaveBeenCalled();
  });
  it('should handle updateCitation when citation null', () => {
    const view = {
      dispatch: () => {
        return {};
      },
      state: {
        tr: {
          setSelection: () => {
            return {
              setNodeMarkup: () => {
                return {};
              },
            };
          },
        },
      },
    } as unknown as EditorView;
    const spy1 = jest.spyOn(view, 'dispatch');
    citationView.updateCitation(view, null);
    expect(spy1).not.toHaveBeenCalled();
  });
  it('should handle setContentRight', () => {
    expect(
      citationView.setContentRight(
        {} as unknown as MouseEvent,
        {} as unknown as Element,
        {} as unknown as HTMLDivElement,
        {} as unknown as HTMLDivElement
      )
    ).toBeUndefined();
  });
  it('should handle setContentRight when parent null', () => {
    const e = { clientX: 1000 } as unknown as MouseEvent;
    const hl = null as unknown as Element;
    const tt = { clientWidth: 200 } as unknown as HTMLDivElement;
    const ttl = { style: { right: 1 } } as unknown as HTMLDivElement;
    expect(citationView.setContentRight(e, hl, tt, ttl)).toBeUndefined();
  });
  it('should handle close', () => {
    citationView.dom = undefined;
    expect(citationView.close()).toBeUndefined();
  });
  it('should handle update and return false', () => {
    citationView.node = {
      sameMarkup: () => {
        return false;
      },
    } as unknown as Node;
    expect(citationView.update({} as unknown as Node)).toBeFalsy();
  });
  it('should handle update and return true', () => {
    citationView.node = {
      sameMarkup: () => {
        return true;
      },
    } as unknown as Node;
    expect(citationView.update({} as unknown as Node)).toBeTruthy();
  });

  it('should handle destroy and return true', () => {
    citationView.node = {
      sameMarkup: () => {
        return true;
      },
    } as unknown as Node;
    const mockDom = document.createElement('div');
    citationView.dom = mockDom;
    citationView.hideSourceText = jest.fn();
    citationView.removeEventListenerToView();
    citationView.destroy();
    expect(mockDom.textContent).toEqual('');
  });
});
