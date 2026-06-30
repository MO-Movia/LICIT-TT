/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';

type FragProps = {
  children?: React.ReactNode;
};

class Frag extends React.Component<FragProps, unknown> {
  render(): React.ReactNode {
    return <div className="czi-frag">{this.props.children}</div>;
  }
}

export default Frag;
