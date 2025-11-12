import cx from 'classnames';
import {Node} from 'prosemirror-model';
import {Decoration} from 'prosemirror-view';
import {NodeSelection} from 'prosemirror-state';
import React from 'react';
import ReactDOM from 'react-dom';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';

import {Icon} from './Icon';
import {ImageInlineEditor} from './ImageInlineEditor';
import {VideoResizeBox, MIN_SIZE} from './VideoResizeBox';
import {
  PopUpHandle,
  atAnchorBottomCenter,
  createPopUp,
} from '@modusoperandi/licit-ui-commands';
import {v1 as uuid} from 'uuid';
import ResizeObserver from './ResizeObserver';
import {resolveVideo, VideoResult} from './resolveVideo';

import type {ResizeObserverEntry} from './ResizeObserver';
import {CustomNodeView} from './CustomNodeView';
import type {NodeViewProps} from './CustomNodeView';
import {VideoEditorState} from './VideoEditor';

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

export type clipStyleType = {
  width?;
  height?;
  transform?;
};

export type videoStyleType = {
  display?: string;
  height?;
  left?;
  top?;
  width?;
  position?;
};

// Get the maxWidth that the image could be resized to.
function getMaxResizeWidth(el): number {
  // Ideally, the image should bot be wider then its containing element.
  let node = el.parentElement;
  while (node && !node.offsetParent) {
    node = node.parentElement;
  }
  if (node?.offsetParent?.offsetWidth && node.offsetParent.offsetWidth > 0) {
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

export class VideoViewBody extends React.PureComponent {
  declare props: NodeViewProps;

  _body?: React.ReactInstance;
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
    this._inlineEditor = null;
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

  getScaleSize(): {
    width: number;
    height: number;
    scale: number;
    loading: boolean;
  } {
    const {originalSize, maxSize} = this.state;
    const {node} = this.props;
    const {attrs} = node;
    const {crop} = attrs;

    // It's only active when the image's fully loaded.
    const loading = originalSize === DEFAULT_ORIGINAL_SIZE;
    const aspectRatio = loading ? 1 : originalSize.width / originalSize.height;

    let {width, height} = attrs;

    if (loading) {
      width = width || IMAGE_PLACEHOLDER_SIZE;
      height = height || IMAGE_PLACEHOLDER_SIZE;
    }

    if (width && !height) {
      height = width / aspectRatio;
    } else if (height && !width) {
      width = height * aspectRatio;
    } else if (!width && !height) {
      width = originalSize.width;
      height = originalSize.height;
    }

    let scale = 1;
    if (width > maxSize.width && (!crop || crop.width > maxSize.width)) {
      // Scale image to fit its containing space.
      // If the image is not cropped.
      width = maxSize.width;
      height = width / aspectRatio;
      scale = maxSize.width / width;
    }
    return {width, height, scale, loading};
  }

  getClipStyle(
    width: number,
    height: number,
    scale: number,
    crop: {width: number; height: number; left: number; top: number},
    rotate: number,
    maxSize: {
      width: number;
      height: number;
      complete: boolean;
    }
  ): {clipStyle: clipStyleType; imageStyle: videoStyleType} {
    const imageStyle: videoStyleType = {
      display: 'inline-block',
      height: height + 'px',
      left: '0',
      top: '0',
      width: width + 'px',
      position: 'relative',
    };

    const clipStyle: clipStyleType = {};
    if (crop) {
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

    return {clipStyle, imageStyle};
  }

  render(): React.ReactElement {
    const {originalSize, maxSize} = this.state;
    const {editorView, node, selected, focused} = this.props;
    const {readOnly} = editorView;
    const {attrs} = node;
    const {align, crop, rotate} = attrs;

    const {width, height, scale, loading} = this.getScaleSize();

    // It's only active when the image's fully loaded.
    const active = !loading && focused && !readOnly && originalSize.complete;
    const src = originalSize.complete ? originalSize.src : EMPTY_SRC;
    const error = !loading && !originalSize.complete;

    const className = cx('molm-czi-image-view-body', {
      active,
      error,
      focused,
      loading,
      selected,
    });

    const resizeBox =
      active && !crop && !rotate ? (
        <VideoResizeBox
          height={height}
          onResizeEnd={this._onResizeEnd}
          src={src}
          width={width}
        />
      ) : null;

    const {clipStyle, imageStyle} = this.getClipStyle(
      width,
      height,
      scale,
      crop,
      rotate,
      maxSize
    );

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
        title={errorTitle}
      >
        <span className="molm-czi-image-view-body-img-clip" style={clipStyle}>
          <span style={imageStyle}>
            <iframe
              className="molm-czi-image-view-body-img"
              data-align={align}
              frameBorder={0}
              height={height}
              id={`${this._id}-img`}
              src={src}
              width={width}
            />
            {errorView}
          </span>
        </span>
        {resizeBox}
      </span>
    );
  }

  _renderInlineEditor(): void {
    const el = document.getElementById(this._id);
    if (!el || el.getAttribute('data-active') !== 'true') {
      this._inlineEditor?.close(undefined);
      return;
    }

    const {node} = this.props;
    const editorProps = {
      value: node.attrs,
      onSelect: this._onChange,
    };
    if (this._inlineEditor) {
      this._inlineEditor.update(editorProps);
    } else {
      this._inlineEditor = createPopUp(ImageInlineEditor, editorProps, {
        anchor: el,
        autoDismiss: false,
        container: el.closest(`.${FRAMESET_BODY_CLASSNAME}`),
        position: atAnchorBottomCenter,
        onClose: () => {
          this._inlineEditor = null;
        },
      });
    }
  }

  _resolveOriginalSize = async (): Promise<void> => {
    let src;
    if (!this._mounted) {
      // unmounted;
      return;
    }

    this.setState({originalSize: DEFAULT_ORIGINAL_SIZE});
    const isRevokeNeeded = false;
    let originalSize: VideoResult;
    if (isRevokeNeeded) {
      URL.revokeObjectURL(this.props.node.attrs.src);
      const id = (this.props.node.attrs as VideoEditorState).id;
      src = (this.props.node.attrs as VideoEditorState).src;
      if (id !== '') {
        src = await this.props.editorView.runtime.getVideoSrc(id);
      }
      const props = this.props.node.attrs as VideoEditorState;
      props.src = src;
      originalSize = await resolveVideo(props);
    } else {
      src = (this.props.node.attrs as VideoEditorState).src;
      originalSize = await resolveVideo(
        this.props.node.attrs as VideoEditorState
      );
    }
    if (!this._mounted) {
      // unmounted;
      return;
    }
    if (this.props.node.attrs.src !== src) {
      // src had changed.
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
    const origSelection = NodeSelection.create(tr.doc, selection.from);
    tr = tr.setSelection(origSelection);
    editorView.dispatch(tr);
  };

  _onChange = (value?: {align?: string}): void => {
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
    const width = this._body
      ? getMaxResizeWidth(ReactDOM.findDOMNode(this._body))
      : MAX_SIZE;

    this.setState({
      maxSize: {
        width,
        height: MAX_SIZE,
        complete: !!this._body,
      },
    });
  };
}

export class VideoNodeView extends CustomNodeView {
  // @override
  createDOMElement(): HTMLElement {
    const el = document.createElement('span');
    el.className = 'molm-czi-image-view';
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
  renderReactComponent(): React.ReactElement<VideoViewBody> {
    return <VideoViewBody {...this.props} />;
  }

  _updateDOM(el: HTMLElement): void {
    const {align} = this.props.node.attrs;
    let className = 'molm-czi-image-view';
    if (align) {
      className += ' align-' + align;
    }
    el.className = className;
  }
}
