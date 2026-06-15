/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { preventEventDefault, CustomButton } from '../../../commands';

import { resolveVideo } from './resolveVideo';

export type VideoEditorProps = {
  initialValue;
  close: (val?) => void;
};
export type VideoEditorState = {
  id: string;
  src: string;
  width: number;
  height: number;
  validValue: boolean;
};

export class VideoEditor extends React.PureComponent<
  VideoEditorProps,
  VideoEditorState
> {
  state: VideoEditorState = {
    ...this.props.initialValue,
    validValue: null,
    src: 'https://www.youtube.com/embed/',
  };

  render(): React.ReactNode {
    const { src, width, height } = this.state;

    return (
      <div className="molm-czi-image-url-editor">
        <form className="molm-czi-form" onSubmit={preventEventDefault}>
          <fieldset>
            <legend>
              <b>Insert Video</b>
            </legend>
            <div className="molm-czi-image-url-editor-src-input-row"></div>
          </fieldset>
          <fieldset>
            <legend>Source</legend>
            <div className="molm-czi-image-url-editor-src-input-row">
              <input
                autoFocus={true}
                className="molm-czi-image-url-editor-src-input"
                onChange={this._onSrcChange}
                placeholder="Paste URL of Video..."
                type="text"
                value={src || ''}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Width</legend>
            <div className="molm-czi-image-url-editor-src-input-row">
              <input
                className="molm-czi-image-url-editor-src-input"
                onChange={this._onWidthChange}
                placeholder="Width"
                type="text"
                value={width || ''}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Height</legend>
            <div className="molm-czi-image-url-editor-src-input-row">
              <input
                className="molm-czi-image-url-editor-src-input"
                onChange={this._onHeightChange}
                placeholder="Height"
                type="text"
                value={height || ''}
              />
            </div>
          </fieldset>
          <div className="molm-czi-form-buttons">
            <CustomButton
              className="cancelbtn"
              label="Cancel"
              onClick={this._cancel}
            />
            <CustomButton
              active={true}
              className="insertbtn"
              disabled={false}
              label="Insert"
              onClick={this._insert}
            />
          </div>
        </form>
      </div>
    );
  }
  getsrc(e: React.ChangeEvent<HTMLInputElement>) {
    return e.target.value;
  }

  _onSrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const src = this.getsrc(e);
    this.setState(
      {
        src,
        validValue: null,
      },
      this._didSrcChange
    );
  };
  _didSrcChange = () => {
    resolveVideo(this.state)
      .then((result) => {
        if (this.state.src === result.src) {
          this._setStateValues(result.src, result.width, result.height, true);
        }
      })
      .catch(console.error);
  };

  _setStateValues = (
    src: string,
    width: number,
    height: number,
    validValue: boolean
  ) => {
    (this as VideoEditor).setState({ src, width, height, validValue });
  };

  _onWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = Number.parseInt(e.target.value);
    this.setState({
      width,
      validValue: true,
    });
  };

  _onHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = Number.parseInt(e.target.value);
    this.setState({
      height,
      validValue: true,
    });
  };

  _cancel = (): void => {
    this.props.close();
  };

  _insert = (): void => {
    this.props.close(this.state);
  };
}
