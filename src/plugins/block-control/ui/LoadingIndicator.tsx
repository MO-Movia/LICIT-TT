import React from 'react';

// https://loading.io/css/
export class LoadingIndicator extends React.PureComponent {
  render(): React.ReactElement<HTMLElement> {
    return (
      <div className="molm-czi-loading-indicator">
        <div className="molm-frag molm-czi-loading-indicator-frag-1" />
        <div className="molm-frag molm-czi-loading-indicator-frag-2" />
        <div className="molm-frag molm-czi-loading-indicator-frag-3" />
        <div className="molm-frag molm-czi-loading-indicator-frag-4" />
      </div>
    );
  }
}
