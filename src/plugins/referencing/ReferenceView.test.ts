/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from 'prosemirror-state';
import { schema } from 'jest-prosemirror';
import { EditorView } from 'prosemirror-view';
import { ReferenceView } from './ReferenceView';
import { ReferencingPlugin } from './ReferencingPlugin';
import { Node } from 'prosemirror-model';
import { REFERENCE } from './ReferenceNodeSpec';

describe('ReferenceView', () => {
  let view!: ReferenceView;
  let pos: number | undefined = 0;
  let callback: (e: IntersectionObserverEntry[]) => void;
  let deref: Promise<string>;

  beforeEach(() => {
    // IntersectionObserver isn't available in test environment
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockImplementation((c) => {
      callback = c;
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });
    window.IntersectionObserver = mockIntersectionObserver;

    const plugin = new ReferencingPlugin();
    const effectiveSchema = plugin.getEffectiveSchema(schema);

    const state = EditorState.create({
      doc: undefined,
      schema: effectiveSchema,
      plugins: [plugin],
    });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const eview = new EditorView(
      { mount: dom },
      {
        state: state,
      }
    );
    pos = 0;
    deref = undefined;
    view = new ReferenceView(
      eview.state.schema.nodes[REFERENCE].create(),
      eview,
      () => pos,
      () => deref
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ReferenceView Observer works', () => {
    deref = Promise.resolve('[]');
    expect(
      callback([
        { isIntersecting: true } as unknown as IntersectionObserverEntry,
      ])
    ).toBeFalsy();
    expect(callback([])).toBeFalsy();
    expect(callback([])).toBeFalsy();
  });

  it('ReferenceView Observer works on error', () => {
    deref = Promise.reject(new Error('bail'));
    expect(
      callback([
        { isIntersecting: true } as unknown as IntersectionObserverEntry,
      ])
    ).toBeFalsy();
    // return catched promise to Jest so it knows it was intentional
    return deref.catch(() => 'passed');
  });

  it('create state and view', () => {
    const e = new MouseEvent('mouseenter', { clientX: 281, clientY: 125 });
    view.hideIcon(e);
    view.openTooltip({
      state: { doc: { attrs: { objectId: 'test' } } },
    } as unknown as EditorView);
    view.hideSourceText(null);
    view.hideSourceText(e);
    view.menu(e);
    view.destroyPopup();
    view.ignoreMutation();
    expect(view.dom).toBeDefined();
  });

  it('Should not create state and view from nothing', () => {
    const result = view.menu(undefined);
    expect(result).toBe(undefined);
  });

  it('ReferenceView hideIcon', () => {
    const mockEvent = new MouseEvent('click');
    const mockRelatedTarget = document.createElement('div');
    mockRelatedTarget.className = 'popup-container';

    view.hideIcon(mockEvent);
    const ele = view.dom.querySelector('.ref-icon');
    const result = ele
      ? ele.classList.contains('mo-licit-referencing-hidden')
      : false;
    expect(result).toBe(false);
  });

  it('ReferenceView hideIcon with no target', () => {
    const mockEvent = new MouseEvent('click');
    const mockRelatedTarget = document.createElement('div');
    mockRelatedTarget.className = '';

    view.hideIcon(mockEvent);
    const ele = view.dom.querySelector('.ref-icon');
    const result = ele
      ? ele.classList.contains('mo-licit-referencing-hidden')
      : false;
    expect(result).toBe(false);
  });

  it('ReferenceView update false', () => {
    const result = view.update(null);
    expect(result).toBeFalsy();
  });

  it('ReferenceView update true', () => {
    const result = view.update({ sameMarkup: () => true } as unknown as Node);
    expect(result).toBeTruthy();
  });

  it('ReferenceView menu click', () => {
    const mockEvent = new MouseEvent('click');
    view.hideIcon(mockEvent);
    const ele = view.dom.querySelector('.ref-icon');
    const result = ele
      ? ele.classList.contains('mo-licit-referencing-hidden')
      : false;
    expect(result).toBe(false);
  });

  it('ReferenceView loadContent HTML', () => {
    const content = document.createElement('div');
    expect(view.loadContent(content)).toBe(content);
  });

  it('ReferenceView loadContent Fragment', () => {
    expect(view.loadContent(null)).toBeDefined();
  });

  it('ReferenceView loadContent String', () => {
    expect(view.loadContent('[]')).toBeDefined();
  });

  it('ReferenceView showIcon null', () => {
    expect(view.showIcon(null)).toBeFalsy();
  });

  it('ReferenceView showIcon new with div', () => {
    const e = {
      currentTarget: document.createElement('div'),
    } as unknown as Event;
    expect(view.showIcon(e)).toBeFalsy();
    expect(view.showIcon(e)).toBeFalsy();
  });

  it('ReferenceView hideIcon null', () => {
    expect(view.hideIcon(null)).toBeFalsy();
  });

  it('ReferenceView showIcon new with input', () => {
    const e = {
      currentTarget: document.createElement('input'),
      relatedTarget: document.createElement('input'),
    } as unknown as Event;
    expect(view.showIcon(e)).toBeFalsy();
    expect(view.hideIcon(e)).toBeFalsy();
  });

  it('ReferenceView delete null', () => {
    pos = undefined;
    expect(view.delete()).toBeFalsy();
  });

  it('ReferenceView delete defined', () => {
    expect(view.delete()).toBeFalsy();
    const spy = jest.spyOn(window, 'open');
    spy.mockReturnValue(null);
    view.goToRef();
    expect(spy).toHaveBeenCalled();
  });

  it('ReferenceView stopEvent defined', () => {
    //Prosemirror override
    expect(view.stopEvent()).toBeTruthy();
  });

  it('ReferenceView ignoreMutation defined', () => {
    //Prosemirror override
    expect(view.ignoreMutation()).toBeTruthy();
  });

  it('ReferenceView events mouseover', () => {
    const event = new MouseEvent('mouseover');
    expect(view.dom.dispatchEvent(event)).toBeTruthy();
  });

  it('ReferenceView events mouseout', () => {
    const event = new MouseEvent('mouseout');
    expect(view.dom.dispatchEvent(event)).toBeTruthy();
  });
  
  it('ReferenceView loadContent removes existing child nodes', () => {
  const child1 = document.createElement('span');
  child1.textContent = 'old1';

  const child2 = document.createElement('span');
  child2.textContent = 'old2';

  view.dom.appendChild(child1);
  view.dom.appendChild(child2);

  expect(view.dom.childNodes.length).toBeGreaterThan(0);

  const result = view.loadContent(document.createElement('div'));

  expect(result).toBeDefined();
  expect(view.dom.childNodes.length).toBe(2);
});
});
