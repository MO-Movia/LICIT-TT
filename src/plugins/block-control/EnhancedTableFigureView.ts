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
  atViewportCenter,
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
import { ImageViewer } from './ui/ImageViewer';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';
const EIC_FIT_WIDTH = 624;

type ViewerDimensions = {
  height?: number;
  width?: number;
};

function toPositiveNumber(value: unknown): number | undefined {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

export class EnhancedTableFigureView implements NodeView {
  node: ProseMirrorNode;
  view: EditorView;
  getPos: () => number;
  dom: HTMLElement;
  contentDOM: HTMLElement;
  contentScrollDOM: HTMLElement;
  selectHandle: HTMLElement;
  maximizeButton: HTMLElement;
  _menu?: PopUpHandle;
  _cropEditor?: PopUpHandle;
  _viewer?: PopUpHandle;
  _id = uuid();
  _fitScheduled = false;
  _destroyed = false;

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

    this.contentScrollDOM = document.createElement('div');
    this.contentScrollDOM.className = 'enhanced-table-figure-scroll';

    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'enhanced-table-figure-content';
    this.contentScrollDOM.appendChild(this.contentDOM);
    this.dom.appendChild(this.contentScrollDOM);

    this.selectHandle = createBlockControlHandle({
      label: 'Enhanced content options',
      onClick: this.handleMenuClick,
    });
    this.dom.appendChild(this.selectHandle);

    this.maximizeButton = createBlockControlHandle({
      label: 'View full-size EIC content',
      onClick: this.handleMaximizeClick,
    });
    this.maximizeButton.classList.add(
      'enhanced-table-figure-maximize-button'
    );
    this.maximizeButton.textContent = '\u26F6';
    this.dom.appendChild(this.maximizeButton);
    this.scheduleFitToWidth();
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
    this.scheduleFitToWidth();

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
    this._destroyed = true;
    this.closeMenu();
    this._cropEditor?.close?.(undefined);
    this._viewer?.close?.(undefined);
    this.selectHandle.remove();
    this.maximizeButton.remove();
  }

  stopEvent(event: Event): boolean {
    const target = event.target;
    return (
      target instanceof globalThis.Node &&
      (this.selectHandle.contains(target) ||
        this.maximizeButton.contains(target))
    );
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

  private readonly handleMaximizeClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    this.closeMenu();

    if (this._viewer) {
      this._viewer.close(undefined);
      return;
    }

    const figureType = String(this.node.attrs.figureType || 'figure');
    const nodeViewDom = this.createViewerDom(figureType);
    const dimensions = this.getViewerDimensions(figureType);

    this._viewer = createPopUp(
      ImageViewer,
      {
        figureType,
        nodeViewDom,
        onClose: () => this._viewer?.close?.(undefined),
        originalHeight: dimensions.height,
        originalWidth: dimensions.width,
      },
      {
        autoDismiss: false,
        modal: true,
        position: atViewportCenter,
        onClose: () => {
          this._viewer = undefined;
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
    this._menu = undefined;
    menu?.close?.(undefined);
  };

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

  private createViewerDom(figureType: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className =
      'enhanced-table-figure enhanced-table-figure-viewer-source';
    wrapper.dataset.figureType = figureType;

    const figureBody = this.contentDOM.querySelector<HTMLElement>(
      '.enhanced-table-figure-body'
    );
    const primaryContent =
      figureType === 'table'
        ? this.contentDOM
            .querySelector('table')
            ?.closest<HTMLElement>('.tableWrapper') ||
          this.contentDOM.querySelector<HTMLElement>('table')
        : this.contentDOM
            .querySelector('.molm-czi-image-view')
            ?.closest<HTMLElement>('p') ||
          this.contentDOM.querySelector<HTMLElement>('.molm-czi-image-view');
    const contentClone = (
      figureBody ||
      primaryContent ||
      document.createElement('div')
    ).cloneNode(true) as HTMLElement;
    contentClone.removeAttribute('contenteditable');
    wrapper.appendChild(contentClone);

    const transientSelectors = [
      '.enhanced-table-figure-capco',
      '.enhanced-table-figure-notes',
      '.licit-block-control-handle',
      '.molm-czi-image-resize-box',
      '.ProseMirror-separator',
      '.ProseMirror-trailingBreak',
      '.column-resize-handle',
      '.czi-table-row-resize-handle',
    ];
    for (const element of wrapper.querySelectorAll(
      transientSelectors.join(',')
    )) {
      element.remove();
    }

    for (const element of wrapper.querySelectorAll(
      '.ProseMirror-selectednode, .selectedCell'
    )) {
      element.classList.remove('ProseMirror-selectednode', 'selectedCell');
    }
    for (const element of wrapper.querySelectorAll(
      '.molm-czi-image-view-body.active, .molm-czi-image-view-body.selected'
    )) {
      element.classList.remove('active', 'focused', 'selected');
      element.removeAttribute('data-active');
    }

    return wrapper;
  }

  private getViewerDimensions(figureType: string): ViewerDimensions {
    if (figureType === 'table') {
      return {width: this.getOriginalTableWidth()};
    }

    const imageElement = this.contentDOM.querySelector<HTMLImageElement>(
      '.molm-czi-image-view-body-img'
    );
    const imagePath = this.findImagePath(this.getPos());
    const imageNode =
      imagePath === null ? null : this.view.state.doc.nodeAt(imagePath);
    return {
      height:
        toPositiveNumber(imageNode?.attrs?.height) ||
        toPositiveNumber(imageElement?.naturalHeight) ||
        toPositiveNumber(imageElement?.height),
      width:
        toPositiveNumber(imageNode?.attrs?.width) ||
        toPositiveNumber(imageElement?.naturalWidth) ||
        toPositiveNumber(imageElement?.width),
    };
  }

  private getOriginalTableWidth(): number {
    const table = this.contentDOM.querySelector<HTMLTableElement>('table');
    if (!table) {
      return EIC_FIT_WIDTH;
    }

    const savedWidth = toPositiveNumber(table.dataset.eicOriginalWidth);
    const columnWidth = Array.from(table.querySelectorAll('col')).reduce(
      (total, column) => {
        const savedColumnWidth = toPositiveNumber(
          column.dataset.eicOriginalWidth
        );
        const styleWidth = column.style.width;
        const width =
          savedColumnWidth ||
          (styleWidth && !styleWidth.includes('%')
            ? toPositiveNumber(styleWidth)
            : toPositiveNumber(column.getAttribute('width')));
        return total + (width || 0);
      },
      0
    );
    const styleWidth =
      table.style.width && !table.style.width.includes('%')
        ? toPositiveNumber(table.style.width)
        : undefined;

    return Math.max(
      EIC_FIT_WIDTH,
      savedWidth || 0,
      columnWidth,
      styleWidth || 0,
      toPositiveNumber(table.getAttribute('width')) || 0,
      table.scrollWidth,
      table.getBoundingClientRect().width
    );
  }

  private scheduleFitToWidth(): void {
    if (this._fitScheduled) {
      return;
    }
    this._fitScheduled = true;
    queueMicrotask(() => {
      this._fitScheduled = false;
      if (!this._destroyed) {
        this.fitTableToWidth();
      }
    });
  }

  private fitTableToWidth(): void {
    if (this.node.attrs.figureType !== 'table') {
      return;
    }

    const table = this.contentDOM.querySelector<HTMLTableElement>('table');
    if (!table) {
      return;
    }

    const columns = Array.from(table.querySelectorAll('col'));
    if (!columns.length) {
      table.style.width = `${EIC_FIT_WIDTH}px`;
      table.style.maxWidth = `${EIC_FIT_WIDTH}px`;
      return;
    }

    const nodeWidths = this.getTableNodeColumnWidths();
    const originalWidths = columns.map((column, index) => {
      return (
        nodeWidths[index] ||
        toPositiveNumber(column.dataset.eicOriginalWidth) ||
        toPositiveNumber(column.style.width) ||
        toPositiveNumber(column.getAttribute('width')) ||
        0
      );
    });
    const originalWidth = originalWidths.reduce(
      (total, width) => total + width,
      0
    );
    if (!originalWidth || originalWidths.some((width) => !width)) {
      return;
    }

    table.dataset.eicOriginalWidth = String(originalWidth);
    const availableWidth =
      this.contentScrollDOM.clientWidth > 0
        ? Math.min(EIC_FIT_WIDTH, this.contentScrollDOM.clientWidth)
        : EIC_FIT_WIDTH;
    const scale = Math.min(1, availableWidth / originalWidth);

    columns.forEach((column, index) => {
      const originalColumnWidth = originalWidths[index];
      column.dataset.eicOriginalWidth = String(originalColumnWidth);
      column.style.width = `${originalColumnWidth * scale}px`;
    });

    const fittedWidth = originalWidth * scale;
    table.style.width = `${fittedWidth}px`;
    table.style.minWidth = `${fittedWidth}px`;
    table.style.maxWidth = `${availableWidth}px`;
  }

  private getTableNodeColumnWidths(): number[] {
    const tableNode = this.findDescendantNode(this.node, 'table');
    if (!tableNode?.childCount) {
      return [];
    }

    const firstRow = tableNode.child(0);
    const widths: number[] = [];
    for (let index = 0; index < firstRow.childCount; index++) {
      const cell = firstRow.child(index);
      const colspan = toPositiveNumber(cell.attrs?.colspan) || 1;
      const colwidth = Array.isArray(cell.attrs?.colwidth)
        ? cell.attrs.colwidth
        : [];
      for (let columnIndex = 0; columnIndex < colspan; columnIndex++) {
        widths.push(toPositiveNumber(colwidth[columnIndex]) || 0);
      }
    }
    return widths;
  }

  private findDescendantNode(
    node: ProseMirrorNode,
    typeName: string
  ): ProseMirrorNode | null {
    if (node.type.name === typeName) {
      return node;
    }
    for (let index = 0; index < node.childCount; index++) {
      const found = this.findDescendantNode(node.child(index), typeName);
      if (found) {
        return found;
      }
    }
    return null;
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
