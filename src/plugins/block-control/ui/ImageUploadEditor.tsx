/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import React from 'react';

import { CustomButton, preventEventDefault, uuid } from '../../../commands';
import { LoadingIndicator } from './LoadingIndicator';

import type { EditorRuntime, ImageLike } from '../Types';

export type ImageUploadProps = {
  runtime: EditorRuntime;
  close: (val?: ImageLike) => void;
};

function hasDimensions(image?: Partial<ImageLike>): boolean {
  return (
    !!image?.width &&
    !!image?.height &&
    image.width > 0 &&
    image.height > 0
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader is not available'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unable to read image as a data URL'));
    };
    reader.onerror = () =>
      reject(reader.error || new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image'));
    image.src = src;
  });
}

async function resolveFileDimensions(
  file: File
): Promise<Partial<ImageLike>> {
  try {
    const dataURL = await readFileAsDataURL(file);
    const image = await loadImage(dataURL);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) {
      return {};
    }
    return {
      height,
      width,
    };
  } catch {
    return {};
  }
}

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
    const { id, error, pending } = this.state;
    const className = cx('molm-czi-image-upload-editor', { pending, error });
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
      void this._upload(file);
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
      const { canUploadImage, uploadImage } = runtime;
      if (!canUploadImage || !uploadImage || !canUploadImage()) {
        throw new Error('feature is not available');
      }
      this.setState({ pending: true, error: null });
      const image = await uploadImage(file);
      const fileDimensions = hasDimensions(image)
        ? {}
        : await resolveFileDimensions(file);
      this._onSuccess({
        ...image,
        height: image.height || fileDimensions.height,
        width: image.width || fileDimensions.width,
      });
    } catch (ex) {
      this._onError(ex);
    }
  };

  _cancel = (): void => {
    this.props.close();
  };
}
