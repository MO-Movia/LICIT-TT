/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import cx from 'classnames';
import * as React from 'react';
 import { UICommand
} from '@modusoperandi/licit-doc-attrs-step';
const VALID_CHARS = /[a-z_]+/;
const cached = {};

type InfoSubMenuProps = {
  type: string;
  title?: string;
};

export class InfoSubMenuIcon extends React.PureComponent {
  declare props: InfoSubMenuProps;
  // Get the static Icon.
  static get(type: string, title?: string): React.ReactNode {
    const key = `${type || ''}-${title || ''}`;
    const icon = cached[key] || <InfoSubMenuIcon title={title} type={type} />;
    cached[key] = icon;
    return icon;
  }

  render() {
    const {type, title} = this.props;
    let className = '';
    let children = '';
    if (!type || !VALID_CHARS.test(type)) {
      className = cx('czi-icon-unknown');
      children = title || type;
    } else {
      className = cx('czi-icon', {[type]: true}, UICommand.theme);
      children = type;
    }
    return <span className={className}>{children}</span>;
  }
}
