import * as React from 'react';

class Frag extends React.Component<
  /* eslint-disable  @typescript-eslint/no-explicit-any */ any,
  /* eslint-disable  @typescript-eslint/no-explicit-any */ any
> {
  render(): React.ReactNode {
    return <div className="czi-frag">{this.props.children}</div>;
  }
}

export default Frag;
