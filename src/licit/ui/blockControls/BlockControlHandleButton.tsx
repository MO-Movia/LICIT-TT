/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';

export type BlockControlHandleButtonProps = {
  label?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const BlockControlHandleButton = React.forwardRef<
  HTMLButtonElement,
  BlockControlHandleButtonProps
>(({label = 'Block options', onClick}, ref) => {
  const stopEvent = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <button
      aria-label={label}
      className="licit-block-control-trigger licit-block-control-handle handle-hidden-on-hover"
      onClick={onClick}
      onMouseDown={stopEvent}
      onMouseUp={stopEvent}
      onPointerDown={stopEvent}
      ref={ref}
      type="button"
    >
      {'\u2630'}
    </button>
  );
});

BlockControlHandleButton.displayName = 'BlockControlHandleButton';
