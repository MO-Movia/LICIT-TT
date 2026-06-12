/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import React from 'react';
import { initMaterialIconsFonts } from '../../../utils/utils/canUseCSSFont';

const VALID_CHARS = /[a-z_]{1,100000000}/;
const cached: Record<string, React.ReactElement> = {};


queueMicrotask(initMaterialIconsFonts);

class SuperscriptIcon extends React.PureComponent {
  render(): React.ReactElement {
    return (
      <span className="superscript-wrap">
        <span className="superscript-base">x</span>
        <span className="superscript-top">y</span>
      </span>
    );
  }
}

class SubscriptIcon extends React.PureComponent {
  render(): React.ReactElement {
    return (
      <span className="subscript-wrap">
        <span className="subscript-base">x</span>
        <span className="subscript-bottom">y</span>
      </span>
    );
  }
}
type Props = {
  type: string;
  title?: string;
};

export class Icon extends React.PureComponent {
  // Get the static Icon.
  static get(type: string, title?: string): React.ReactElement {
    const key = `${type || ''}-${title || ''}`;
    const icon = cached[key] || <Icon title={title} type={type} />;
    cached[key] = icon;
    return icon;
  }

  declare props: Props;

  render(): React.ReactElement {
    const {type, title} = this.props;
    let className = '';
    let children: React.ReactElement | string;
    if (type == 'superscript') {
      className = cx('molm-czi-icon', {[type]: true});
      children = <SuperscriptIcon />;
    } else if (type == 'subscript') {
      className = cx('molm-czi-icon', {[type]: true});
      children = <SubscriptIcon />;
    } else if (!type || !VALID_CHARS.test(type)) {
      className = cx('czi-icon-unknown');
      children = title || type;
    } else {
      className = cx('molm-czi-icon', {[type]: true});
      children = type;
    }
    return <span className={className}>{children}</span>;
  }
}
