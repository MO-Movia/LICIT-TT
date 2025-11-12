import cx from 'classnames';
import {Node} from 'prosemirror-model';
import {Decoration} from 'prosemirror-view';
import {NodeSelection} from 'prosemirror-state';
import React from 'react';
import ReactDOM from 'react-dom';

import {CustomNodeView} from './CustomNodeView';
import {Icon} from './Icon';
import {ImageResizeBox, MIN_SIZE} from './ImageResizeBox';

import {
  createPopUp,
  atAnchorBottomCenter,
  PopUpHandle,
} from '@modusoperandi/licit-ui-commands';
import ResizeObserver from './ResizeObserver';
import {resolveImage} from './resolveImage';
import {uuid} from './uuid';

import type {EditorRuntime} from '../Types';
import type {NodeViewProps} from './CustomNodeView';
import type {ResizeObserverEntry} from './ResizeObserver';
import {ImageInlineEditor} from './ImageInlineEditor';
import {FP_WIDTH} from '../Constants';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';
const EMPTY_SRC =
  'data:image/gif;base64,' +
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* This value must be synced with the margin defined at .czi-image-view */
const IMAGE_MARGIN = 2;

const MAX_SIZE = 100000;
const IMAGE_PLACEHOLDER_SIZE = 24;

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
};

// Get the maxWidth that the image could be resized to.
function getMaxResizeWidth(el): number {
  // Ideally, the image should bot be wider then its containing element.
  let node = el.parentElement;
  while (node && !node.offsetParent) {
    node = node.parentElement;
  }
  if ((node?.offsetParent?.offsetWidth || 0) > 0) {
    const {offsetParent} = node;
    const style = el.ownerDocument.defaultView.getComputedStyle(offsetParent);
    let width = offsetParent.clientWidth - IMAGE_MARGIN * 2;
    if (style.boxSizing === 'border-box') {
      const pl = Number.parseInt(style.paddingLeft, 10);
      const pr = Number.parseInt(style.paddingRight, 10);
      width -= pl + pr;
    }
    return Math.max(width, MIN_SIZE);
  }
  // Let the image resize freely.
  return MAX_SIZE;
}

