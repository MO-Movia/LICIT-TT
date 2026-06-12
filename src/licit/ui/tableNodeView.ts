/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {Node as ProseMirrorNode} from 'prosemirror-model';
import {TextSelection} from 'prosemirror-state';
import {TableView} from 'prosemirror-tables';
import {EditorView} from 'prosemirror-view';

import {atAnchorBottomLeft, createPopUp, PopUpHandle} from '../../commands';
import {
  BlockControlMenu,
  BlockControlMenuItem,
  createBlockControlHandle,
  getBlockControlIcon,
} from './blockControls';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';
const ENHANCED_TABLE_FIGURE = 'enhanced_table_figure';
const ENHANCED_TABLE_FIGURE_BODY = 'enhanced_table_figure_body';

export class LicitTableNodeView extends TableView {
  private readonly _view: EditorView;
  private readonly _menuButton: HTMLElement;
  private _menu?: PopUpHandle;
  private _tablePos: number | null = null;
  private _node: ProseMirrorNode;

  constructor(
    node: ProseMirrorNode,
    defaultCellMinWidth: number,
    view: EditorView
  ) {
    super(node, defaultCellMinWidth);
    this._view = view;
    this._node = node;
    this._wrapTableView();
    this._menuButton = createBlockControlHandle({
      label: 'Table options',
      onClick: this._onMenuClick,
    });
    this._syncMenuButtonVisibility();
  }

  update(node: ProseMirrorNode): boolean {
    const updated = super.update(node);
    if (updated) {
      this._node = node;
      this._syncMenuButtonVisibility();
    }
    return updated;
  }

  ignoreMutation(record: MutationRecord): boolean {
    const target = record.target;
    if (
      target instanceof window.Node &&
      this._menuButton.contains(target)
    ) {
      return true;
    }
    return super.ignoreMutation(record);
  }

  stopEvent(event: Event): boolean {
    const target = event.target;
    return target instanceof window.Node && this._menuButton.contains(target);
  }

  destroy(): void {
    this._closeMenu();
    this._menuButton.remove();
  }

  private _wrapTableView(): void {
    const tableWrapper = this.dom;
    const tableControl = document.createElement('div');
    tableControl.className = 'czi-table-control has-hover-handle';
    tableControl.appendChild(tableWrapper);
    this.dom = tableControl;
  }

  private _syncMenuButtonVisibility(): void {
    const shouldShowMenuButton = !this._isInsideEnhancedTableFigure();
    this.dom.classList.toggle('has-hover-handle', shouldShowMenuButton);

    if (shouldShowMenuButton) {
      if (!this._menuButton.parentElement) {
        this.dom.appendChild(this._menuButton);
      }
      return;
    }

    this._closeMenu();
    this._menuButton.remove();
  }

  private _isInsideEnhancedTableFigure(): boolean {
    const pos = this._getCurrentTablePos();

    try {
      if (pos !== null) {
        const resolvedPos = this._view.state.doc.resolve(pos);
        for (let depth = resolvedPos.depth; depth >= 0; depth--) {
          const nodeName = resolvedPos.node(depth).type.name;
          if (
            nodeName === ENHANCED_TABLE_FIGURE ||
            nodeName === ENHANCED_TABLE_FIGURE_BODY
          ) {
            return true;
          }
        }
      }
    } catch {
      // Fall through to the DOM check below.
    }

    return (
      !!this.dom.closest(
        "[data-type='enhanced-table-figure'], [data-type='enhanced-table-figure-body'], .enhanced-table-figure, .enhanced-table-figure-body"
      )
    );
  }

  private _getCurrentTablePos(): number | null {
    let foundPos: number | null = null;
    this._view.state.doc.descendants((node, pos) => {
      if (node === this._node) {
        foundPos = pos;
        return false;
      }
      return true;
    });

    if (foundPos !== null) {
      return foundPos;
    }

    try {
      return this._view.posAtDOM(this.table, 0) - 1;
    } catch {
      return null;
    }
  }

  private _onMenuClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    if (this._menu) {
      this._closeMenu();
      return;
    }

    this._tablePos = this._getCurrentTablePos();
    if (this._tablePos === null || this._isInsideEnhancedTableFigure()) {
      this._closeMenu();
      return;
    }
    this._menu = createPopUp(
      BlockControlMenu,
      {
        close: this._closeMenu,
        items: this._getMenuItems(),
      },
      {
        anchor: this._menuButton,
        autoDismiss: true,
        container: this.dom.closest(`.${FRAMESET_BODY_CLASSNAME}`),
        position: atAnchorBottomLeft,
        onClose: () => {
          this._menu = undefined;
        },
      }
    );
  };

  private _closeMenu = (): void => {
    const menu = this._menu;
    this._menu = undefined;
    menu?.close?.(undefined);
  };

  private _getMenuItems(): BlockControlMenuItem[] {
    return [
      {
        id: 'insert-above',
        label: 'Insert Paragraph Above',
        icon: getBlockControlIcon('insertAbove', 'Insert Paragraph Above'),
        action: () => this._insertParagraph('above'),
      },
      {
        id: 'insert-below',
        label: 'Insert Paragraph Below',
        icon: getBlockControlIcon('insertBelow', 'Insert Paragraph Below'),
        action: () => this._insertParagraph('below'),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: getBlockControlIcon('delete', 'Delete'),
        action: () => this._deleteTable(),
      },
    ];
  }

  private _getTableInfo(): {node: ProseMirrorNode; pos: number} | null {
    if (this._tablePos === null) {
      return null;
    }

    const table = this._view.state.doc.nodeAt(this._tablePos);
    if (!table || table.type.spec.tableRole !== 'table') {
      return null;
    }

    return {node: table, pos: this._tablePos};
  }

  private _insertParagraph(placement: 'above' | 'below'): void {
    const tableInfo = this._getTableInfo();
    const paragraph = this._view.state.schema.nodes.paragraph?.createAndFill();
    if (!tableInfo || !paragraph) {
      return;
    }

    const insertPos =
      placement === 'above'
        ? tableInfo.pos
        : tableInfo.pos + tableInfo.node.nodeSize;
    let tr = this._view.state.tr.insert(insertPos, paragraph);
    tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
    this._view.dispatch(tr.scrollIntoView());
    this._view.focus();
  }

  private _deleteTable(): void {
    const tableInfo = this._getTableInfo();
    if (!tableInfo) {
      return;
    }

    this._view.dispatch(
      this._view.state.tr
        .delete(tableInfo.pos, tableInfo.pos + tableInfo.node.nodeSize)
        .scrollIntoView()
    );
    this._view.focus();
  }
}
