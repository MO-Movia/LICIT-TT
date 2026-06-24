/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { schema, builders } from 'prosemirror-test-builder';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node } from 'prosemirror-model';
import { InfoIconView } from './infoIconView';
import { createPopUp } from '../../commands';
import { InfoIconDialog } from './infoIconDialog';
import { InfoIconNodeSpec } from './infoIconNodeSpec';

describe('Info Plugin Extended', () => {
  const info = {
    from: 0,
    to: 9,
    description: 'Test description',
    infoIcon: 'faIcon',
  };

  const mySchema = new Schema({
    nodes: schema.spec.nodes.addToEnd('infoicon', InfoIconNodeSpec),
    marks: schema.spec.marks,
  });
  const newInfoIconNode = mySchema.node(mySchema.nodes.infoicon, info);
  const { doc, p } = builders(mySchema, { p: { nodeType: 'paragraph' } });
  const createInfoView = () => {
    const state = EditorState.create({
      doc: doc(p('hello', newInfoIconNode, ' world')),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });
    return {
      dom,
      view,
      cView: new InfoIconView(view.state.doc.nodeAt(6), view, undefined),
    };
  };

  it('Infoiconview call createInfoIconTooltip', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);
    const ttContent = document.createElement('div');
    ttContent.id = 'tooltip-content';
    ttContent.innerHTML =
      '"<p>test <a href="ingo" title="ingo">ingo</a> icon</p>"';
    const errorinfodiv = document.createElement('div');
    errorinfodiv.className = 'ProseMirror czi-prosemirror-editor';
    const extraerrorinfodiv = document.createElement('div');
    extraerrorinfodiv.className = 'prosemirror-editor-wrapper';
    const tooltip = document.createElement('div');
    tooltip.className = 'molcit-infoicon-tooltip';
    document.body.appendChild(tooltip);

    const clickEvent = new MouseEvent('mouseclick', {
      clientX: 281,
      clientY: 125,
    });
    const getNodePosEx = jest.spyOn(cView, 'getNodePosEx');
    getNodePosEx.mockReturnValue(12);
    const isPNodeNull = jest.spyOn(cView, 'isPNodeNull');
    isPNodeNull.mockReturnValue(true);
    cView.getNodePosition(clickEvent);
    // Call the close function
    cView.close();
    cView.setContentRight(clickEvent, errorinfodiv, tooltip, ttContent);
    expect(getNodePosEx).toHaveBeenCalled();
    expect(isPNodeNull).toHaveBeenCalled();
  });

  it('Infoiconview call selectNode', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);
    const getNodePosEx = jest.spyOn(cView, 'getNodePosEx');
    getNodePosEx.mockReturnValue(12);
    const targetElement = document.createElement('div');
    targetElement.className = 'fa';
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    targetElement.dispatchEvent(event);
    cView._popUp_subMenu = createPopUp(
      InfoIconDialog,
      cView.createInfoObject(view, 1),
      {
        modal: true,
        IsChildDialog: false,
        autoDismiss: false,
      }
    );
    cView.selectNode(event);
    expect(getNodePosEx).toHaveBeenCalled();
  });
  it('should handle missing currentTarget', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);
    const destroyPopupSpy = jest.spyOn(cView, 'destroyPopup');
    const mockEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });

    cView.dom = null!;
    const targetElement = document.createElement('div');
    targetElement.className = 'fa';
    const eventWithCustomData = {
      ...mockEvent,
      currentTarget: null, // Add custom data
      target: targetElement,
    };
    cView.selectNode(eventWithCustomData);

    // Verify that destroyPopup was called
    expect(destroyPopupSpy).toHaveBeenCalled();
  });

  it('should return false id sameMarkup returns false', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);
    const node = cView.node.type.create({
      ...cView.node.attrs,
      description: 'different',
    });
    expect(cView.update(node)).toBe(false);
  });
  it('should return true if sameMarkup returns true', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    // Simulate a node with the same markup
    const node = cView.node.copy(); // This creates a new node with the same markup
    expect(cView.update(node)).toBe(true);
  });

  describe('Info Plugin Extended (group 2)', () => {
    let currentNode: Node | undefined;

    const updateNode = (node: Node): boolean => {
      if (!currentNode || !node.sameMarkup(currentNode)) return false;
      currentNode = node;
      return true;
    };

    const mockNode = {
      sameMarkup: jest.fn(),
    };

    beforeEach(() => {
      mockNode.sameMarkup.mockReset();
      currentNode = undefined;
    });

    it('should return false if currentNode is undefined', () => {
      mockNode.sameMarkup.mockReturnValue(false);
      currentNode = undefined; // Ensure currentNode is undefined
      const result = updateNode(mockNode as unknown as Node);
      expect(result).toBe(false);
      expect(mockNode.sameMarkup).not.toHaveBeenCalled();
    });

    it('should return false if node has different markup', () => {
      currentNode = mockNode as unknown as Node;
      mockNode.sameMarkup.mockReturnValue(false);
      const result = updateNode(mockNode as unknown as Node);
      expect(result).toBe(false);
      expect(mockNode.sameMarkup).toHaveBeenCalledWith(mockNode);
    });

    it('should return true and update node if node has the same markup', () => {
      currentNode = mockNode as unknown as Node;
      mockNode.sameMarkup.mockReturnValue(true);
      const result = updateNode(mockNode as unknown as Node);
      expect(result).toBe(true);
      expect(mockNode.sameMarkup).toHaveBeenCalledWith(mockNode);
      expect(currentNode).toBe(mockNode);
    });
  });

  it('should not close when relatedTarget offsetParent has the expected class', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const tooltipContent = document.createElement('div');
    tooltipContent.className = 'ProseMirror molcit-infoicon-tooltip-content';

    const targetElement = document.createElement('div');
    targetElement.className = '';
    Object.defineProperty(targetElement, 'offsetParent', {
      value: tooltipContent,
    });

    const closeSpy = jest.spyOn(cView, 'close');

    const event = new MouseEvent('mouseout', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'relatedTarget', {
      value: targetElement,
    });

    cView.hideSourceText(event);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should return the correct position from posAtCoords', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const mockPos = { pos: 12, inside: -1 };
    jest.spyOn(view, 'posAtCoords').mockReturnValue(mockPos);
    const result = cView.getNodePosEx(100, 200);
    expect(result).toBe(12);
  });

  it('getNodePosEx returns null when posAtCoords returns null', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    jest.spyOn(view, 'posAtCoords').mockReturnValue(null);
    const result = cView.getNodePosEx(100, 200);
    expect(result).toBeNull();
  });

  it('showSourceText does not call open when dom.classList is falsy', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    // Mock dom.classList to be falsy
    cView.dom = document.createElement('div');
    Object.defineProperty(cView.dom, 'classList', {
      value: null,
      writable: true,
    });

    const openSpy = jest.spyOn(cView, 'open');
    const event = new MouseEvent('mouseover');
    cView.showSourceText(event);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('getNodePosition handles offsetY < 1', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const getNodePosExSpy = jest.spyOn(cView, 'getNodePosEx');
    getNodePosExSpy.mockReturnValue(10);

    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'offsetY', {
      value: 0,
    });
    Object.defineProperty(event, 'clientY', {
      value: 100,
    });
    Object.defineProperty(event, 'clientX', {
      value: 50,
    });

    const result = cView.getNodePosition(event);
    expect(result).toBeUndefined();
  });

  it('selectNode with no target className', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const targetElement = document.createElement('div');
    targetElement.className = 'someOtherClass';

    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', {
      value: targetElement,
    });
    Object.defineProperty(event, 'currentTarget', {
      value: cView.dom,
    });

    const openSpy = jest.spyOn(cView, 'open');
    cView.selectNode(event);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('open method with empty tooltip', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'clientX', {
      value: 100,
    });
    Object.defineProperty(event, 'clientY', {
      value: 100,
    });
    Object.defineProperty(event, 'currentTarget', {
      value: cView.dom,
    });

    // Spy on getElementsByClassName to control tooltips
    const originalGetElementsByClassName = document.getElementsByClassName;
    const spy = jest.fn(() => []) as unknown as (classNames: string) => HTMLCollectionOf<Element>;
    document.getElementsByClassName = spy;

    cView.open(event);

    // Restore
    document.getElementsByClassName = originalGetElementsByClassName;

    expect(spy).toHaveBeenCalled();
  });

  it('setContentRight with offsetParent tagName TD', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'clientX', {
      value: 100,
    });
    Object.defineProperty(event, 'clientY', {
      value: 100,
    });

    const parent = document.createElement('div');
    parent.style.width = '1200px';
    Object.defineProperty(parent, 'clientWidth', {
      value: 1100,
    });
    Object.defineProperty(parent, 'getBoundingClientRect', {
      value: () => ({ left: 0 }),
    });

    const tooltip = document.createElement('div');
    Object.defineProperty(tooltip, 'clientWidth', {
      value: 500,
    });

    const ttContent = document.createElement('div');

    const td = document.createElement('td');
    Object.defineProperty(event, 'currentTarget', {
      value: { offsetParent: td },
    });

    cView.setContentRight(event, parent, tooltip, ttContent);
    expect(tooltip.style.position).toBe('fixed');
  });

  it('adjustTooltipPosition with TD offsetParent', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'clientY', {
      value: 100,
    });

    const td = document.createElement('td');
    Object.defineProperty(event, 'currentTarget', {
      value: { offsetParent: td },
    });

    const tooltip = document.createElement('div');
    cView.adjustTooltipPosition(event, tooltip);

    expect(tooltip.style.top).toBe('110px');
  });

  it('isInfoIconNode returns false for non-infoicon node', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const result = cView.isInfoIconNode(0);
    expect(result).toBe(false);
  });

  it('parentNodeType returns true when type name is infoicon', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const pNode = { type: { name: 'infoicon' } };
    const result = cView.parentNodeType(pNode);
    expect(result).toBe(true);
  });

  it('parentNodeType returns false when pNode is null', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const result = cView.parentNodeType(null);
    expect(result).toBeFalsy();
  });

  it('onCancel closes popup and focuses view', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const focusSpy = jest.spyOn(view, 'focus');
    cView.onCancel(view);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('createInfoObject returns correct structure', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const result = cView.createInfoObject(view, 1);
    expect(result.mode).toBe(1);
    expect(result.editorView).toBe(view);
  });

  it('destroy removes event listeners', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const removeEventListenerSpy = jest.spyOn(cView.dom, 'removeEventListener');
    cView.destroy();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('isInfoIconNode returns true when node type is infoicon', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const result = cView.isInfoIconNode(6);
    expect(result).toBe(true);
  });

  it('onEditInfo closes submenu and creates popup', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    cView._popUp_subMenu = createPopUp(
      InfoIconDialog,
      cView.createInfoObject(view, 1),
      {
        modal: true,
        IsChildDialog: false,
        autoDismiss: false,
      }
    );

    const closeSpy = jest.spyOn(cView._popUp_subMenu, 'close');
    cView.onEditInfo(view);

    expect(closeSpy).toHaveBeenCalled();
  });

  it('updateInfoObject updates node attributes', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const tr = view.state.tr;
    const infoIcon = {
      infoIcon: 'newIcon',
      editorView: view,
    };

    const result = cView.updateInfoObject(tr, infoIcon);
    expect(result).toBeDefined();
  });

  it('addClickListenerToLinks handles links', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const tooltipContent = document.createElement('div');
    const link1 = document.createElement('a');
    link1.href = 'https://example.com';
    tooltipContent.appendChild(link1);

    cView.addClickListenerToLinks(tooltipContent);

    expect(tooltipContent.getElementsByTagName('a').length).toBe(1);
  });

  it('onInfoSubMenuMouseOut destroys popup', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const destroySpy = jest.spyOn(cView, 'destroyPopup');
    cView.onInfoSubMenuMouseOut();

    expect(destroySpy).toHaveBeenCalled();
  });

  it('isPNodeNull returns true when node is null', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const result = cView.isPNodeNull(null);
    expect(result).toBe(true);
  });

  it('setContentRight handles right positioning for TD', () => {
    const before = 'hello';
    const after = ' world';

    const state = EditorState.create({
      doc: doc(p(before, newInfoIconNode, after)),
      schema: mySchema,
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const view = new EditorView({ mount: dom }, { state });

    const cView = new InfoIconView(view.state.doc.nodeAt(6), view, undefined);

    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'clientX', {
      value: 800,
    });

    const parent = document.createElement('div');
    Object.defineProperty(parent, 'clientWidth', {
      value: 1000,
    });
    Object.defineProperty(parent, 'getBoundingClientRect', {
      value: () => ({ left: 100 }),
    });

    const tooltip = document.createElement('div');
    Object.defineProperty(tooltip, 'clientWidth', {
      value: 500,
    });

    const ttContent = document.createElement('div');
    const td = document.createElement('td');
    Object.defineProperty(event, 'currentTarget', {
      value: { offsetParent: td },
    });

    cView.setContentRight(event, parent, tooltip, ttContent);
    expect(tooltip.style.right).toBeTruthy();
  });

  it('showSourceText calls open when classList exists', () => {
    const { cView } = createInfoView();
    const openSpy = jest.spyOn(cView, 'open').mockImplementation(() => undefined);

    cView.showSourceText(new MouseEvent('mouseover'));

    expect(openSpy).toHaveBeenCalled();
  });

  it('hideSourceText closes for unrelated targets and keeps fa targets open', () => {
    const { cView } = createInfoView();
    const closeSpy = jest.spyOn(cView, 'close').mockImplementation(() => undefined);
    const unrelatedEvent = new MouseEvent('mouseout');
    const faEvent = new MouseEvent('mouseout');
    Object.defineProperty(unrelatedEvent, 'relatedTarget', {
      value: { className: 'outside-target' },
    });
    Object.defineProperty(faEvent, 'relatedTarget', {
      value: { className: 'fa' },
    });

    cView.hideSourceText(unrelatedEvent);
    cView.hideSourceText(faEvent);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('destroyPopup closes popups and removes orphan submenu nodes', () => {
    const { cView } = createInfoView();
    const popupClose = jest.fn();
    const subPopupClose = jest.fn();
    cView._popUp = { close: popupClose, update: jest.fn() };
    cView._popUp_subMenu = { close: subPopupClose, update: jest.fn() };

    cView.destroyPopup();
    expect(popupClose).toHaveBeenCalledWith('');
    expect(subPopupClose).toHaveBeenCalledWith('');

    cView._popUp_subMenu = null;
    const submenu = document.createElement('div');
    submenu.className = 'molcit-infoicon-submenu';
    document.body.appendChild(submenu);
    cView.destroyPopup();

    expect(document.getElementsByClassName('molcit-infoicon-submenu')).toHaveLength(0);
  });

  it('onEditInfo onClose updates only when a value is provided', () => {
    const { cView, view } = createInfoView();
    cView._popUp_subMenu = { close: jest.fn(), update: jest.fn() };
    const updateSpy = jest.spyOn(cView, 'updateInfoIcon').mockImplementation(() => undefined);

    cView.onEditInfo(view);
    expect(cView._popUp).not.toBeNull();

    cView._popUp?.close(undefined);
    expect(updateSpy).not.toHaveBeenCalled();

    cView.onEditInfo(view);
    const payload = { infoIcon: 'changed', editorView: view };
    cView._popUp?.close(payload);

    expect(updateSpy).toHaveBeenCalledWith(view, payload);
  });

  it('open creates a tooltip and wires helper methods when none exists', () => {
    const { cView } = createInfoView();
    document.body.innerHTML = '';
    const editor = document.createElement('div');
    editor.className = 'ProseMirror czi-prosemirror-editor';
    document.body.appendChild(editor);

    const setContentRightSpy = jest.spyOn(cView, 'setContentRight').mockImplementation((_e, _p, tooltip) => {
      tooltip.style.right = '0px';
    });
    const adjustSpy = jest.spyOn(cView, 'adjustTooltipPosition').mockImplementation(() => undefined);
    const addLinksSpy = jest.spyOn(cView, 'addClickListenerToLinks').mockImplementation(() => undefined);
    const event = new MouseEvent('mouseover');
    Object.defineProperty(event, 'clientX', {
      value: 120,
    });
    Object.defineProperty(event, 'clientY', {
      value: 10,
    });
    Object.defineProperty(event, 'currentTarget', {
      value: cView.dom,
    });

    cView.open(event);

    const tooltipContent = (cView.dom as Element).querySelector('#tooltip-content');
    expect(setContentRightSpy).toHaveBeenCalled();
    expect(adjustSpy).toHaveBeenCalled();
    expect(addLinksSpy).toHaveBeenCalledWith(tooltipContent);
  });

  it('addClickListenerToLinks uses runtime dialog when available and window.open otherwise', () => {
    const { cView, view } = createInfoView();
    const tooltipContent = document.createElement('div');
    const firstLink = document.createElement('a');
    const secondLink = document.createElement('a');
    firstLink.href = 'example.com/one';
    secondLink.href = 'example.com/two';
    tooltipContent.appendChild(firstLink);
    tooltipContent.appendChild(secondLink);
    const openLinkDialog = jest.fn();
    const runtimeView = view as EditorView & {
      runtime?: { openLinkDialog?: jest.Mock };
    };
    runtimeView.runtime = { openLinkDialog };
    view.editable = true;
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    cView.addClickListenerToLinks(tooltipContent);
    firstLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(openLinkDialog).toHaveBeenCalledWith('http://localhost/example.com/one', 'Any unsaved changes will be lost');

    runtimeView.runtime = {};
    secondLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(windowOpenSpy).toHaveBeenCalledWith('http://localhost/example.com/two', '_blank');
  });

  it('setContentRight aligns non-table tooltips to the right edge when needed', () => {
    const { cView } = createInfoView();
    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'clientX', {
      value: 950,
    });
    Object.defineProperty(event, 'currentTarget', {
      value: { offsetParent: { tagName: 'DIV' } },
    });

    const parent = document.createElement('div');
    Object.defineProperty(parent, 'clientWidth', {
      value: 1000,
    });
    Object.defineProperty(parent, 'getBoundingClientRect', {
      value: () => ({ left: 100 }),
    });

    const tooltip = document.createElement('div');
    Object.defineProperty(tooltip, 'clientWidth', {
      value: 300,
    });

    cView.setContentRight(event, parent, tooltip, document.createElement('div'));

    expect(tooltip.style.right).toBe('0px');
    expect(tooltip.style.position).toBe('');
  });

  it('adjustTooltipPosition leaves non-table tooltips unchanged and utility methods return constants', () => {
    const { cView } = createInfoView();
    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'currentTarget', {
      value: { offsetParent: { tagName: 'DIV' } },
    });
    const tooltip = document.createElement('div');

    cView.adjustTooltipPosition(event, tooltip);

    expect(tooltip.style.top).toBe('');
    expect(cView.stopEvent(new Event('click'))).toBe(false);
    expect(cView.ignoreMutation()).toBe(true);
  });
});
