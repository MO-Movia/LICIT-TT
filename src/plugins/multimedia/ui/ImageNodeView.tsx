/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import {Node} from 'prosemirror-model';
import {Decoration} from 'prosemirror-view';
import {NodeSelection, TextSelection} from 'prosemirror-state';
import React from 'react';
import {CustomNodeView} from './CustomNodeView';
import {Icon} from './Icon';
import {
  ImageResizeBox,
  MAX_SIZE as MAX_RESIZE_SIZE,
  MIN_SIZE,
} from './ImageResizeBox';
import {
  atAnchorBottomLeft,
  createPopUp,
  atAnchorTopCenter,
  PopUpHandle,
} from '../../../commands';
import {resolveImage} from './resolveImage';
import {uuid} from './uuid';

import type {EditorRuntime} from '../Types';
import type {NodeViewProps} from './CustomNodeView';

import type {ResizeObserverEntry} from './ResizeObserver';
import {observe, unobserve} from './ResizeObserver';
import {FP_WIDTH} from '../Constants';
import {
  BlockControlHandleButton,
  BlockControlMenu,
  BlockControlMenuItem,
  getBlockControlIcon,
} from '../../../licit/ui/blockControls';
import {CropDataPropValue, CropImagePopup} from './CropImagePopup';
import {ImageSizeFitEditor} from './ImageSizeFitEditor';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';
const FRAMESET_CLASSNAME = 'czi-editor-frameset';
const EMPTY_SRC =
  'data:image/gif;base64,' +
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* This value must be synced with the margin defined at .czi-image-view */
const IMAGE_MARGIN = 2;

export const MAX_IMAGE_LAYOUT_SIZE = 100000;
const MAX_SIZE = MAX_IMAGE_LAYOUT_SIZE;
const IMAGE_PLACEHOLDER_SIZE = 24;
const ENHANCED_TABLE_FIGURE = 'enhanced_table_figure';
const ENHANCED_TABLE_FIGURE_BODY = 'enhanced_table_figure_body';

const DEFAULT_ORIGINAL_SIZE = {
  src: '',
  complete: false,
  height: 0,
  width: 0,
};

type MaxSize = {
  width: number;
  height: number;
  complete?: boolean;
};

type OriginalSize = MaxSize & {
  src: string;
};

type ImageState = {
  maxSize: MaxSize;
  originalSize: OriginalSize;
  originalSizeSource: string;
};

type ImageRenderStyles = {
  clipStyle: React.CSSProperties;
  imageStyle: React.CSSProperties;
  pStyle: React.CSSProperties;
  renderWidth: number | string;
};

// Get the maxWidth that the image could be resized to.
export function getMaxResizeWidth(
  el: HTMLElement,
  useNaturalWrapperMargins = false
): number {
  const wrapper = el.parentElement;
  const inlineMargin = wrapper?.style.getPropertyValue('margin') || '';
  const inlineMarginPriority =
    wrapper?.style.getPropertyPriority('margin') || '';

  // fitToParent temporarily removes the wrapper margin. A numeric Fit to
  // width clears fitToParent, so measure the natural margins that will return.
  if (useNaturalWrapperMargins) {
    wrapper?.style.removeProperty('margin');
  }

  try {
    // Ideally, the image should not be wider than its containing element.
    let node = wrapper;
    while (node && !node.offsetParent) {
      node = node.parentElement;
    }
    const offsetParent = node?.offsetParent as HTMLElement | null;
    if ((offsetParent?.offsetWidth || 0) > 0) {
      const style = el.ownerDocument.defaultView.getComputedStyle(offsetParent);
      const wrapperStyle = wrapper
        ? el.ownerDocument.defaultView.getComputedStyle(wrapper)
        : null;
      const ml = wrapperStyle
        ? Number.parseFloat(wrapperStyle.marginLeft) || 0
        : IMAGE_MARGIN;
      const mr = wrapperStyle
        ? Number.parseFloat(wrapperStyle.marginRight) || 0
        : IMAGE_MARGIN;
      let width = offsetParent.clientWidth - ml - mr;
      const pl = Number.parseFloat(style.paddingLeft) || 0;
      const pr = Number.parseFloat(style.paddingRight) || 0;
      width -= pl + pr;
      return Math.max(width, MIN_SIZE);
    }
    // Let the image resize freely.
    return MAX_SIZE;
  } finally {
    if (useNaturalWrapperMargins && wrapper) {
      if (inlineMargin) {
        wrapper.style.setProperty(
          'margin',
          inlineMargin,
          inlineMarginPriority
        );
      } else {
        wrapper.style.removeProperty('margin');
      }
    }
  }
}

