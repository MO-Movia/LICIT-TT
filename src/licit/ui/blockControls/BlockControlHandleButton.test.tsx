/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import {BlockControlHandleButton} from './BlockControlHandleButton';

describe('BlockControlHandleButton', () => {
  function renderButtonElement(
    props: Partial<React.ComponentProps<typeof BlockControlHandleButton>> = {},
    ref?: React.Ref<HTMLButtonElement>
  ): React.ReactElement {
    const component = BlockControlHandleButton as unknown as {
      render: (
        props: React.ComponentProps<typeof BlockControlHandleButton>,
        ref?: React.Ref<HTMLButtonElement>
      ) => React.ReactElement;
    };

    return component.render({onClick: jest.fn(), ...props}, ref);
  }

  it('renders with the default accessible label', () => {
    const button = renderButtonElement();

    expect(button.type).toBe('button');
    expect(button.props['aria-label']).toBe('Block options');
    expect(button.props.type).toBe('button');
    expect(button.props.className).toBe(
      'licit-block-control-trigger licit-block-control-handle handle-hidden-on-hover'
    );
    expect(button.props.children).toBe('\u2630');
  });

  it('renders with a custom accessible label', () => {
    const button = renderButtonElement({label: 'Image options'});

    expect(button.props['aria-label']).toBe('Image options');
  });

  it('forwards its button ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const button = renderButtonElement({}, ref) as React.ReactElement & {
      ref?: React.Ref<HTMLButtonElement>;
    };

    expect(button.ref).toBe(ref);
  });

  it('calls onClick for click events', () => {
    const onClick = jest.fn();
    const button = renderButtonElement({onClick});
    const event = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    button.props.onClick(event);

    expect(onClick).toHaveBeenCalledWith(event);
  });

  it.each(['pointerdown', 'mousedown', 'mouseup'])(
    'prevents and stops %s events',
    (eventName) => {
      const button = renderButtonElement();
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.MouseEvent<HTMLButtonElement>;
      const handlerNameByEvent: Record<string, string> = {
        pointerdown: 'onPointerDown',
        mousedown: 'onMouseDown',
        mouseup: 'onMouseUp',
      };

      button.props[handlerNameByEvent[eventName]](event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    }
  );

  it('sets a display name', () => {
    expect(BlockControlHandleButton.displayName).toBe(
      'BlockControlHandleButton'
    );
  });
});
