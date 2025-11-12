import React from 'react';
import {
  preventEventDefault,
  CustomButton,
} from '@modusoperandi/licit-ui-commands';
import {resolveImage} from './resolveImage';

export type ImageEditorProps = {
  initialValue;
  close: (val?) => void;
};
export type ImageEditorState = {
  id: string;
  src: string;
  width: number;
  height: number;
  validValue: Record<string, unknown>;
};

export class ImageURLEditor extends React.PureComponent<
  ImageEditorProps,
  ImageEditorState
> {
  _unmounted = false;

  state = {
    ...(this.props.initialValue || {}),
    validValue: null,
  };

  componentWillUnmount(): void {
    this._unmounted = true;
  }

  render(): React.ReactElement {
    const {src, validValue} = this.state;
    const preview = validValue ? (
      <div
        className="molm-czi-image-url-editor-input-preview"
        style={{backgroundImage: `url(${String(validValue.src)}`}}
      />
    ) : null;

    return (
      <div className="molm-czi-image-url-editor">
        <form className="molm-czi-form" onSubmit={preventEventDefault}>
          <fieldset>
            <legend>Insert Image</legend>
            <div className="molm-czi-image-url-editor-src-input-row">
              <input
                autoFocus={true}
                className="molm-czi-image-url-editor-src-input"
                onChange={this._onSrcChange}
                placeholder="Paste URL of Image..."
                type="text"
                value={src || ''}
              />
              {preview}
            </div>
            <em>
              Only select image that you have confirmed the license to use
            </em>
          </fieldset>
          <div className="molm-czi-form-buttons">
            <CustomButton
              className="cancelbtn"
              label="Cancel"
              onClick={this._cancel}
            />
            <CustomButton
              active={!!validValue}
              className="insertbtn"
              disabled={!validValue}
              label="Insert"
              onClick={this._insert}
            />
          </div>
        </form>
      </div>
    );
  }

  _onSrcChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const src = (e.target as HTMLInputElement).value;
    this.setState(
      {
        src,
        validValue: null,
      },
      this._didSrcChange
    );
  };

  _didSrcChange = (): void => {
    resolveImage(this.state.src).then((result) => {
      if (this.state.src === result.src && !this._unmounted) {
        const validValue = result.complete ? result : null;
        this.setState({validValue});
      }
    });
  };

  _cancel = (): void => {
    this.props.close();
  };

  _insert = (): void => {
    const {validValue} = this.state;
    this.props.close(validValue);
  };
}
