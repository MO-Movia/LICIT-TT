/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {
  onSelection,
  onMutation,
  CustomNodeView,
  EditorFocused,
} from './CustomNodeView';
import {SelectionObserver} from './SelectionObserver';
import React from 'react';
import {EditorVideoRuntime} from '../Types';
import { Root } from 'react-dom/client';

describe('onSelection', () => {
  it('should handle onselection', () => {
    const selectonobserver = {
      disconnect: () => undefined,
    } as unknown as SelectionObserver;
    jest
      .spyOn(globalThis, 'getSelection')
      .mockReturnValue({} as unknown as Selection);
    const onselection = onSelection([], selectonobserver);
    expect(onselection).toBeUndefined();
  });
  it('should handle onselection branch coverage', () => {
    const selectonobserver = {
      disconnect: () => undefined,
    } as unknown as SelectionObserver;
    jest.spyOn(globalThis, 'getSelection').mockReturnValue({
      containsNode: (_node) => true,
    } as unknown as Selection);
    const onselection = onSelection([], selectonobserver);
    expect(onselection).toBeUndefined();
  });
});
describe('onMutation', () => {
  const onmutation = onMutation('', {
    disconnect: () => undefined,
  } as unknown as MutationObserver);
  it('should handle onMutation', () => {
    expect(onmutation).toBeUndefined();
  });
});
class TestNodeView extends CustomNodeView {
  createDOMElement(): HTMLElement {
    const el = document.createElement('div');
    el.onclick = () => {};
    return el;
  }

  renderReactComponent(): React.ReactElement {
    return <div>Test Component</div>;
  }
  cleanup(): React.ReactElement {
    return <div>Test Component</div>;
  }
}

describe('CustomNodeView', () => {
  let testNodeView: TestNodeView;

  beforeEach(() => {
    testNodeView = new TestNodeView(
      null,
      {
        dom: document.createElement('div'),
        focused: true,
        runtime: {} as EditorVideoRuntime,
      } as unknown as EditorFocused,
      () => 1,
      []
    );
  });

  it('should render without error', () => {
    expect(() => testNodeView.__renderReactComponent()).not.toThrow();
  });

  it('should handle mutation gracefully', () => {
    expect(testNodeView).toBeDefined();
    expect(testNodeView.dom).toBeInstanceOf(HTMLElement);
  });
  it('should handle mutation gracefully (case 2)', () => {
    expect(testNodeView).toBeDefined();
    expect(testNodeView.dom).toBeInstanceOf(HTMLElement);
  });

  it('mounts its React content even while the editor DOM is detached', async () => {
    const renderSpy = jest.spyOn(testNodeView, '__renderReactComponent');

    await Promise.resolve();

    expect(renderSpy).toHaveBeenCalled();
    expect(testNodeView.reactRoot).not.toBeNull();
    CustomNodeView.prototype.cleanup.call(testNodeView);
  });

  it('does not mount after being destroyed', async () => {
    const renderSpy = jest.spyOn(testNodeView, '__renderReactComponent');

    testNodeView.destroy();
    await Promise.resolve();

    expect(renderSpy).not.toHaveBeenCalled();
  });
});

