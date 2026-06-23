/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export type BlockControlHandleOptions = {
  label?: string;
  onClick: (event: Event) => void;
};

function stopBlockControlEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

export function createBlockControlHandle(
  options: BlockControlHandleOptions
): HTMLElement {
  const handle = document.createElement('button');
  handle.className =
    'licit-block-control-trigger licit-block-control-handle handle-hidden-on-hover';
  handle.setAttribute('aria-label', options.label || 'Block options');
  handle.setAttribute('type', 'button');
  handle.textContent = '\u2630';

  handle.addEventListener('pointerdown', stopBlockControlEvent);
  handle.addEventListener('mousedown', stopBlockControlEvent);
  handle.addEventListener('mouseup', stopBlockControlEvent);
  handle.addEventListener('click', options.onClick);
  handle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      options.onClick(event);
    }
  });

  return handle;
}
