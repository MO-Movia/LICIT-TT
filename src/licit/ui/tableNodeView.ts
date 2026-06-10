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

export class LicitTableNodeView extends TableView {
  private readonly _view: EditorView;
  private readonly _menuButton: HTMLElement;
  private _menu?: PopUpHandle;
  private _tablePos: number | null = null;

  constructor(
    node: ProseMirrorNode,
    defaultCellMinWidth: number,
    view: EditorView
  ) {
    super(node, defaultCellMinWidth);
    this._view = view;
    this._wrapTableView();
    this._menuButton = createBlockControlHandle({
      label: 'Table options',
      onClick: this._onMenuClick,
    });
    this.dom.appendChild(this._menuButton);
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

  private _onMenuClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    if (this._menu) {
      this._closeMenu();
      return;
    }

    this._tablePos = this._view.posAtDOM(this.table, 0) - 1;
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
