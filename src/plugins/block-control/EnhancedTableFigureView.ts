/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node as ProseMirrorNode } from 'prosemirror-model';
import { TextSelection, Transaction } from 'prosemirror-state';
import { EditorView, NodeView } from 'prosemirror-view';

import { addNotesCommand } from './EnhancedTableCommands';
import {
  atAnchorBottomLeft,
  atAnchorTopCenter,
  createPopUp,
  PopUpHandle,
  uuid,
} from '../../commands';
import {
  BlockControlMenu,
  BlockControlMenuItem,
  createBlockControlHandle,
  getBlockControlIcon,
} from '../../licit/ui/blockControls';
import { CropDataPropValue, CropImagePopup } from './ui/CropImagePopup';
import { openTableStylePicker } from '../../licit/ui/tableStylePicker';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';
const PORTRAIT_WIDTH_PX = 6.5 * 96;
export class EnhancedTableFigureView implements NodeView {
  node: ProseMirrorNode;
  view: EditorView;
  getPos: () => number;
  dom: HTMLElement;
  contentDOM: HTMLElement;
  contentScrollDOM: HTMLElement;
  selectHandle: HTMLElement;
  _menu?: PopUpHandle;
  _stylePicker?: PopUpHandle;
  _cropEditor?: PopUpHandle;
  _id = uuid();

  constructor(node: ProseMirrorNode, view: EditorView, getPos: () => number) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;

    this.dom = document.createElement('div');
    this.dom.setAttribute('id', this._id);
    this.dom.className = 'enhanced-table-figure has-hover-handle';
    this.dom.dataset.type = 'enhanced-table-figure';
    this.dom.dataset.id = String(node.attrs.id);
    this.dom.dataset.figureType = String(node.attrs.figureType);
    this.dom.style.position = 'relative';
    this.dom.style.overflow = 'visible';
    this.dom.style.width = `${PORTRAIT_WIDTH_PX}px`;
    this.dom.style.maxWidth = `${PORTRAIT_WIDTH_PX}px`;

    this.contentScrollDOM = document.createElement('div');
    this.contentScrollDOM.className = 'enhanced-table-figure-scroll';
    this.contentScrollDOM.style.overflowX = 'auto';
    this.contentScrollDOM.style.overflowY = 'visible';
    this.contentScrollDOM.style.width = '100%';

    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'enhanced-table-figure-content';
    this.contentDOM.style.width = '100%';
    this.contentScrollDOM.appendChild(this.contentDOM);
    this.dom.appendChild(this.contentScrollDOM);

