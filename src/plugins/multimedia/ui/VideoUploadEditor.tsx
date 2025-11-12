import cx from 'classnames';
import React from 'react';

import {
  CustomButton,
  preventEventDefault,
} from '@modusoperandi/licit-ui-commands';
import {LoadingIndicator} from './LoadingIndicator';
import {v1 as uuid} from 'uuid';

import type {EditorVideoRuntime, VideoLike} from '../Types';
type VideoUploadEditorProps = {
  runtime?: EditorVideoRuntime;
  close: (val?: VideoLike) => void;
};
export class VideoUploadEditor extends React.PureComponent {
  _unmounted = false;

  declare props: VideoUploadEditorProps;

  state = {
    error: null,
    id: uuid(),
    pending: false,
  };

  componentWillUnmount(): void {
    this._unmounted = true;
  }

  render(): React.ReactElement {
    const {id, error, pending} = this.state;
    const className = cx('molm-czi-image-upload-editor', {pending, error});
    let label: string | React.ReactElement = 'Choose a video file...';

    if (pending) {
      label = <LoadingIndicator />;
    } else if (error) {
      label = 'Something went wrong, please try again';
    }

    return (
      <div className={className}>
        <form className="molm-czi-form" onSubmit={preventEventDefault}>
          <fieldset>
            <legend>Upload Video</legend>
            <div className="molm-czi-image-upload-editor-body">
              <div className="molm-czi-image-upload-editor-label">{label}</div>
              <input
                accept="video/mp4,video/x-m4v,video/*"
                className="molm-czi-image-upload-editor-input"
                disabled={pending}
                id={id}
                key={id}
                onChange={this._onSelectFile}
                type="file"
              />
            </div>
          </fieldset>
          <div className="molm-czi-form-buttons">
            <CustomButton label="Cancel" onClick={this._cancel} />
          </div>
        </form>
      </div>
    );
  }

  _onSelectFile = (event: React.SyntheticEvent<HTMLInputElement>): void => {
    const file =
      (event.target as HTMLInputElement).files &&
      0 < (event.target as HTMLInputElement).files.length &&
      (event.target as HTMLInputElement).files[0];
    if (file) {
      this._upload(file);
    }
  };

  _onSuccess = (video: VideoLike): void => {
    if (this._unmounted) {
      return;
    }
    this.props.close(video);
  };

  _onError = (error: Error): void => {
    if (this._unmounted) {
      return;
    }
    this.setState({
      error,
      id: uuid(),
      pending: false,
    });
  };

  _upload = async (file: File): Promise<void> => {
    try {
      const runtime = this.props.runtime || {};
      const {canUploadVideo, uploadVideo} = runtime;
      if (!canUploadVideo || !uploadVideo || !canUploadVideo()) {
        throw new Error('feature is not available');
      }
      this.setState({pending: true, error: null});
      const image = await uploadVideo(file);
      if (image) {
        if (0 == image.height) {
          image.height = 100;
        }
        if (0 == image.width) {
          image.width = 100;
        }
      }
      this._onSuccess(image);
    } catch (ex) {
      this._onError(ex);
    }
  };

  _cancel = (): void => {
    this.props.close();
  };
}