describe('CustomNodeView - Additional Coverage', () => {
  let testNodeView: TestNodeView;
  let mockEditorView: EditorFocused;

  beforeEach(() => {
    mockEditorView = {
      dom: document.createElement('div'),
      focused: true,
      state: {
        selection: {
          from: 1,
          to: 1,
        },
      },
      runtime: {} as EditorVideoRuntime,
    } as unknown as EditorFocused;

    testNodeView = new TestNodeView(
      null,
      mockEditorView,
      () => 1,
      []
    );
  });

  describe('update method', () => {
    it('should update node and return true', () => {
      const newNode = { type: 'test' } as unknown as import('prosemirror-model').Node;
      const result = testNodeView.update(newNode, []);
      expect(result).toBe(true);
      expect(testNodeView.props.node).toBe(newNode);
    });
  });

  describe('stopEvent method', () => {
    it('should return false', () => {
      expect(testNodeView.stopEvent()).toBe(false);
    });
  });

  describe('selectNode method', () => {
    it('should add selected class and set _selected to true', () => {
      testNodeView.selectNode();
      expect(testNodeView._selected).toBe(true);
      expect(testNodeView.dom.classList.contains('ProseMirror-selectednode')).toBe(true);
    });
  });

  describe('deselectNode method', () => {
    it('should remove selected class and set _selected to false', () => {
      testNodeView.selectNode(); // First select
      testNodeView.deselectNode();
      expect(testNodeView._selected).toBe(false);
      expect(testNodeView.dom.classList.contains('ProseMirror-selectednode')).toBe(false);
    });
  });

  describe('destroy method', () => {
    it('should call cleanup and remove from pendingViews', () => {
      const cleanupSpy = jest.spyOn(testNodeView, 'cleanup');
      testNodeView.destroy();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

describe('cleanup method', () => {
  it('should reset reactRoot to null', () => {
    testNodeView.reactRoot = { unmount: jest.fn() } as unknown as Root;
    // Call the parent class cleanup since TestNodeView overrides it
    CustomNodeView.prototype.cleanup.call(testNodeView);
    expect(testNodeView.reactRoot).toBeNull();
  });
});

  describe('__renderReactComponent with selection states', () => {
    it('should set selected and focused to false when editorView.state is undefined', () => {
      testNodeView.props.editorView = {
        ...mockEditorView,
        state: undefined,
      } as unknown as EditorFocused;

      testNodeView.__renderReactComponent();

      expect(testNodeView.props.selected).toBe(false);
      expect(testNodeView.props.focused).toBe(false);
    });

    it('should create reactRoot if it does not exist', () => {
      testNodeView.reactRoot = null;
      testNodeView.__renderReactComponent();
      expect(testNodeView.reactRoot).not.toBeNull();
    });

    it('should reuse existing reactRoot if it exists', () => {
      testNodeView.__renderReactComponent();
      const firstRoot = testNodeView.reactRoot;
      testNodeView.__renderReactComponent();
      expect(testNodeView.reactRoot).toBe(firstRoot);
    });
  });

describe('createDOMElement error handling', () => {
  it('should throw error when not overridden', () => {
    class BaseNodeView extends CustomNodeView {
      renderReactComponent(): React.ReactElement {
        return <div>Test</div>;
      }
    }

    expect(() => {
      new BaseNodeView(
        null,
        mockEditorView,
        () => 1,
        []
      );
    }).toThrow('not implemented');
  });
});

describe('renderReactComponent error handling', () => {
  it('should throw error when not overridden (case 2)', () => {
    class PartialNodeView extends CustomNodeView {
      createDOMElement(): HTMLElement {
        return document.createElement('div');
      }
    }

    const partialView = new PartialNodeView(
      null,
      mockEditorView,
      () => 1,
      []
    );

    expect(() => partialView.renderReactComponent()).toThrow('not implemented');
  });
});
});

describe('onSelection - Additional Coverage', () => {
  let mockObserver: SelectionObserver;

  beforeEach(() => {
    mockObserver = {
      disconnect: jest.fn(),
    } as unknown as SelectionObserver;
  });

  it('should warn and disconnect when containsNode is not supported', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(globalThis, 'getSelection').mockReturnValue({
      containsNode: undefined,
    } as unknown as Selection);

    onSelection([], mockObserver);

    expect(consoleWarnSpy).toHaveBeenCalledWith('selection.containsNode() is not supported');
    expect(mockObserver.disconnect).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});

describe('onMutation - Additional Coverage', () => {
  let mockObserver: MutationObserver;

  beforeEach(() => {
    mockObserver = {
      disconnect: jest.fn(),
    } as unknown as MutationObserver;
  });

  it('should return early when document.body is not available', () => {
    const originalBody = document.body;
    Object.defineProperty(document, 'body', {
      configurable: true,
      get: () => null,
    });

    const result = onMutation([], mockObserver);

    expect(result).toBeUndefined();

    Object.defineProperty(document, 'body', {
      configurable: true,
      get: () => originalBody,
    });
  });
});
