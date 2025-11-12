import {
  onSelection,
  onMutation,
  CustomNodeView,
  EditorFocused,
} from './CustomNodeView';
import {SelectionObserver} from './SelectionObserver';
import React from 'react';
import {EditorVideoRuntime} from '../Types';

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
  it('should handle mutation gracefully', () => {
    expect(testNodeView).toBeDefined();
    expect(testNodeView.dom).toBeInstanceOf(HTMLElement);
  });
});