function resolveURL(
  runtime: EditorRuntime,
  src: string,
  dom: Element
): Promise<string> {
  if (!runtime) {
    return Promise.resolve(src);
  }
  const {canProxyImageSrc, getProxyImageSrc} = runtime;
  if (src && getProxyImageSrc && canProxyImageSrc?.(src)) {
    const wait =
      !document.body.classList.contains('export-pdf-mode') &&
      globalThis.IntersectionObserver;
    return wait
      ? lazyResolved(src, getProxyImageSrc, dom)
      : getProxyImageSrc(src).catch(() => src);
  }
  return Promise.resolve(src);
}

async function lazyResolved(
  src: string,
  getData: (src: string) => Promise<string>,
  dom: Element
): Promise<string> {
  return new Promise((resolve) => {
    let loading = false;
    const obs = new IntersectionObserver(
      (entities) => {
        if (loading || !entities?.some?.((e) => e?.isIntersecting)) {
          return;
        }
        loading = true;
        getData?.(src)
          ?.then(resolve)
          // retry on next trigger if failed
          ?.catch(() => (loading = false));
      },
      {
        threshold: 0.1,
      }
    );
    obs.observe(dom);
  });
}

export class ImageViewBody extends React.PureComponent<
  NodeViewProps,
  ImageState
