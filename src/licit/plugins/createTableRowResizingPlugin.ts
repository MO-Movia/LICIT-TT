/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

const ROW_RESIZE_HANDLE_HEIGHT = 6;
const MIN_ROW_HEIGHT = 24;
const ROW_RESIZE_HANDLE_CLASSNAME = 'czi-table-row-resize-handle';
const ROW_RESIZE_HANDLE_GRIP_CLASSNAME = 'czi-table-row-resize-grip';
const ROW_RESIZE_HANDLE_VISIBLE_CLASSNAME = 'is-visible';
const ROW_RESIZE_HANDLE_DRAGGING_CLASSNAME = 'is-dragging';

type RowResizeTarget = {
  rowElement: HTMLTableRowElement;
  rowPos: number;
  startY: number;
  startHeight: number;
  nextHeight: number;
  view: EditorView;
};

function isElement(value: EventTarget | null): value is Element {
  return value instanceof Element;
}

function findRowPosition(view: EditorView, cell: HTMLElement): number | null {
  let pos: number;

  try {
    pos = view.posAtDOM(cell, 0);
  } catch {
    return null;
  }

  const $pos = view.state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.spec.tableRole === 'row') {
      return $pos.before(depth);
    }
  }

  return null;
}

export function findRowResizeTarget(
  view: EditorView,
  event: MouseEvent
): Omit<RowResizeTarget, 'startY' | 'nextHeight' | 'view'> | null {
  if (!isElement(event.target)) {
    return null;
  }

  const cell = event.target.closest<HTMLElement>('td, th');
  const rowElement = cell?.closest('tr');
  if (!cell || !rowElement) {
    return null;
  }

  const rowRect = rowElement.getBoundingClientRect();
  const isNearBottom =
    Math.abs(event.clientY - rowRect.bottom) <= ROW_RESIZE_HANDLE_HEIGHT;
  if (!isNearBottom) {
    return null;
  }

  const rowPos = findRowPosition(view, cell);
  if (rowPos === null) {
    return null;
  }

  return {
    rowElement,
    rowPos,
    startHeight: rowRect.height,
  };
}

function createRowResizeHandle(view: EditorView): HTMLElement {
  const handle = document.createElement('div');
  handle.className = ROW_RESIZE_HANDLE_CLASSNAME;
  handle.setAttribute('aria-hidden', 'true');
  handle.appendChild(document.createElement('span')).className =
    ROW_RESIZE_HANDLE_GRIP_CLASSNAME;
  handle.style.display = 'none';
  handle.style.pointerEvents = 'none';
  handle.style.position = 'absolute';
  handle.style.zIndex = '2147483647';
  view.dom.appendChild(handle);
  return handle;
}

function showRowResizeHandle(
  handle: HTMLElement,
  view: EditorView,
  target: Pick<RowResizeTarget, 'rowElement'>
): void {
  const rowRect = target.rowElement.getBoundingClientRect();
  positionRowResizeHandle(handle, view, rowRect, rowRect.bottom);
}

function showRowResizeHandleAtY(
  handle: HTMLElement,
  view: EditorView,
  target: Pick<RowResizeTarget, 'rowElement'>,
  clientY: number
): void {
  const rowRect = target.rowElement.getBoundingClientRect();
  positionRowResizeHandle(handle, view, rowRect, clientY);
}

function positionRowResizeHandle(
  handle: HTMLElement,
  view: EditorView,
  rowRect: DOMRect,
  bottom: number
): void {
  const editorRect = view.dom.getBoundingClientRect();
  const editorScrollLeft = view.dom.scrollLeft || 0;
  const editorScrollTop = view.dom.scrollTop || 0;
  const left = rowRect.left - editorRect.left + editorScrollLeft;
  const top =
    bottom - editorRect.top + editorScrollTop - ROW_RESIZE_HANDLE_HEIGHT / 2;

  handle.style.left = `${Math.round(left)}px`;
  handle.style.top = `${Math.round(top)}px`;
  handle.style.width = `${Math.round(rowRect.width)}px`;
  handle.style.display = 'block';
  handle.classList.add(ROW_RESIZE_HANDLE_VISIBLE_CLASSNAME);
}

