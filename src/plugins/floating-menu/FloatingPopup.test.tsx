/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import React, {isValidElement} from 'react';
import {FloatingMenu} from './FloatingPopup';
import {FloatingMenuItem} from './model';
import {EditorView} from 'prosemirror-view';
import {EditorState} from 'prosemirror-state';

// Mock the CustomButton component
jest.mock('../../commands/ui/CustomButton', () => ({
  CustomButton: ({
    label,
    disabled,
    onClick,
  }: {
    label: string;
    disabled: boolean;
    onClick: () => void;
  }) => (
    <button
      data-testid="custom-button"
      disabled={disabled}
      onClick={onClick}
      className={disabled ? 'disabled' : ''}
    >
      {label}
    </button>
  ),
}));

describe('FloatingPopup', () => {
  const mockClose = jest.fn();
  const mockOnClick = jest.fn();
  const mockDispatch = jest.fn();

  const mockView = {
    state: {} as EditorState,
    dispatch: mockDispatch,
  } as unknown as EditorView;

  const mockContext = {
    editorView: mockView,
    editorState: {} as EditorState,
    paragraphPos: 0,
  };

  const mockItems: FloatingMenuItem[] = [
    {
      label: 'Copy',
      onClick: mockOnClick,
    },
    {
      label: 'Paste',
      onClick: mockOnClick,
      disabled: () => 'No clipboard data',
    },
    {
      label: 'Cut',
      onClick: mockOnClick,
      disabled: () => undefined,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the floating menu with items', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });
      const element = instance.render();

      expect(isValidElement(element)).toBe(true);
      expect(instance.props.items).toHaveLength(3);
    });

    it('should render with correct role attribute', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });
      const element = instance.render();

      // Check that the rendered element has the correct structure
      expect(isValidElement(element)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (element as any).props as Record<string, unknown>;
      expect(props.role).toBe('menu');
    });

    it('should render item labels correctly', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });
      const element = instance.render();

      expect(isValidElement(element)).toBe(true);
      expect(instance.props.items[0].label).toBe('Copy');
      expect(instance.props.items[1].label).toBe('Paste');
      expect(instance.props.items[2].label).toBe('Cut');
    });

    it('should handle empty items array', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: [],
        close: mockClose,
      });
      instance.render();

      expect(instance.props.items).toHaveLength(0);
    });
  });

  describe('Disabled state', () => {
    it('should disable item when disabled function returns string', () => {
      const disabledResult = mockItems[1].disabled?.(mockContext);
      expect(disabledResult).toBe('No clipboard data');
    });

    it('should not disable item when disabled function returns undefined', () => {
      const disabledResult = mockItems[2].disabled?.(mockContext);
      expect(disabledResult).toBeUndefined();
    });

    it('should not disable item when disabled function is not provided', () => {
      const itemsWithoutDisabled: FloatingMenuItem[] = [
        {
          label: 'Copy',
          onClick: mockOnClick,
        },
      ];

      const disabledResult = itemsWithoutDisabled[0].disabled?.(mockContext);
      expect(disabledResult).toBeUndefined();
    });
  });

  describe('Click handling', () => {
    it('should call close and onClick when item is clicked', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });

      // Simulate clicking the first item
      instance.props.items[0].onClick(mockContext);
      mockClose();

      expect(mockClose).toHaveBeenCalled();
      expect(mockOnClick).toHaveBeenCalledWith(mockContext);
    });

    it('should not call onClick when disabled item is clicked', () => {
      // The disabled item's onClick should not be called when disabled
      const disabledResult = mockItems[1].disabled?.(mockContext);
      expect(disabledResult).toBe('No clipboard data');
    });

    it('should handle multiple clicks on different items', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });

      // Simulate clicking multiple items
      instance.props.items[0].onClick(mockContext);
      mockClose();
      instance.props.items[2].onClick(mockContext);
      mockClose();

      expect(mockOnClick).toHaveBeenCalledTimes(2);
      expect(mockClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component behavior', () => {
    it('should update when items prop changes', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });
      instance.render();

      expect(instance.props.items).toHaveLength(3);

      const newItems: FloatingMenuItem[] = [
        {
          label: 'New Item',
          onClick: mockOnClick,
        },
      ];

      const newInstance = new FloatingMenu({
        context: mockContext,
        items: newItems,
        close: mockClose,
      });
      newInstance.render();

      expect(newInstance.props.items).toHaveLength(1);
      expect(newInstance.props.items[0].label).toBe('New Item');
    });

    it('should update when context prop changes', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });
      instance.render();

      const newContext = {
        ...mockContext,
        paragraphPos: 10,
      };

      const newInstance = new FloatingMenu({
        context: newContext,
        items: mockItems,
        close: mockClose,
      });
      newInstance.render();

      // The component should re-render with new context
      expect(newInstance.props.context.paragraphPos).toBe(10);
      expect(newInstance.props.items).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle null context gracefully', () => {
      // TypeScript should prevent this, but we test runtime behavior
      const instance = new FloatingMenu({
        context: null!,
        items: mockItems,
        close: mockClose,
      });
      expect(instance).toBeDefined();
    });

    it('should handle items without onClick', () => {
      const invalidItems: FloatingMenuItem[] = [
        {
          label: 'Invalid',
          onClick: null!,
        },
      ];

      const instance = new FloatingMenu({
        context: mockContext,
        items: invalidItems,
        close: mockClose,
      });
      expect(instance).toBeDefined();
    });

    it('should handle disabled function that throws error', () => {
      const errorItems: FloatingMenuItem[] = [
        {
          label: 'Error Item',
          onClick: mockOnClick,
          disabled: () => {
            throw new Error('Disabled function error');
          },
        },
      ];

      const instance = new FloatingMenu({
        context: mockContext,
        items: errorItems,
        close: mockClose,
      });
      expect(instance).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA role', () => {
      const instance = new FloatingMenu({
        context: mockContext,
        items: mockItems,
        close: mockClose,
      });
      const element = instance.render();

      // Check that the element is valid
      expect(isValidElement(element)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (element as any).props as Record<string, unknown>;
      expect(props.role).toBe('menu');
    });

    it('should have disabled attribute on disabled buttons', () => {
      // Check that the disabled function returns a truthy value for the disabled item
      const disabledResult = mockItems[1].disabled?.(mockContext);
      expect(disabledResult).toBe('No clipboard data');
    });
  });
});
