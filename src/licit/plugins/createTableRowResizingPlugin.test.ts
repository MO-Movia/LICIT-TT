/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorView } from 'prosemirror-view';
import createTableRowResizingPlugin, {
  findRowResizeTarget,
} from './createTableRowResizingPlugin';

function createTableDom() {
  const editor = document.createElement('div');
  const table = document.createElement('table');
  const row = document.createElement('tr');
  const cell = document.createElement('td');

  row.appendChild(cell);
  table.appendChild(row);
  editor.appendChild(table);
  document.body.appendChild(editor);

  editor.getBoundingClientRect = jest.fn(
    () =>
      ({
        left: 10,
        top: 20,
      }) as DOMRect
  );
  row.getBoundingClientRect = jest.fn(
    () =>
      ({
        bottom: 100,
        height: 40,
        left: 30,
        width: 240,
      }) as DOMRect
  );

  return {editor, row, cell};
}

function createMouseEvent(target: EventTarget, clientY: number) {
  const event = new MouseEvent('mousemove', {clientY, bubbles: true});
  Object.defineProperty(event, 'target', {value: target});
  return event;
}

function createView(editor: HTMLElement, options: {hasRow?: boolean} = {}) {
  const rowNode = {
    attrs: {rowHeight: '40px'},
    type: {spec: {tableRole: options.hasRow === false ? 'cell' : 'row'}},
  };
  const transaction = {
    setNodeMarkup: jest.fn().mockReturnThis(),
  };
  return {
    dom: editor,
    posAtDOM: jest.fn(() => 5),
    state: {
      tr: transaction,
      doc: {
        resolve: jest.fn(() => ({
          depth: 2,
          node: jest.fn(() => rowNode),
          before: jest.fn(() => 7),
        })),
        nodeAt: jest.fn(() => rowNode),
      },
    },
    dispatch: jest.fn(),
  } as unknown as EditorView;
}

describe('createTableRowResizingPlugin', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('finds a row resize target near the bottom of a table row', () => {
    const {editor, row, cell} = createTableDom();
    const view = createView(editor);
    const event = createMouseEvent(cell, 99);

    expect(findRowResizeTarget(view, event)).toEqual({
      rowElement: row,
      rowPos: 7,
      startHeight: 40,
    });
  });

  it('returns null when the mouse event cannot resolve a resizable row', () => {
    const {editor, cell} = createTableDom();
    const view = createView(editor);
    const nonElementEvent = createMouseEvent({} as EventTarget, 99);
    const noCellEvent = createMouseEvent(editor, 99);
    const awayFromBottomEvent = createMouseEvent(cell, 70);

    expect(findRowResizeTarget(view, nonElementEvent)).toBeNull();
    expect(findRowResizeTarget(view, noCellEvent)).toBeNull();
    expect(findRowResizeTarget(view, awayFromBottomEvent)).toBeNull();

    jest.mocked(view.posAtDOM).mockImplementationOnce(() => {
      throw new Error('missing dom position');
    });
    expect(findRowResizeTarget(view, createMouseEvent(cell, 99))).toBeNull();

    const viewWithoutRow = createView(editor, {hasRow: false});
    expect(findRowResizeTarget(viewWithoutRow, createMouseEvent(cell, 99))).toBeNull();
  });

  it('shows, drags, commits, and destroys the row resize handle', () => {
    const {editor, row, cell} = createTableDom();
    const view = createView(editor);
    const plugin = createTableRowResizingPlugin();
    const pluginView = plugin.spec.view?.(view);
    const events = plugin.spec.props?.handleDOMEvents;

    expect(editor.querySelector('.czi-table-row-resize-handle')).not.toBeNull();

    events?.mousemove?.call(plugin, view, createMouseEvent(cell, 99));
    const handle = editor.querySelector<HTMLDivElement>(
      '.czi-table-row-resize-handle'
    );
    expect(handle).not.toBeNull();
    if (!handle) {
      throw new Error('Expected row resize handle to exist');
    }
    expect(editor.style.cursor).toBe('row-resize');
    expect(handle.style.display).toBe('block');

    const downEvent = new MouseEvent('mousedown', {clientY: 99, bubbles: true});
    Object.defineProperty(downEvent, 'target', {value: cell});
    expect(events?.mousedown?.call(plugin, view, downEvent)).toBe(true);
    expect(events?.mousemove?.call(plugin, view, createMouseEvent(cell, 99))).toBe(true);

    window.dispatchEvent(new MouseEvent('mousemove', {clientY: 130}));
    expect(row.style.height).toBe('71px');
    expect(handle.classList.contains('is-dragging')).toBe(true);

    window.dispatchEvent(new MouseEvent('mouseup', {clientY: 130}));
    expect(view.state.tr.setNodeMarkup).toHaveBeenCalledWith(7, undefined, {
      rowHeight: '71px',
    });
    expect(view.dispatch).toHaveBeenCalledWith(view.state.tr);
    expect(handle.style.display).toBe('none');

    pluginView?.destroy();
    expect(editor.style.cursor).toBe('');
    expect(editor.querySelector('.czi-table-row-resize-handle')).toBeNull();
  });

  it('leaves events unhandled when no resize target is available', () => {
    const {editor} = createTableDom();
    const view = createView(editor);
    const plugin = createTableRowResizingPlugin();
    plugin.spec.view?.(view);
    const events = plugin.spec.props?.handleDOMEvents;

    expect(events?.mousemove?.call(plugin, view, createMouseEvent(editor, 99))).toBe(
      false
    );
    expect(editor.style.cursor).toBe('');
    expect(events?.mousedown?.call(plugin, view, createMouseEvent(editor, 99))).toBe(
      false
    );
    expect(events?.mouseleave?.call(plugin, view, new MouseEvent('mouseleave'))).toBe(
      false
    );
    window.dispatchEvent(new MouseEvent('mousemove', {clientY: 130}));
  });

  it('does not commit row height when the row node is unavailable on mouseup', () => {
    const {editor, cell} = createTableDom();
    const view = createView(editor);
    const plugin = createTableRowResizingPlugin();
    plugin.spec.view?.(view);
    const events = plugin.spec.props?.handleDOMEvents;
    const downEvent = new MouseEvent('mousedown', {clientY: 99, bubbles: true});
    Object.defineProperty(downEvent, 'target', {value: cell});

    expect(events?.mousedown?.call(plugin, view, downEvent)).toBe(true);
    jest.mocked(view.state.doc.nodeAt).mockReturnValueOnce(null);

    window.dispatchEvent(new MouseEvent('mouseup', {clientY: 110}));

    expect(view.state.tr.setNodeMarkup).not.toHaveBeenCalled();
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});
