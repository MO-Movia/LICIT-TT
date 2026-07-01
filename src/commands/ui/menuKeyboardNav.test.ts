/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { MenuKeyboardNav, MenuKeyboardNavOptions } from './menuKeyboardNav';

type Harness = {
  nav: MenuKeyboardNav;
  opts: {
    getRoot: jest.Mock;
    getNavCount: jest.Mock;
    getSelectedIndex: jest.Mock;
    setSelectedIndex: jest.Mock;
    activate: jest.Mock;
    scrollSelectedIntoView: jest.Mock;
    captureKeysOnDocument: boolean;
  };
  root: { focus: jest.Mock; addEventListener: jest.Mock; removeEventListener: jest.Mock };
  getIndex: () => number;
};

const makeNav = (
  navCount = 3,
  startIndex = 0,
  captureKeysOnDocument = false
): Harness => {
  let selectedIndex = startIndex;
  const root = {
    focus: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  const opts = {
    getRoot: jest.fn(() => root),
    getNavCount: jest.fn(() => navCount),
    getSelectedIndex: jest.fn(() => selectedIndex),
    setSelectedIndex: jest.fn((index: number, done?: () => void) => {
      selectedIndex = index;
      done?.();
    }),
    activate: jest.fn(),
    scrollSelectedIntoView: jest.fn(),
    captureKeysOnDocument,
  };
  return {
    nav: new MenuKeyboardNav(opts as unknown as MenuKeyboardNavOptions),
    opts,
    root,
    getIndex: () => selectedIndex,
  };
};

const keyEvent = (key: string) => ({
  key,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
});

const mouseEvent = (dataIndex: string | null, clientX: number, clientY: number) => {
  const row = document.createElement('div');
  if (dataIndex !== null) {
    row.setAttribute('data-index', dataIndex);
  }
  return { target: row, clientX, clientY } as unknown as MouseEvent;
};

describe('MenuKeyboardNav', () => {
  test('ArrowDown moves the highlight down and scrolls', () => {
    const { nav, opts, getIndex } = makeNav(3, 0);
    const e = keyEvent('ArrowDown');
    nav.onKeyDown(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(getIndex()).toBe(1);
    expect(opts.scrollSelectedIntoView).toHaveBeenCalled();
  });

  test('ArrowDown wraps from the last row to the first', () => {
    const { nav, getIndex } = makeNav(3, 2);
    nav.onKeyDown(keyEvent('ArrowDown'));
    expect(getIndex()).toBe(0);
  });

  test('ArrowUp moves up and wraps from the first row to the last', () => {
    const up = makeNav(3, 1);
    up.nav.onKeyDown(keyEvent('ArrowUp'));
    expect(up.getIndex()).toBe(0);

    const wrap = makeNav(3, 0);
    wrap.nav.onKeyDown(keyEvent('ArrowUp'));
    expect(wrap.getIndex()).toBe(2);
  });

  test('arrows re-enter the navigable range when selection is outside it', () => {
    const down = makeNav(3, 7);
    down.nav.onKeyDown(keyEvent('ArrowDown'));
    expect(down.getIndex()).toBe(0);

    const up = makeNav(3, 7);
    up.nav.onKeyDown(keyEvent('ArrowUp'));
    expect(up.getIndex()).toBe(2);
  });

  test('does nothing when there are no navigable rows', () => {
    const { nav, opts } = makeNav(0, 0);
    const e = keyEvent('ArrowDown');
    nav.onKeyDown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(opts.setSelectedIndex).not.toHaveBeenCalled();
  });

  test('Enter activates the selected row', () => {
    const { nav, opts } = makeNav(3, 2);
    const e = keyEvent('Enter');
    nav.onKeyDown(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(opts.activate).toHaveBeenCalledWith(2, e);
  });

  test('ignores other keys', () => {
    const { nav, opts } = makeNav(3, 0);
    const e = keyEvent('a');
    nav.onKeyDown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(opts.setSelectedIndex).not.toHaveBeenCalled();
    expect(opts.activate).not.toHaveBeenCalled();
  });

  test('hover from a real pointer move selects the row', () => {
    const { nav, opts } = makeNav();
    nav.onMouseOver(mouseEvent('2', 5, 9));
    expect(opts.setSelectedIndex).toHaveBeenCalledWith(2);
  });

  test('hover from a stationary pointer (same coords) is ignored', () => {
    const { nav, opts } = makeNav();
    nav.onMouseOver(mouseEvent('2', 5, 9));
    nav.onMouseOver(mouseEvent('2', 5, 9));
    expect(opts.setSelectedIndex).toHaveBeenCalledTimes(1);
  });

  test('hover with no data-index ancestor is ignored', () => {
    const { nav, opts } = makeNav();
    nav.onMouseOver(mouseEvent(null, 5, 9));
    expect(opts.setSelectedIndex).not.toHaveBeenCalled();
  });

  test('mount focuses the root and wires the hover listener', () => {
    const { nav, root } = makeNav();
    const raf = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
    nav.mount();
    expect(root.focus).toHaveBeenCalled();
    expect(root.addEventListener).toHaveBeenCalledWith('mouseover', nav.onMouseOver);
    raf.mockRestore();
  });

  test('unmount removes the hover listener', () => {
    const { nav, root } = makeNav();
    nav.unmount();
    expect(root.removeEventListener).toHaveBeenCalledWith(
      'mouseover',
      nav.onMouseOver
    );
  });

  test('restores focus to the previously focused element on unmount', () => {
    const prev = document.createElement('input');
    document.body.appendChild(prev);
    prev.focus();
    expect(document.activeElement).toBe(prev);
    const focusSpy = jest.spyOn(prev, 'focus');
    const { nav } = makeNav();
    nav.mount(); // captures `prev` as the previously-focused element
    nav.unmount(); // should restore focus to `prev`, without scrolling
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    focusSpy.mockRestore();
    document.body.removeChild(prev);
  });

  test('does not capture document keys by default', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const { nav } = makeNav();
    nav.mount();
    expect(addSpy).not.toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      true
    );
    addSpy.mockRestore();
  });

  test('captureKeysOnDocument adds and removes a document keydown listener', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const { nav } = makeNav(3, 0, true);
    nav.mount();
    expect(addSpy).toHaveBeenCalledWith(
      'keydown',
      nav.onDocumentKeyDown,
      true
    );
    nav.unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      'keydown',
      nav.onDocumentKeyDown,
      true
    );
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  test('onDocumentKeyDown drives navigation like onKeyDown', () => {
    const { nav, opts, getIndex } = makeNav(3, 0, true);
    nav.onDocumentKeyDown({
      key: 'ArrowDown',
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent);
    expect(getIndex()).toBe(1);
    expect(opts.scrollSelectedIntoView).toHaveBeenCalled();
  });
});
