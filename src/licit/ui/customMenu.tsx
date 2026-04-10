/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import cx from 'classnames';

type CustomMenuProps = {
  children?: React.ReactNode;
  isHorizontal?: boolean;
  theme?: string;
};
class CustomMenu extends React.Component<CustomMenuProps> {
  render(): React.ReactElement {
    const { children, isHorizontal, theme } = this.props;
    const menuClasssName = 'czi-custom-menu ' + theme;
    const buttonClassName = cx(menuClasssName + ' czi-custom-scrollbar', {
      'czi-horizontal-menu': isHorizontal
    });
    return (
      // <div className="czi-custom-menu czi-custom-scrollbar">
      //   {this.props.children}
      // </div>
      <div className={buttonClassName}>{children}</div>
    );
  }
}

export default CustomMenu;
