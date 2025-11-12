import cx from 'classnames';
import React from 'react';

import {
  CustomButton,
  preventEventDefault,
} from '@modusoperandi/licit-ui-commands';
import {LoadingIndicator} from './LoadingIndicator';
import {uuid} from './uuid';

import type {EditorRuntime, ImageLike} from '../Types';
type ImageUploadProps = {
  runtime: EditorRuntime;
  close: (val?: ImageLike) => void;
};
export class ImageUploadEditor extends React.PureComponent {
  _unmounted = false;

  declare props: ImageUploadProps;

  state = {
    error: null as string,
    id: uuid(),
    pending: false,
  };

  componentWillUnmount(): void {
    this._unmounted = true;
  }

  render(): React.ReactElement {
    const {id, error, pending} = this.state;
    const className = cx('molm-czi-image-upload-editor', {pending, error});
    let label: string | React.ReactElement = 'Choose an image file...';

    if (pending) {
      label = <LoadingIndicator />;
    } else if (error) {
      label = 'Something went wrong, please try again';
    }

    return (
      <div className={className}>
        <form className="molm-czi-form" onSubmit={preventEventDefault}>
          <fieldset>
            <legend>Upload Image</legend>
            <div className="molm-czi-image-upload-editor-body">
              <div className="molm-czi-image-upload-editor-label">{label}</div>
              <input
                accept="image/png,image/gif,image/jpeg,image/jpg"
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
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && typeof file === 'object') {
      this._upload(file);
    }
  };

  _onSuccess = (image: ImageLike): void => {
    if (this._unmounted) {
      return;
    }
    this.props.close(image);
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
      const {canUploadImage, uploadImage} = runtime;
      if (!canUploadImage || !uploadImage || !canUploadImage()) {
        throw new Error('feature is not available');
      }
      this.setState({pending: true, error: null});
      const image = await uploadImage(file);
      this._onSuccess(image);
    } catch (ex) {
      this._onError(ex);
    }
  };

  _cancel = (): void => {
    this.props.close();
  };
}
