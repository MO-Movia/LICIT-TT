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
import { ImageSizeFitEditor } from '../multimedia/ui/ImageSizeFitEditor';
import {
  MAX_SIZE as MAX_IMAGE_SIZE,
  MIN_SIZE as MIN_IMAGE_SIZE,
} from '../multimedia/ui/ImageResizeBox';
import {
  getMaxResizeWidth,
  MAX_IMAGE_LAYOUT_SIZE,
} from '../multimedia/ui/ImageNodeView';
import { openTableStylePicker } from '../../licit/ui/tableStylePicker';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';
const FRAMESET_CLASSNAME = 'czi-editor-frameset';
const IMAGE_MARGIN_PX = 2;

type ImageSize = {
  width: number;
  height: number;
};

type NestedImage = {
  node: ProseMirrorNode;
  path: number;
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function toBoundedImageSize(width: number, height: number): ImageSize | null {
  if (!isPositiveFinite(width) || !isPositiveFinite(height)) {
    return null;
  }
  const scale = Math.min(
    1,
    MAX_IMAGE_SIZE / width,
    MAX_IMAGE_SIZE / height
  );
  return {
    width: Math.round(
      Math.max(MIN_IMAGE_SIZE, Math.min(MAX_IMAGE_SIZE, width * scale))
    ),
    height: Math.round(
      Math.max(MIN_IMAGE_SIZE, Math.min(MAX_IMAGE_SIZE, height * scale))
    ),
  };
}

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
  _sizeEditor?: PopUpHandle;
  _originalImageSize?: ImageSize & { src: string };
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

    return true;
  }

  hasNotes(): boolean {
    return this.findNotes() !== null;
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
    this._sizeEditor?.close?.(undefined);
    this._cropEditor = undefined;
    this._sizeEditor = undefined;
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
    const image = this.getNestedImage();
    const sizingDisabled = image
      ? !!(
        image.node.attrs.crop ||
        image.node.attrs.cropData ||
        image.node.attrs.rotate
      )
      : true;
    const canResetImage = image
      ? this.getOriginalImageSize(image.node) !== null
      : false;
    const hasImage = this.findImagePath(this.getPos()) !== null;
    const hasNotes = this.hasNotes();
    const canAddNotes =
      !hasNotes && (figureType === 'table' || figureType === 'figure');

    return [
      {
        id: 'reset-image',
        label: 'Reset Image',
        hint: 'Original',
        icon: getBlockControlIcon('resetImage', 'Reset image'),
        action: () => this.handleResetImage(),
        disabled: sizingDisabled || !canResetImage,
        hidden: figureType === 'table',
      },
      {
        id: 'fit-to-width',
        label: 'Fit To Width',
        hint: 'Keep ratio',
        icon: getBlockControlIcon('fitWidth', 'Fit to width'),
        action: () => this.handleFitToWidth(),
        disabled: sizingDisabled,
        hidden: figureType === 'table',
      },
      {
        id: 'size-fit',
        label: 'Size & Fit...',
        hint: 'Exact values',
        icon: getBlockControlIcon('sizeFit', 'Size & fit'),
        action: () => this.handleSizeFit(),
        disabled: sizingDisabled,
        dividerBefore: true,
        hidden: figureType === 'table',
      },
      {
        id: 'insert-above',
        label: 'Insert Paragraph Above',
        icon: getBlockControlIcon('insertAbove', 'Insert Paragraph Above'),
        action: () => this.insertParagraphAbove(),
        dividerBefore: figureType !== 'table',
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
        onHover: (anchor) => this.openStylePicker(anchor),
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
        id: 'delete-notes',
        label: 'Delete Notes',
        icon: getBlockControlIcon('deleteNotes', 'Delete Notes'),
        action: () => this.deleteNotes(),
        hidden: !hasNotes,
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

    if (this._stylePicker) {
      return false;
    }

    const picker = openTableStylePicker({
      anchor,
      getTablePos: () => this.getTablePos(),
      onClose: () => {
        this._stylePicker = undefined;
      },
      onSelect: () => this.closeMenu(),
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

  private deleteNotes(): void {
    const notes = this.findNotes();
    if (notes === null) {
      return;
    }

    const { state, dispatch } = this.view;
    dispatch(state.tr.delete(notes.pos, notes.pos + notes.node.nodeSize));
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

  private handleResetImage(): void {
    const image = this.getNestedImage();
    if (!image || this.isImageSizingDisabled(image.node)) {
      return;
    }
    const originalSize = this.getOriginalImageSize(image.node);
    if (originalSize) {
      this.applyImageSize(originalSize.width, originalSize.height);
    }
  }

  private handleFitToWidth(): void {
    const image = this.getNestedImage();
    if (!image || this.isImageSizingDisabled(image.node)) {
      return;
    }
    const currentSize = this.getCurrentImageSize(image.node);
    const ratio = currentSize.width / currentSize.height;
    const width = this.getFitWidth(image.node);
    this.applyImageSize(width, width / ratio);
  }

  private handleSizeFit(): void {
    if (this._sizeEditor) {
      return;
    }
    const image = this.getNestedImage();
    if (!image || this.isImageSizingDisabled(image.node)) {
      return;
    }

    const currentSize = this.getCurrentImageSize(image.node);
    const resolvedOriginalSize = this.getOriginalImageSize(image.node);
    const originalSize = resolvedOriginalSize || currentSize;
    this._sizeEditor = createPopUp(
      ImageSizeFitEditor,
      {
        canReset: resolvedOriginalSize !== null,
        height: currentSize.height,
        maxWidth: this.getFitWidth(image.node),
        onApply: (width: number, height: number) => {
          this.applyImageSize(width, height);
          this.closeSizeEditor();
        },
        onCancel: this.closeSizeEditor,
        originalHeight: originalSize.height,
        originalWidth: originalSize.width,
        width: currentSize.width,
      },
      {
        autoDismiss: false,
        container:
          this.dom.closest(`.${FRAMESET_CLASSNAME}`) || undefined,
        modal: true,
        onClose: () => {
          this._sizeEditor = undefined;
        },
      }
    );
  }

  private readonly closeSizeEditor = (): void => {
    const editor = this._sizeEditor;
    this._sizeEditor = undefined;
    editor?.close?.(undefined);
    this.view.focus();
  };

  private applyImageSize(width: number, height: number): void {
    const size = toBoundedImageSize(width, height);
    const image = this.getNestedImage();
    if (!size || !image || this.isImageSizingDisabled(image.node)) {
      return;
    }
    this.view.focus();
    this.updateImageAttrs(image.path, {
      fitToParent: 0,
      height: size.height,
      width: size.width,
    });
  }

  private getCurrentImageSize(imageNode: ProseMirrorNode): ImageSize {
    const attrs = imageNode.attrs;
    const originalSize = this.getOriginalImageSize(imageNode);
    const renderedImage = this.getRenderedImageElement(imageNode);
    const renderedWidth = renderedImage?.clientWidth || 0;
    const renderedHeight = renderedImage?.clientHeight || 0;
    let width = Number(attrs.width);
    let height = Number(attrs.height);

    if (!isPositiveFinite(width)) {
      width = 0;
    }
    if (!isPositiveFinite(height)) {
      height = 0;
    }

    let ratio = 1;
    if (width > 0 && height > 0) {
      ratio = width / height;
    } else if (originalSize) {
      ratio = originalSize.width / originalSize.height;
    } else if (renderedWidth > 0 && renderedHeight > 0) {
      ratio = renderedWidth / renderedHeight;
    }

    if (width > 0 && height === 0) {
      height = width / ratio;
    } else if (height > 0 && width === 0) {
      width = height * ratio;
    } else if (width === 0 && height === 0) {
      width = originalSize?.width || renderedWidth || MIN_IMAGE_SIZE;
      height = originalSize?.height || renderedHeight || MIN_IMAGE_SIZE;
    }

    if (attrs.fitToParent) {
      width = this.getFitWidth(imageNode);
      height = width / ratio;
    }

    return {
      width: Math.round(Math.max(MIN_IMAGE_SIZE, width)),
      height: Math.round(Math.max(MIN_IMAGE_SIZE, height)),
    };
  }

  private getFitWidth(imageNode: ProseMirrorNode): number {
    const imageBody = this.getRenderedImageBody(imageNode);
    let width = imageBody
      ? getMaxResizeWidth(imageBody, !!imageNode.attrs.fitToParent)
      : 0;
    if (
      !isPositiveFinite(width) ||
      width >= MAX_IMAGE_LAYOUT_SIZE
    ) {
      width = Math.max(
        MIN_IMAGE_SIZE,
        this.contentDOM.clientWidth - IMAGE_MARGIN_PX * 2
      );
    }
    return Math.floor(
      Math.max(MIN_IMAGE_SIZE, Math.min(width, MAX_IMAGE_SIZE))
    );
  }

  private getOriginalImageSize(imageNode: ProseMirrorNode): ImageSize | null {
    const src = String(imageNode.attrs.src || '');
    if (this._originalImageSize?.src === src) {
      return {
        width: this._originalImageSize.width,
        height: this._originalImageSize.height,
      };
    }

    this._originalImageSize = undefined;
    const renderedImage = this.getRenderedImageElement(imageNode);
    const width = renderedImage?.naturalWidth || 0;
    const height = renderedImage?.naturalHeight || 0;
    if (!isPositiveFinite(width) || !isPositiveFinite(height)) {
      return null;
    }

    this._originalImageSize = { height, src, width };
    return { height, width };
  }

  private getRenderedImageBody(
    imageNode: ProseMirrorNode
  ): HTMLElement | null {
    const src = String(imageNode.attrs.src || '');
    const bodies = this.contentDOM.querySelectorAll<HTMLElement>(
      '.molm-czi-image-view-body'
    );
    for (const body of bodies) {
      if (body.dataset.originalSrc === src) {
        return body;
      }
    }
    return null;
  }

  private getRenderedImageElement(
    imageNode: ProseMirrorNode
  ): HTMLImageElement | null {
    return this.getRenderedImageBody(imageNode)?.querySelector(
      'img.molm-czi-image-view-body-img'
    ) || null;
  }

  private getNestedImage(): NestedImage | null {
    const path = this.findImagePath(this.getPos());
    if (path === null) {
      return null;
    }
    const node = this.view.state.doc.nodeAt(path);
    return node?.type.name === 'image' ? { node, path } : null;
  }

  private isImageSizingDisabled(imageNode: ProseMirrorNode): boolean {
    const { crop, cropData, rotate } = imageNode.attrs;
    return !!(crop || cropData || rotate);
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
      this._originalImageSize = undefined;
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

  private findNotes(): { node: ProseMirrorNode; pos: number } | null {
    let offset = 0;
    for (let index = 0; index < this.node.childCount; index++) {
      const child = this.node.child(index);
      if (child.type.name === 'enhanced_table_figure_notes') {
        return {
          node: child,
          pos: this.getPos() + 1 + offset,
        };
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