async function resolveURL(
  runtime: EditorRuntime,
  src: string,
  dom: Element
): Promise<string> {
  if (!runtime) {
    return src;
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
  return src;
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
  _inlineEditor?: PopUpHandle;
  _mounted = false;

  state = {
    maxSize: {
      width: MAX_SIZE,
      height: MAX_SIZE,
      complete: false,
    },
    originalSize: DEFAULT_ORIGINAL_SIZE,
  };

  componentDidMount(): void {
    this._mounted = true;
    this._resolveOriginalSize();
    this._renderInlineEditor();
  }

  componentWillUnmount(): void {
    this._mounted = false;
    this._inlineEditor?.close(undefined);
    this._inlineEditor = undefined;
  }

  componentDidUpdate(prevProps: NodeViewProps): void {
    const prevSrc = prevProps.node.attrs.src;
    const {node} = this.props;
    const {src} = node.attrs;
    if (prevSrc !== src) {
      // A new image is provided, resolve it.
      this._resolveOriginalSize();
    }
    this._renderInlineEditor();
  }

  render(): React.ReactElement {
    const {originalSize, maxSize} = this.state;
    const {editorView, node, selected, focused} = this.props;
    const {readOnly} = editorView;
    const {attrs} = node;
    const {align, crop, rotate} = attrs;

    const retVal = this.assignVal(originalSize, focused, readOnly);
    const loading = retVal.loading;
    const active = retVal.active;
    const src = retVal.src;
    const aspectRatio = retVal.aspectRatio;
    const error = retVal.error;

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
    if (width > maxSize.width && (!crop || crop.width > maxSize.width)) {
      // Scale image to fit its containing space.
      // If the image is not cropped.
      width = maxSize.width;
      height = width / aspectRatio;
      scale = maxSize.width / width;
    }

    const className = cx('molm-czi-image-view-body', {
      active,
      error,
      focused,
      loading,
      selected,
    });

    const resizeBox = this.isUnaltered(active, attrs.cropData, rotate) ? (
      <ImageResizeBox
        fitToParent={this.props.node.attrs['fitToParent']}
        height={height}
        onResizeEnd={this._onResizeEnd}
        src={src}
        width={width}
      />
    ) : null;

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
    if (attrs.cropData) {
      clipStyle.width = `${attrs.cropData.width}px`;
      clipStyle.height = `${attrs.cropData.height}px`;
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

    const errorView = error ? Icon.get('error') : null;
    const errorTitle = error
      ? `Unable to load image from ${attrs.src || ''}`
      : undefined;

    const pStyle: React.CSSProperties = {};
    if (this.props.node.attrs['fitToParent']) {
      width = FP_WIDTH;
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
              width={width}
            />
            {errorView}
          </span>
        </span>
        {resizeBox}
      </span>
    );
  }

  assignVal(originalSize: OriginalSize, focused: boolean, readOnly: boolean) {
    // It's only active when the image's fully loaded.
    const loading = originalSize === DEFAULT_ORIGINAL_SIZE;
    const active = !loading && focused && !readOnly && originalSize.complete;
    const src = originalSize.src;
    const aspectRatio = loading ? 1 : originalSize.width / originalSize.height;
    const error = !loading && !originalSize.complete;
    return {loading, active, src, aspectRatio, error};
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

  _renderInlineEditor(): void {
    const el = document.getElementById(this._id);
    if (!el || el.getAttribute('data-active') !== 'true') {
      this._inlineEditor?.close?.(undefined);
      return;
    }

    const {node} = this.props;
    const editorProps = {
      value: node.attrs,
      onSelect: this._onChange,
      editorView: this.props.editorView,
      imageId: this._id,
    };
    if (this._inlineEditor) {
      this._inlineEditor.update(editorProps);
    } else {
      this._inlineEditor = createPopUp(ImageInlineEditor, editorProps, {
        anchor: el,
        autoDismiss: false,
        container: el.closest(`.${FRAMESET_BODY_CLASSNAME}`),
        position: atAnchorBottomCenter,
        onClose: (_val) => {
          this._inlineEditor = null;
        },
      });
    }
  }

  _resolveOriginalSize = async (): Promise<void> => {
    if (!this._mounted) {
      // unmounted;
      return;
    }

    const src = this.props.node.attrs.src;
    if (src === this.state.originalSize?.src) {
      return; // already resolved
    }
    const url = await resolveURL(
      this.props.editorView.runtime as EditorRuntime,
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
    this.setState({originalSize});
  };

  _onResizeEnd = (width: number, height: number): void => {
    const {getPos, node, editorView} = this.props;
    const pos = getPos();
    if (pos) {
      const attrs = {
        ...node.attrs,
        crop: null,
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
    }
  };

  _onChange = (value?: {align: string}): void => {
    if (!this._mounted) {
      return;
    }

    const align = value ? value.align : null;
    const {getPos, node, editorView} = this.props;
    const pos = getPos();
    const attrs = {
      ...node.attrs,
      align,
    };

    let tr = editorView.state.tr;
    const {selection} = editorView.state;
    tr = tr.setNodeMarkup(pos, null, attrs);
    // Upgrade outdated packages.
    // reset selection to original using the latest doc.
    const origSelection = NodeSelection.create(tr.doc, selection.from);
    tr = tr.setSelection(origSelection);
    editorView.dispatch(tr);
  };

  _onBodyRef = (ref?: React.ReactInstance): void => {
    if (ref) {
      this._body = ref;
      // Mounting
      const el = ReactDOM.findDOMNode(ref);
      if (el instanceof HTMLElement) {
        ResizeObserver.observe(el, this._onBodyResize);
      }
    } else {
      // Unmounting.
      const el = this._body && ReactDOM.findDOMNode(this._body);
      if (el instanceof HTMLElement) {
        ResizeObserver.unobserve(el);
      }
      this._body = null;
    }
  };

  _onBodyResize = (_info: ResizeObserverEntry): void => {
    let mActualWidth = 0;
    if (_info.contentRect) {
      mActualWidth = _info.contentRect.width;
    }
    const width = this._body
      ? getMaxResizeWidth(ReactDOM.findDOMNode(this._body))
      : MAX_SIZE;

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
    }
  }
  ignoreMutation(): boolean {
    return true;
  }
}