function hideRowResizeHandle(handle: HTMLElement): void {
  handle.style.display = 'none';
  handle.classList.remove(
    ROW_RESIZE_HANDLE_VISIBLE_CLASSNAME,
    ROW_RESIZE_HANDLE_DRAGGING_CLASSNAME
  );
}

function setRowHeight(view: EditorView, rowPos: number, height: number): void {
  const rowNode = view.state.doc.nodeAt(rowPos);
  if (rowNode?.type.spec.tableRole !== 'row') {
    return;
  }

  view.dispatch(
    view.state.tr.setNodeMarkup(rowPos, undefined, {
      ...rowNode.attrs,
      rowHeight: `${height}px`,
    })
  );
}

export default function createTableRowResizingPlugin(): Plugin {
  let resizeTarget: RowResizeTarget | null = null;
  let resizeHandle: HTMLElement | null = null;

  const stopResize = (): void => {
    globalThis.window.removeEventListener('mousemove', onMouseMove, true);
    globalThis.window.removeEventListener('mouseup', onMouseUp, true);
    if (resizeHandle) {
      hideRowResizeHandle(resizeHandle);
    }
    resizeTarget = null;
  };

  const onMouseMove = (event: MouseEvent): void => {
    if (!resizeTarget) {
      return;
    }

    event.preventDefault();

    const delta = event.clientY - resizeTarget.startY;
    const nextHeight = Math.max(
      MIN_ROW_HEIGHT,
      Math.round(resizeTarget.startHeight + delta)
    );

    resizeTarget.nextHeight = nextHeight;
    resizeTarget.rowElement.style.height = `${nextHeight}px`;
    if (resizeHandle) {
      showRowResizeHandleAtY(
        resizeHandle,
        resizeTarget.view,
        resizeTarget,
        event.clientY
      );
      resizeHandle.classList.add(ROW_RESIZE_HANDLE_DRAGGING_CLASSNAME);
    }
  };

  const onMouseUp = (event: MouseEvent): void => {
    if (resizeTarget) {
      event.preventDefault();
      setRowHeight(
        resizeTarget.view,
        resizeTarget.rowPos,
        resizeTarget.nextHeight
      );
    }

    stopResize();
  };

  return new Plugin({
    key: new PluginKey('TableRowResizingPlugin'),
    props: {
      handleDOMEvents: {
        mousemove(view: EditorView, event: MouseEvent): boolean {
          if (resizeTarget) {
            return true;
          }

          const target = findRowResizeTarget(view, event);
          view.dom.style.cursor = target ? 'row-resize' : '';
          if (resizeHandle) {
            if (target) {
              showRowResizeHandle(resizeHandle, view, target);
            } else {
              hideRowResizeHandle(resizeHandle);
            }
          }
          return false;
        },
        mouseleave(view: EditorView): boolean {
          if (!resizeTarget) {
            view.dom.style.cursor = '';
            if (resizeHandle) {
              hideRowResizeHandle(resizeHandle);
            }
          }
          return false;
        },
        mousedown(view: EditorView, event: MouseEvent): boolean {
          const target = findRowResizeTarget(view, event);
          if (!target) {
            return false;
          }

          event.preventDefault();
          event.stopPropagation();

          resizeTarget = {
            ...target,
            startY: event.clientY,
            nextHeight: Math.round(target.startHeight),
            view,
          };

          view.dom.style.cursor = 'row-resize';
          if (resizeHandle) {
            showRowResizeHandle(resizeHandle, view, resizeTarget);
            resizeHandle.classList.add(ROW_RESIZE_HANDLE_DRAGGING_CLASSNAME);
          }
          globalThis.window.addEventListener('mousemove', onMouseMove, true);
          globalThis.window.addEventListener('mouseup', onMouseUp, true);

          return true;
        },
      },
    },
    view(view: EditorView) {
      resizeHandle = createRowResizeHandle(view);
      return {
        destroy() {
          view.dom.style.cursor = '';
          resizeHandle?.remove();
          resizeHandle = null;
          stopResize();
        },
      };
    },
  });
}
