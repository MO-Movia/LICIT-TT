/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React, {act} from 'react';
import {createRoot, Root} from 'react-dom/client';

import {UICommand} from '../../../core';
import {ImageSizeFitEditor, ImageSizeFitEditorProps} from './ImageSizeFitEditor';

describe('ImageSizeFitEditor', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onApply: jest.Mock;
  let onCancel: jest.Mock;

  const renderEditor = (
    props: Partial<ImageSizeFitEditorProps> = {}
  ): ImageSizeFitEditorProps => {
    onApply = jest.fn();
    onCancel = jest.fn();
    const nextProps: ImageSizeFitEditorProps = {
      canReset: true,
      height: 300,
      maxWidth: 600,
      onApply,
      onCancel,
      originalHeight: 300,
      originalWidth: 400,
      width: 400,
      ...props,
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<ImageSizeFitEditor {...nextProps} />);
    });

    return nextProps;
  };

  const getInputs = (): HTMLInputElement[] =>
    Array.from(container.querySelectorAll('input'));

  const getButton = (text: string): HTMLButtonElement => {
    const button = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent === text
    );
    if (!button) {
      throw new Error(`Button not found: ${text}`);
    }
    return button;
  };

  const getButtonByLabel = (label: string): HTMLButtonElement => {
    const button = Array.from(container.querySelectorAll('button')).find(
      (element) => element.getAttribute('aria-label') === label
    );
    if (!button) {
      throw new Error(`Button not found: ${label}`);
    }
    return button;
  };

  const getLockButton = (): HTMLButtonElement => {
    const button = container.querySelector<HTMLButtonElement>(
      '.czi-image-size-fit-lock'
    );
    if (!button) {
      throw new Error('Lock button not found.');
    }
    return button;
  };

  const changeInput = (input: HTMLInputElement, value: string): void => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    act(() => {
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', {bubbles: true}));
    });
  };

  const click = (button: HTMLButtonElement): void => {
    act(() => {
      button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
  };

  const submit = (): void => {
    const form = container.querySelector('form');
    if (!form) {
      throw new Error('Image size form not found.');
    }
    act(() => {
      form.dispatchEvent(
        new Event('submit', {bubbles: true, cancelable: true})
      );
    });
  };

  beforeEach(() => {
    UICommand.theme = 'light';
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    jest.restoreAllMocks();
  });

  it('renders bounded light-theme dimensions and applies them', () => {
    renderEditor({height: 0, originalHeight: 200, originalWidth: 500, width: 0});
    const [widthInput, heightInput] = getInputs();

    expect(container.querySelector('form')?.className).toContain('light');
    expect(widthInput.value).toBe('500');
    expect(heightInput.value).toBe('200');

    submit();

    expect(onApply).toHaveBeenCalledWith(500, 200);
  });

  it('renders dark theme and cancels from both cancel controls', () => {
    UICommand.theme = 'dark';
    renderEditor();

    expect(container.querySelector('form')?.className).toContain('dark');

    click(getButton('Cancel'));
    click(getButtonByLabel('Close Size & fit'));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('keeps dimensions linked while locked and applies valid drafts', () => {
    renderEditor({height: 200, width: 400});
    const [widthInput, heightInput] = getInputs();

    changeInput(widthInput, '500');
    expect(heightInput.value).toBe('250');

    changeInput(heightInput, '300');
    expect(widthInput.value).toBe('600');

    submit();

    expect(onApply).toHaveBeenCalledWith(600, 300);
  });

  it('keeps dimensions independent when unlocked and derives fit ratio from drafts', () => {
    renderEditor({height: 200, maxWidth: 900, width: 400});
    const [widthInput, heightInput] = getInputs();

    click(getLockButton());
    changeInput(widthInput, '300');
    changeInput(heightInput, '100');

    expect(widthInput.value).toBe('300');
    expect(heightInput.value).toBe('100');

    click(getButton('Fit Width'));

    expect(widthInput.value).toBe('900');
    expect(heightInput.value).toBe('300');
  });

  it('shows validation and blocks apply for invalid drafts', () => {
    renderEditor();
    const [widthInput, heightInput] = getInputs();

    changeInput(widthInput, '10');
    expect(
      container.querySelector('.czi-image-size-fit-validation')
    ).toBeTruthy();
    expect(widthInput.getAttribute('aria-invalid')).toBe('true');
    expect(heightInput.getAttribute('aria-describedby')).toBeTruthy();

    submit();

    expect(onApply).not.toHaveBeenCalled();
  });

  it('permits clearing a dimension before retyping', () => {
    renderEditor();
    const [widthInput, heightInput] = getInputs();

    changeInput(widthInput, '');
    changeInput(heightInput, '');
    expect(widthInput.value).toBe('');
    expect(heightInput.value).toBe('');
    expect(container.querySelector('.czi-image-size-fit-validation')).toBeTruthy();
  });

  it('resets to bounded original dimensions when reset is enabled', () => {
    renderEditor({
      height: 100,
      originalHeight: 50000,
      originalWidth: 25000,
      width: 100,
    });
    const [widthInput, heightInput] = getInputs();

    click(getButton('Reset Image'));

    expect(widthInput.value).toBe('5000');
    expect(heightInput.value).toBe('10000');
  });

  it('disables reset and falls back fit width when reset is unavailable', () => {
    renderEditor({
      canReset: false,
      height: Number.NaN,
      maxWidth: Number.NaN,
      originalHeight: Number.NaN,
      originalWidth: Number.NaN,
      width: Number.NaN,
    });
    const [widthInput, heightInput] = getInputs();
    const resetButton = getButton('Reset Image');

    expect(widthInput.value).toBe('20');
    expect(heightInput.value).toBe('20');
    expect(resetButton.disabled).toBe(true);

    click(resetButton);
    click(getButton('Fit Width'));

    expect(widthInput.value).toBe('20');
    expect(heightInput.value).toBe('20');
  });
});
