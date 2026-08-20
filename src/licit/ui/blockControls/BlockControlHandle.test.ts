/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {createBlockControlHandle} from './BlockControlHandle';

describe('createBlockControlHandle', () => {
  it('creates a button with the default accessible label', () => {
    const handle = createBlockControlHandle({onClick: jest.fn()});

    expect(handle.tagName).toBe('BUTTON');
    expect(handle.getAttribute('aria-label')).toBe('Block options');
    expect(handle.getAttribute('type')).toBe('button');
    expect(handle.className).toBe(
      'licit-block-control-trigger licit-block-control-handle handle-hidden-on-hover'
    );
    expect(handle.textContent).toBe('\u2630');
  });

  it('uses a custom accessible label when provided', () => {
    const handle = createBlockControlHandle({
      label: 'Table options',
      onClick: jest.fn(),
    });

    expect(handle.getAttribute('aria-label')).toBe('Table options');
  });

  it.each(['pointerdown', 'mousedown', 'mouseup'])(
    'prevents and stops %s events',
    (eventName) => {
      const handle = createBlockControlHandle({onClick: jest.fn()});
      const event = new Event(eventName, {bubbles: true, cancelable: true});
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      handle.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(stopPropagationSpy).toHaveBeenCalled();
    }
  );

  it('calls onClick for click events', () => {
    const onClick = jest.fn();
    const handle = createBlockControlHandle({onClick});
    const event = new MouseEvent('click', {bubbles: true});

    handle.dispatchEvent(event);

    expect(onClick).toHaveBeenCalledWith(event);
  });

  it.each(['Enter', ' '])('handles %s key activation', (key) => {
    const onClick = jest.fn();
    const handle = createBlockControlHandle({onClick});
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
    });
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

    handle.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(event);
  });

  it('ignores other keydown events', () => {
    const onClick = jest.fn();
    const handle = createBlockControlHandle({onClick});
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    });
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

    handle.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(stopPropagationSpy).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
