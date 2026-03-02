/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';

class Frag extends React.Component<
    any,
    any
> {
  render(): React.ReactNode {
    return <div className="czi-frag">{this.props.children}</div>;
  }
}

export default Frag;