    this.selectHandle = createBlockControlHandle({
      label: 'Enhanced content options',
      onClick: this.handleMenuClick,
    });
    this.dom.appendChild(this.selectHandle);
  }

  onResizeEnd = (newWidth: number, newHeight: number): void => {
    const { state, dispatch } = this.view;
    const pos = this.getPos();
    dispatch(
      state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        width: newWidth,
        height: newHeight,
      })
    );
  };

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.dom.style.overflow = 'visible';
    this.dom.style.width = `${PORTRAIT_WIDTH_PX}px`;
    this.dom.style.maxWidth = `${PORTRAIT_WIDTH_PX}px`;
    this.contentScrollDOM.style.overflowX = 'auto';
    this.contentScrollDOM.style.overflowY = 'visible';
    this.contentScrollDOM.style.width = '100%';
    this.contentDOM.style.width = '100%';

    this.dom.dataset.id = String(node.attrs.id);
    this.dom.dataset.figureType = String(node.attrs.figureType);
    this.dom.dataset.orientation = String(node.attrs.orientation);
    this.dom.dataset.maximized = node.attrs.maximized ? 'true' : 'false';

    const baseClasses = ['enhanced-table-figure', 'has-hover-handle'];
    if (node.attrs.orientation === 'landscape') {
      baseClasses.push('landscape');
    }
    if (node.attrs.maximized) {
      baseClasses.push('maximized');
    }
    if (this.dom.classList.contains('ProseMirror-selectednode')) {
      baseClasses.push('ProseMirror-selectednode');
    }
    this.dom.className = baseClasses.join(' ');

    return true;
  }

  hasNotes(): boolean {
    for (let index = 0; index < this.node.childCount; index++) {
      const child = this.node.child(index);
      if (child.type.name === 'enhanced_table_figure_notes') {
        return true;
      }
    }
    return false;
  }

  updateNotesTrigger(): void {
    // Kept as a compatibility shim for existing tests and callers.
  }

  selectNode(): void {
    this.dom.classList.add('ProseMirror-selectednode');
    this.dom.dataset.active = 'true';
  }

  deselectNode(): void {
    this.dom.dataset.active = 'false';
    this.closeMenu();
    this.dom.classList.remove('ProseMirror-selectednode');
  }

  destroy(): void {
    this.closeMenu();
    this._cropEditor?.close?.(undefined);
    this.selectHandle.remove();
  }

  stopEvent(event: Event): boolean {
    const target = event.target;
    return target instanceof globalThis.Node && this.selectHandle.contains(target);
  }

  private readonly handleMenuClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    if (this._menu) {
      this.closeMenu();
      return;
    }

    const items = this.getMenuItems();
    this._menu = createPopUp(
      BlockControlMenu,
      {
        close: this.closeMenu,
        items,
      },
      {
        anchor: this.selectHandle,
        autoDismiss: true,
        container: this.dom.closest(`.${FRAMESET_BODY_CLASSNAME}`),
        position: atAnchorBottomLeft,
        onClose: () => {
          this._menu = undefined;
        },
      }
    );
  };

  private getMenuItems(): BlockControlMenuItem[] {
    const figureType = this.node.attrs.figureType;
    const hasImage = this.findImagePath(this.getPos()) !== null;
    const canAddNotes =
      !this.hasNotes() && (figureType === 'table' || figureType === 'figure');

    return [
      {
        id: 'insert-above',
        label: 'Insert Paragraph Above',
        icon: getBlockControlIcon('insertAbove', 'Insert Paragraph Above'),
        action: () => this.insertParagraphAbove(),
      },
      {
        id: 'insert-below',
        label: 'Insert Paragraph Below',
        icon: getBlockControlIcon('insertBelow', 'Insert Paragraph Below'),
        action: () => this.insertParagraphBelow(),
      },
      {
        id: 'apply-style',
        label: 'Apply Style',
        icon: getBlockControlIcon('style', 'Apply Style'),
        action: (anchor) => this.openStylePicker(anchor),
        disabled: this.getTablePos() === null,
        hidden: figureType !== 'table',
      },
      {
        id: 'add-notes',
        label: 'Add Notes',
        icon: getBlockControlIcon('addNotes', 'Add Notes'),
        action: () => this.addNotes(),
        hidden: !canAddNotes,
      },
      {
        id: 'crop',
        label: 'Crop',
        icon: getBlockControlIcon('crop', 'Crop'),
        action: () => this.handleCrop(),
        disabled: !hasImage,
        hidden: figureType === 'table',
      },
      {
        id: 'reset-crop',
        label: 'Reset Crop',
        icon: getBlockControlIcon('resetCrop', 'Reset Crop'),
        action: () => this.handleResetCrop(),
        disabled: !hasImage,
        hidden: figureType === 'table',
      },
      {
        id: 'choose-file',
        label: 'Choose File',
        icon: getBlockControlIcon('file', 'Choose File'),
        action: () => this.handleChooseFile(),
        disabled: !hasImage,
        hidden: figureType === 'table',
      },
      {
        id: 'paste-clipboard',
        label: 'Paste from Clipboard',
        icon: getBlockControlIcon('clipboard', 'Paste from Clipboard'),
        action: () => this.handlePasteFromClipboard(),
        disabled: !hasImage || !navigator.clipboard?.read,
        hidden: figureType === 'table',
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: getBlockControlIcon('delete', 'Delete'),
        action: () => this.deleteFigure(),
      },
    ];
  }

  private readonly closeMenu = (): void => {
    const menu = this._menu;
    const stylePicker = this._stylePicker;
    this._menu = undefined;
    this._stylePicker = undefined;
    stylePicker?.close?.(undefined);
    menu?.close?.(undefined);
  };

  private getTablePos(): number | null {
    if (typeof this.node.descendants !== 'function') {
      return null;
    }

    let tableOffset: number | null = null;
    this.node.descendants((node, pos) => {
      if (node.type.spec.tableRole === 'table') {
        tableOffset = pos;
        return false;
      }
      return tableOffset === null;
    });

    return tableOffset === null ? null : this.getPos() + 1 + tableOffset;
  }

  private openStylePicker(anchor?: HTMLElement): boolean {
    if (!anchor) {
      return true;
    }

    this._stylePicker?.close(undefined);
    const picker = openTableStylePicker({
      anchor,
      getTablePos: () => this.getTablePos(),
      onClose: () => {
        this._stylePicker = undefined;
        this.closeMenu();
      },
      view: this.view,
    });

    if (!picker) {
      return true;
    }

    this._stylePicker = picker;
    return false;
  }

  private insertParagraphAbove(): void {
    const { state, dispatch } = this.view;
    const pos = this.getPos();
    const paragraph = state.schema.nodes.paragraph.create();
    let tr = state.tr.insert(pos, paragraph);
    tr = tr.setSelection(TextSelection.create(tr.doc, pos + 1));
    dispatch(tr);
  }

  private insertParagraphBelow(): void {
    const { state, dispatch } = this.view;
    const posAfterNode = this.getPos() + this.node.nodeSize;
    const paragraph = state.schema.nodes.paragraph.create();
    let tr = state.tr.insert(posAfterNode, paragraph);
    tr = tr.setSelection(TextSelection.create(tr.doc, posAfterNode + 1));
    dispatch(tr);
  }

  private addNotes(): void {
    const { state, dispatch } = this.view;
    dispatch(
      addNotesCommand(state.tr, state.schema, this.getPos()) as Transaction
    );
  }

  private deleteFigure(): void {
    const { state, dispatch } = this.view;
    const pos = this.getPos();
    dispatch(state.tr.delete(pos, pos + this.node.nodeSize));
  }

  private handleCrop(): void {
    const imagePath = this.findImagePath(this.getPos());
    if (imagePath === null) {
      return;
    }

    const imageNode = this.view.state.doc.nodeAt(imagePath);
    if (!imageNode?.attrs?.src) {
      return;
    }

    this._cropEditor = createPopUp(
      CropImagePopup,
      {
        src: imageNode.attrs.src,
        onConfirm: (cropData: CropDataPropValue) => {
          this.updateImageAttrs(imagePath, { cropData });
          this._cropEditor?.close(cropData);
        },
        onCancel: () => {
          this._cropEditor?.close(null);
        },
        defaultUnit: 'px',
      },
      {
        anchor: document.body,
        autoDismiss: true,
        position: atAnchorTopCenter,
        onClose: () => {
          this._cropEditor = undefined;
        },
      }
    );
  }

  private handleResetCrop(): void {
    const imagePath = this.findImagePath(this.getPos());
    if (imagePath !== null) {
      this.updateImageAttrs(imagePath, { crop: null, cropData: null });
    }
  }

  private handleChooseFile(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.updateImageSource(reader.result);
        }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  }

  private handlePasteFromClipboard(): void {
    if (!navigator.clipboard?.read) {
      return;
    }

    void navigator.clipboard.read().then((clipboardItems) => {
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) =>
          type.startsWith('image/')
        );
        if (!imageType) {
          continue;
        }
        void clipboardItem.getType(imageType).then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              this.updateImageSource(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        });
        return;
      }
    });
  }

  private updateImageSource(src: string): void {
    const imagePath = this.findImagePath(this.getPos());
    if (imagePath !== null) {
      this.updateImageAttrs(imagePath, { crop: null, cropData: null, src });
    }
  }

  private updateImageAttrs(
    imagePath: number,
    attrs: Record<string, unknown>
  ): void {
    const { state, dispatch } = this.view;
    const imageNode = state.doc.nodeAt(imagePath);
    if (!imageNode) {
      return;
    }
    dispatch(
      state.tr.setNodeMarkup(imagePath, undefined, {
        ...imageNode.attrs,
        ...attrs,
      })
    );
  }

  private findImagePath(figurePos: number): number | null {
    let offset = 0;
    for (let index = 0; index < this.node.childCount; index++) {
      const child = this.node.child(index);
      const imagePath = this.findNestedImageInNode(child, figurePos + 1 + offset);
      if (imagePath !== null) {
        return imagePath;
      }
      offset += child.nodeSize;
    }

    return null;
  }

  private findNestedImageInNode(
    node: ProseMirrorNode,
    nodePos: number
  ): number | null {
    if (node.type.name === 'image') {
      return nodePos;
    }

    let offset = 0;
    for (let index = 0; index < node.childCount; index++) {
      const child = node.child(index);
      const imagePath = this.findNestedImageInNode(child, nodePos + 1 + offset);
      if (imagePath !== null) {
        return imagePath;
      }
      offset += child.nodeSize;
    }
    return null;
  }
}
