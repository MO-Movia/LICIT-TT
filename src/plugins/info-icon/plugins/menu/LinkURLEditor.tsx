// @flow

import * as React from 'react';
import {EditorView} from 'prosemirror-view';
import {sanitizeURL} from './sanitizeURL';
import {toggleMark} from 'prosemirror-commands';
import {preventEventDefault,CustomButton} from '@modusoperandi/licit-ui-commands';
import './czi-form.css';
import './czi-image-url-editor.css';

export const ENTER = 13;
const BAD_CHARACTER_PATTER = /\s/;

type LinkProps = {
  href: string;
  view: EditorView;
  close: (url?) => string;
};
export class LinkURLEditor extends React.PureComponent<LinkProps> {
  state = {
    url: this.props.href,
  };

  render() {
    const {href} = this.props;
    const {url} = this.state;

    const error = url ? BAD_CHARACTER_PATTER.test(url) : false;

    return (
      <div className="czi-image-url-editor">
        <form className="czi-form" onSubmit={preventEventDefault}>
          <fieldset>
            <legend>Add a Link</legend>
            <input
              autoFocus={true}
              onChange={this._onURLChange}
              onKeyDown={this._onKeyDown}
              placeholder="Paste a URL"
              spellCheck={false}
              type="text"
              value={url || ''}
            />
          </fieldset>
          <div className="czi-form-buttons">
            <CustomButton label="Cancel" onClick={this._cancel} />
            <CustomButton
              active={true}
              disabled={(href ? error : (error || !url))}
              label="Apply"
              onClick={this._apply}
            />
          </div>
        </form>
      </div>
    );
  }

  _onKeyDown = (e) => {
    if (e.keyCode === ENTER) {
      e.preventDefault();
      this._apply();
    }
  };

  _onURLChange = (e) => {
    const url = e.target.value;
    this.setState({
      url,
    });
  };

  _cancel = () => {
    this.props.close();
  };

  _apply = () => {
    const {url} = this.state;
    toggleMark(this.props.view.state.schema.marks.link, {
      href: url,
    })(this.props.view.state, this.props.view.dispatch);
    this.props.view.focus();
    this.props.close(sanitizeURL(url));
    return false;
  };
}