> {
  declare props: NodeViewProps;

  _body?: HTMLElement | React.ReactInstance;
  _id = uuid();
  _cropEditor?: PopUpHandle;
  _sizeEditor?: PopUpHandle;
  _menu?: PopUpHandle;
  _menuButton?: HTMLButtonElement;
  _mounted = false;
  _resizeLoopCount = 0;
  _lastResizeTime = 0;
  state: ImageState = {
    maxSize: {
      width: MAX_SIZE,
      height: MAX_SIZE,
      complete: false,
    },
    originalSize: DEFAULT_ORIGINAL_SIZE,
    originalSizeSource: '',
  };

  componentDidMount(): void {
    this._mounted = true;
    void this._resolveOriginalSize().catch(console.warn);
  }

  componentWillUnmount(): void {
    this._mounted = false;
    this._cropEditor?.close(undefined);
    this._sizeEditor?.close(undefined);
    this._menu?.close(undefined);
    this._cropEditor = undefined;
    this._sizeEditor = undefined;
    this._menu = undefined;
  }

  componentDidUpdate(prevProps: NodeViewProps, prevState?: ImageState): void {
    const prevSrc = prevProps.node.attrs.src;
    const {node} = this.props;
    const {src} = node.attrs;
    if (prevSrc !== src) {
      // A new image is provided, resolve it.
      void this._resolveOriginalSize().catch(console.warn);
    }

    const prevActive =
      prevProps.selected && prevProps.focused && !prevProps.editorView.readOnly;
    const currentActive =
      this.props.selected &&
      this.props.focused &&
      !this.props.editorView.readOnly;
    const completionChanged =
      prevState?.originalSize?.complete !==
      this.state.originalSize?.complete;
    const resolvedSourceChanged =
      prevState?.originalSizeSource !== this.state.originalSizeSource;

    if (
      prevActive !== currentActive ||
      ((completionChanged || resolvedSourceChanged) && currentActive)
    ) {
      this._renderInlineEditor();
    }
  }

  render(): React.ReactElement {
    const {originalSize, maxSize} = this.state;
    const {editorView, node, selected, focused} = this.props;
    const {readOnly} = editorView;
    const shouldShowMenuButton =
      !readOnly && !this.isInsideEnhancedTableFigureBody();
    const {attrs} = node;
    const {align, crop, rotate} = attrs;

    const retVal = this.assignVal(
      originalSize,
      focused,
      readOnly,
      attrs.src
    );
    const loading = retVal.loading;
    const active = retVal.active;
    const src = retVal.src;
    const aspectRatio = retVal.aspectRatio;
    const error = retVal.error;

    // maxSize is populated by observing the image itself, so it can lag behind
    // when the editor's available width changes. Read the current containing
    // width for this render so actions such as Fit to width are not immediately
    // clamped back to the previous image width.
    const measuredMaxWidth = this._bodyEl
      ? getMaxResizeWidth(this._bodyEl)
      : 0;
    const renderMaxSize =
      Number.isFinite(measuredMaxWidth) &&
      measuredMaxWidth > 0 &&
      measuredMaxWidth < MAX_SIZE
        ? {
            ...maxSize,
            width: Math.floor(
              Math.max(
                MIN_SIZE,
                Math.min(measuredMaxWidth, MAX_RESIZE_SIZE)
              )
            ),
          }
        : maxSize;

    let {width, height} = attrs;
    const dimensions = this.calcWidthAndHeight(
      width,
      height,
      aspectRatio,
      originalSize
    );
    width = dimensions.width;
    height = dimensions.height;
    let scale = 1;
    if (
      width > renderMaxSize.width &&
      (!crop || crop.width > renderMaxSize.width)
    ) {
      // Scale image to fit its containing space.
      // If the image is not cropped.
      scale = renderMaxSize.width / width;
      width = renderMaxSize.width;
      height *= scale;
    }

    const className = cx('molm-czi-image-view-body', {
      active,
      error,
      focused,
      'has-hover-handle': shouldShowMenuButton,
      loading,
      selected,
    });

    const fitToParent = this.props.node.attrs['fitToParent'];
    const resizeBox = this.isUnaltered(active, attrs.cropData, rotate) ? (
      <ImageResizeBox
        fitToParent={fitToParent}
        height={height}
        onResizeEnd={this._onResizeEnd}
        src={src}
        width={width}
      />
    ) : null;

    const {clipStyle, imageStyle, pStyle, renderWidth} =
      this.getImageRenderStyles({
        crop,
        cropData: attrs.cropData,
        fitToParent,
        height,
        loading,
        maxSize: renderMaxSize,
        rotate,
        scale,
        width,
      });

    const errorView = error ? Icon.get('error') : null;
    const errorTitle = error
      ? `Unable to load image from ${attrs.src || ''}`
      : undefined;

    return (
      <span
        className={className}
        data-active={active ? 'true' : undefined}
        data-original-src={String(attrs.src)}
        id={this._id}
        ref={this._onBodyRef}
        style={pStyle}
        title={errorTitle}
      >
        <span className="molm-czi-image-view-body-img-clip" style={clipStyle}>
          <span id={this._id} style={imageStyle}>
            <img
              alt=""
              className="molm-czi-image-view-body-img"
              data-align={align}
              height={height}
              src={src}
              style={
                attrs.cropData
                  ? {
                      position: 'absolute',
                      top: `-${attrs.cropData.top}px`,
                      left: `-${attrs.cropData.left}px`,
                    }
                  : undefined
              }
              width={renderWidth}
            />
            {errorView}
          </span>
        </span>
        {shouldShowMenuButton ? (
          <BlockControlHandleButton
            label="Image options"
            onClick={this._onMenuClick}
            ref={this._onMenuButtonRef}
          />
        ) : null}
        {resizeBox}
      </span>
    );
  }

  isInsideEnhancedTableFigureBody(): boolean {
    const {dom, editorView, getPos} = this.props;

    try {
      const pos = getPos?.();
      if (Number.isFinite(pos)) {
        const resolvedPos = editorView.state.doc.resolve(pos);
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
      dom instanceof Element &&
      !!dom.closest(
        "[data-type='enhanced-table-figure'], [data-type='enhanced-table-figure-body'], .enhanced-table-figure, .enhanced-table-figure-body"
      )
    );
  }

  assignVal(
    originalSize: OriginalSize,
    focused: boolean,
    readOnly: boolean,
    currentSrc = ''
  ) {
    // Keep the image and its controls available while dimensions resolve.
    const loading = false;
    const active = focused && !readOnly;
    const src = currentSrc || '';
    const aspectRatio = originalSize.height
      ? originalSize.width / originalSize.height
      : 1;
    const error = false;
    return { loading, active, src, aspectRatio, error };
  }
  isUnaltered(active: boolean, crop: null, rotate: null) {
    return active && !crop && !rotate;
  }

  calcWidthAndHeight(
    width: number,
    height: number,
    aspectRatio: number,
    originalSize: OriginalSize
  ) {
    if (width && !height) {
      height = width / aspectRatio;
    } else if (height && !width) {
      width = height * aspectRatio;
    } else if (!width && !height) {
      width = originalSize.width || IMAGE_PLACEHOLDER_SIZE;
      height = originalSize.height || IMAGE_PLACEHOLDER_SIZE;
    }
    return {width, height};
  }

  getImageRenderStyles({
    crop,
    cropData,
    fitToParent,
    height,
    loading,
    maxSize,
    rotate,
    scale,
    width,
  }: {
    crop: CropDataPropValue | null | undefined;
    cropData: CropDataPropValue | null | undefined;
    fitToParent: boolean;
    height: number;
    loading: boolean;
    maxSize: MaxSize;
    rotate: number | null | undefined;
    scale: number;
    width: number;
  }): ImageRenderStyles {
    const imageStyle: React.CSSProperties = {
      backgroundImage: loading ? EMPTY_SRC : undefined,
      backgroundSize: 'cover',
      display: 'inline-block',
      height: height + 'px',
      left: '0',
      top: '0',
      width: width + 'px',
      position: 'relative',
    };
    const clipStyle: React.CSSProperties = {};
    const pStyle: React.CSSProperties = {};
    let renderWidth: number | string = width;

    if (cropData) {
      clipStyle.width = `${cropData.width}px`;
      clipStyle.height = `${cropData.height}px`;
      clipStyle.overflow = 'hidden';
      clipStyle.position = 'relative';
      clipStyle.display = 'inline-block';
    } else if (crop) {
      const cropped = {...crop};
      if (scale !== 1) {
        scale = maxSize.width / cropped.width;
        cropped.width *= scale;
        cropped.height *= scale;
        cropped.left *= scale;
        cropped.top *= scale;
      }
      clipStyle.width = cropped.width + 'px';
      clipStyle.height = cropped.height + 'px';
      imageStyle.left = cropped.left + 'px';
      imageStyle.top = cropped.top + 'px';
    }

    if (rotate) {
      clipStyle.transform = `rotate(${rotate}rad)`;
    }

    if (fitToParent) {
      renderWidth = FP_WIDTH;
      clipStyle.width = FP_WIDTH;
      imageStyle.width = FP_WIDTH;
      pStyle.width = FP_WIDTH;
      pStyle.height = height;
      clipStyle.padding = '0';
      clipStyle.margin = '0';
      imageStyle.padding = '0';
      imageStyle.margin = '0';
      pStyle.padding = '0';
      pStyle.margin = '0';
    }

    return {clipStyle, imageStyle, pStyle, renderWidth};
  }

  _renderInlineEditor(): void {
    const el = document.getElementById(this._id);
    if (el?.dataset.active !== 'true') {
      this._closeMenu();
      return;
    }

    this._menu?.update({
      close: this._closeMenu,
      items: this._getMenuItems(),
    });
  }

  _resolveOriginalSize = async (): Promise<void> => {
    if (!this._mounted) {
      // unmounted;
      return;
    }

    const src = this.props.node.attrs.src;
    if (src === this.state.originalSizeSource) {
      return; // already resolved
    }
    if (this.state.originalSizeSource) {
      // Keep the last dimensions for rendering while preventing Reset from
      // applying dimensions that belong to the previous image source.
      this.setState({originalSizeSource: ''});
    }
    const url = await resolveURL(
      this.props.editorView.runtime,
      src,
      this.props.dom
    );
    const originalSize = await resolveImage(url);
    if (
      // unmounted;
      !this._mounted ||
      // src had changed.
      this.props.node.attrs.src !== src
    ) {
      return;
    }
    if (!originalSize.complete) {
      originalSize.width = MIN_SIZE;
      originalSize.height = MIN_SIZE;
    }
    this.setState({originalSize, originalSizeSource: src});
  };

  _onResizeEnd = (width: number, height: number): void => {
    const {getPos, node, editorView} = this.props;
    const pos = getPos();
    if (pos === undefined || pos === null) {
      return;
    }
    const attrs = {
      ...node.attrs,
      crop: null,
      fitToParent: 0,
      width,
      height,
    };
    let tr = editorView.state.tr;
    const {selection} = editorView.state;
    tr = tr.setNodeMarkup(pos, null, attrs);
    // Upgrade outdated packages.
    // reset selection to original using the latest doc.
    try {
      const origSelection = NodeSelection.create(tr.doc, selection.from);
      tr = tr.setSelection(origSelection);
    } catch {
      // Ignore if can't select
    }
    editorView.dispatch(tr);
  };

  _getCurrentAspectRatio(): number {
    const {width, height} = this.props.node.attrs;
    const numericWidth = Number(width);
    const numericHeight = Number(height);
    if (
      Number.isFinite(numericWidth) &&
      numericWidth > 0 &&
      Number.isFinite(numericHeight) &&
      numericHeight > 0
    ) {
      return numericWidth / numericHeight;
    }

    const {originalSize} = this.state;
    if (originalSize.width > 0 && originalSize.height > 0) {
      return originalSize.width / originalSize.height;
    }
    return 1;
  }

  _getFitWidth(): number {
    let measuredWidth = this._bodyEl
      ? getMaxResizeWidth(
          this._bodyEl,
          !!this.props.node.attrs.fitToParent
        )
      : 0;
    if (
      !Number.isFinite(measuredWidth) ||
      measuredWidth <= 0 ||
      measuredWidth >= MAX_SIZE
    ) {
      const currentWidth = Number(this.props.node.attrs.width);
      measuredWidth =
        Number.isFinite(currentWidth) && currentWidth > 0
          ? currentWidth
          : this.state.originalSize.width || MIN_SIZE;
    }
    return Math.floor(
      Math.max(MIN_SIZE, Math.min(measuredWidth, MAX_RESIZE_SIZE))
    );
  }

  _getCurrentImageSize(): {width: number; height: number} {
    const attrs = this.props.node.attrs;
    const ratio = this._getCurrentAspectRatio();
    let width = Number(attrs.width);
    let height = Number(attrs.height);

    if (!Number.isFinite(width) || width <= 0) {
      width = 0;
    }
    if (!Number.isFinite(height) || height <= 0) {
      height = 0;
    }
    if (width > 0 && height === 0) {
      height = width / ratio;
    } else if (height > 0 && width === 0) {
      width = height * ratio;
    } else if (width === 0 && height === 0) {
      width = this.state.originalSize.width || IMAGE_PLACEHOLDER_SIZE;
      height = this.state.originalSize.height || IMAGE_PLACEHOLDER_SIZE;
    }

    if (attrs.fitToParent) {
      const renderedWidth = this._bodyEl?.getBoundingClientRect().width || 0;
      width = renderedWidth > 0 ? renderedWidth : this._getFitWidth();
    }

    return {
      width: Math.round(Math.max(MIN_SIZE, width)),
      height: Math.round(Math.max(MIN_SIZE, height)),
    };
  }

  _getOriginalImageSize(): {width: number; height: number} {
    const {originalSize} = this.state;
    if (
      this._hasResolvedOriginalSize() &&
      originalSize.width > 0 &&
      originalSize.height > 0
    ) {
      return {
        width: Math.round(originalSize.width),
        height: Math.round(originalSize.height),
      };
    }
    return this._getCurrentImageSize();
  }

  _hasResolvedOriginalSize(): boolean {
    return (
      this.state.originalSize.complete &&
      this.state.originalSizeSource === this.props.node.attrs.src
    );
  }

  _applyImageSize(width: number, height: number): void {
    if (
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      return;
    }
    const scale = Math.min(
      1,
      MAX_RESIZE_SIZE / width,
      MAX_RESIZE_SIZE / height
    );
    const nextWidth = Math.round(
      Math.max(MIN_SIZE, Math.min(MAX_RESIZE_SIZE, width * scale))
    );
    const nextHeight = Math.round(
      Math.max(MIN_SIZE, Math.min(MAX_RESIZE_SIZE, height * scale))
    );
    this.props.editorView.focus();
    this._updateImageAttrs({
      fitToParent: 0,
      height: nextHeight,
      width: nextWidth,
    });
  }

  _onResetImage = (): void => {
    if (!this._hasResolvedOriginalSize()) {
      return;
    }
    const {width, height} = this._getOriginalImageSize();
    this._applyImageSize(width, height);
  };

  _onFitToWidth = (): void => {
    const current = this._getCurrentImageSize();
    const ratio = current.width / current.height;
    const width = this._getFitWidth();
    const height = width / ratio;
    this._applyImageSize(width, height);
  };

  _onSizeFit = (): void => {
    if (this._sizeEditor) {
      return;
    }

    const current = this._getCurrentImageSize();
    const original = this._getOriginalImageSize();
    this._sizeEditor = createPopUp(
      ImageSizeFitEditor,
      {
        canReset: this._hasResolvedOriginalSize(),
        height: current.height,
        maxWidth: this._getFitWidth(),
        onApply: (width: number, height: number) => {
          this._applyImageSize(width, height);
          this._closeSizeEditor();
        },
        onCancel: this._closeSizeEditor,
        originalHeight: original.height,
        originalWidth: original.width,
        width: current.width,
      },
      {
        autoDismiss: false,
        container:
          this._bodyEl?.closest(`.${FRAMESET_CLASSNAME}`) || undefined,
        modal: true,
        onClose: () => {
          this._sizeEditor = undefined;
        },
      }
    );
  };

  _closeSizeEditor = (): void => {
    const editor = this._sizeEditor;
    this._sizeEditor = undefined;
    editor?.close(undefined);
    this.props.editorView.focus();
  };

  _onChange = (value?: {align: string}): void => {
    const align = value ? value.align : null;
    this._updateImageAttrs({align});
  };

  _onMenuButtonRef = (ref: HTMLButtonElement): void => {
    this._menuButton = ref;
  };

  _onMenuClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();

    if (this._menu) {
      this._closeMenu();
      return;
    }

    const anchor = this._menuButton;
    if (!anchor) {
      return;
    }

    const items = this._getMenuItems();
    this._menu = createPopUp(
      BlockControlMenu,
      {
        close: this._closeMenu,
        items,
      },
      {
        anchor,
        autoDismiss: true,
        container: anchor.closest(`.${FRAMESET_BODY_CLASSNAME}`),
        position: atAnchorBottomLeft,
        onClose: () => {
          this._menu = undefined;
        },
      }
    );
  };

  _getMenuItems(): BlockControlMenuItem[] {
    const {align, crop, cropData, rotate} = this.props.node.attrs;
    const sizingDisabled = !!(crop || cropData || rotate);

    return [
      {
        id: 'reset-image',
        label: 'Reset Image',
        hint: 'Original',
        icon: getBlockControlIcon('resetImage', 'Reset image'),
        action: this._onResetImage,
        disabled: sizingDisabled || !this._hasResolvedOriginalSize(),
      },
      {
        id: 'fit-to-width',
        label: 'Fit To Width',
        hint: 'Keep ratio',
        icon: getBlockControlIcon('fitWidth', 'Fit to width'),
        action: this._onFitToWidth,
        disabled: sizingDisabled,
      },
      {
        id: 'size-fit',
        label: 'Size & Fit...',
        hint: 'Exact values',
        icon: getBlockControlIcon('sizeFit', 'Size & fit'),
        action: this._onSizeFit,
        disabled: sizingDisabled,
        dividerBefore: true,
      },
      {
        id: 'insert-above',
        label: 'Insert Paragraph Above',
        icon: getBlockControlIcon('insertAbove', 'Insert Paragraph Above'),
        action: () => this._insertParagraph('above'),
        dividerBefore: true,
      },
      {
        id: 'insert-below',
        label: 'Insert Paragraph Below',
        icon: getBlockControlIcon('insertBelow', 'Insert Paragraph Below'),
        action: () => this._insertParagraph('below'),
      },
      {
        id: 'align-left',
        label: 'Left Align',
        icon: getBlockControlIcon('alignLeft', 'Left Align'),
        action: () => this._onChange({align: 'left'}),
        active: align === 'left',
        disabled: align === 'left',
      },
      {
        id: 'align-center',
        label: 'Center Align',
        icon: getBlockControlIcon('alignCenter', 'Center Align'),
        action: () => this._onChange({align: 'center'}),
        active: align === 'center',
        disabled: align === 'center',
      },
      {
        id: 'align-right',
        label: 'Right Align',
        icon: getBlockControlIcon('alignRight', 'Right Align'),
        action: () => this._onChange({align: 'right'}),
        active: align === 'right',
        disabled: align === 'right',
      },
      {
        id: 'float-left',
        label: 'Float Left',
        icon: getBlockControlIcon('floatLeft', 'Float Left'),
        action: () => this._onChange({align: 'float-left'}),
        active: align === 'float-left',
        disabled: align === 'float-left',
      },
      {
        id: 'float-right',
        label: 'Float Right',
        icon: getBlockControlIcon('floatRight', 'Float Right'),
        action: () => this._onChange({align: 'float-right'}),
        active: align === 'float-right',
        disabled: align === 'float-right',
      },
      {
        id: 'crop',
        label: 'Crop',
        icon: getBlockControlIcon('crop', 'Crop'),
        action: () => this._onCrop(),
      },
      {
        id: 'reset-crop',
        label: 'Reset Crop',
        icon: getBlockControlIcon('resetCrop', 'Reset Crop'),
        action: () => this._updateImageAttrs({crop: null, cropData: null}),
        disabled: !this.props.node.attrs.crop && !this.props.node.attrs.cropData,
      },
      {
        id: 'choose-file',
        label: 'Choose File',
        icon: getBlockControlIcon('file', 'Choose File'),
        action: () => this._onChooseFile(),
      },
      {
        id: 'paste-clipboard',
        label: 'Paste from Clipboard',
        icon: getBlockControlIcon('clipboard', 'Paste from Clipboard'),
        action: () => this._onPasteFromClipboard(),
        disabled: !navigator.clipboard?.read,
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: getBlockControlIcon('delete', 'Delete'),
        action: () => this._onRemove(),
      },
    ];
  }

  _closeMenu = (): void => {
    const menu = this._menu;
    this._menu = undefined;
    menu?.close?.(undefined);
  };

  _insertParagraph(placement: 'above' | 'below'): void {
    const {getPos, node, editorView} = this.props;
    const pos = getPos();
    if (pos === undefined || pos === null) {
      return;
    }

    const paragraphType = editorView.state.schema.nodes.paragraph;
    const paragraph = paragraphType?.createAndFill();
    if (!paragraph) {
      return;
    }

    const boundary = this._getParagraphInsertBoundary(pos, node);
    const insertPos = placement === 'above' ? boundary.before : boundary.after;
    let tr = editorView.state.tr.insert(insertPos, paragraph);
    tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
    editorView.dispatch(tr.scrollIntoView());
  }

  _getParagraphInsertBoundary(
    pos: number,
    node: Node
  ): {before: number; after: number} {
    if (node.isBlock) {
      return {before: pos, after: pos + node.nodeSize};
    }

    const resolvedPos = this.props.editorView.state.doc.resolve(pos);
    if (resolvedPos.depth === 0) {
      return {before: pos, after: pos + node.nodeSize};
    }

    return {
      before: resolvedPos.before(resolvedPos.depth),
      after: resolvedPos.after(resolvedPos.depth),
    };
  }

  _onRemove(): void {
    const {getPos, node, editorView} = this.props;
    const pos = getPos();
    if (pos === undefined || pos === null) {
      return;
    }
    editorView.dispatch(editorView.state.tr.delete(pos, pos + node.nodeSize));
  }

  _onCrop(): void {
    const {node} = this.props;
    const src = node.attrs.src;
    if (!src) {
      return;
    }

    this._cropEditor = createPopUp(
      CropImagePopup,
      {
        src,
        position: atAnchorTopCenter,
        onConfirm: (cropData: CropDataPropValue) => {
          this._updateImageAttrs({cropData});
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
        onClose: () => {
          this._cropEditor = undefined;
        },
      }
    );
  }

  _onChooseFile(): void {
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
          this._updateImageAttrs({
            crop: null,
            cropData: null,
            src: reader.result,
          });
        }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  }

  _onPasteFromClipboard(): void {
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
              this._updateImageAttrs({
                crop: null,
                cropData: null,
                src: reader.result,
              });
            }
          };
          reader.readAsDataURL(blob);
        });
        return;
      }
    });
  }

  _updateImageAttrs(attrs: Record<string, unknown>): void {
    const {getPos, node, editorView} = this.props;
    const pos = getPos();
    if (pos === undefined || pos === null) {
      return;
    }
    editorView.dispatch(
      editorView.state.tr.setNodeMarkup(pos, null, {
        ...node.attrs,
        ...attrs,
      })
    );
  }

  _bodyEl: HTMLElement | null = null;
  _onBodyRef = (ref?: HTMLElement): void => {
    if (ref) {
      this._body = ref;
      this._bodyEl = ref;
      observe(ref, this._onBodyResize);
    } else {
      if (this._bodyEl) {
        unobserve(this._bodyEl);
      }
      this._body = null;
      this._bodyEl = null;
    }
  };
  _onBodyResize = (_info: ResizeObserverEntry): void => {
    const now = Date.now();
    // Increase window to 2000ms because layout thrashing can be slow
    if (now - this._lastResizeTime < 2000) {
      this._resizeLoopCount++;
    } else {
      this._resizeLoopCount = 0;
    }
    this._lastResizeTime = now;

    if (this._resizeLoopCount > 5) {
      if (this._resizeLoopCount === 6)
        console.warn(
          '[MultmediaPlugin] Resize loop detected (>5), skipping update'
        );
      return;
    }

    let mActualWidth = 0;
    if (_info.contentRect) {
      mActualWidth = _info.contentRect.width;
    }
    const width = this._bodyEl
      ? getMaxResizeWidth(this._bodyEl)
      : MAX_SIZE;

    const oldWidth = this.state.maxSize.width;
    const diff = Math.abs(width - oldWidth);
    const stable = diff < 2 && this.state.maxSize.complete === !!this._body;

    if (stable) return;

    this.setState({
      maxSize: {
        width: Math.max(mActualWidth, width),
        height: MAX_SIZE,
        complete: !!this._body,
      },
    });
  };
}

export class ImageNodeView extends CustomNodeView {
  // @override
  createDOMElement(): HTMLElement {
    const el = document.createElement('span');
    this._updateDOM(el);
    return el;
  }

  // @override
  update(node: Node, decorations: Array<Decoration>): boolean {
    if (node.type !== this.props.node.type) {
      return false;
    }
    super.update(node, decorations);
    this._updateDOM(this.dom);
    return true;
  }

  // @override
  renderReactComponent(): React.ReactElement {
    return <ImageViewBody {...this.props} />;
  }

  _updateDOM(el: HTMLElement): void {
    const {align} = this.props.node.attrs;
    let className = 'molm-czi-image-view';
    if (align) {
      className += ' align-' + align;
    }
    el.className = className;

    if (this.props.node.attrs['fitToParent']) {
      el.style.width = FP_WIDTH;
      el.style.padding = '0';
      el.style.margin = '0';
    } else {
      el.style.removeProperty('width');
      el.style.removeProperty('padding');
      el.style.removeProperty('margin');
    }
  }
  ignoreMutation(): boolean {
    return true;
  }
}
