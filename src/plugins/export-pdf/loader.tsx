/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import { pdfPreviewProgress } from './pdfPreviewProgress';

export class Loader extends React.PureComponent {
  private interval: ReturnType<typeof setInterval>;
  private passCounter: number = 0; 

  componentDidMount() {
    // trigger update of static values
    this.interval = setInterval(() => {

      if (pdfPreviewProgress.isOnLoad) {
        this.passCounter++;
      }
      this.setState({ time: Date.now() });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.interval !== null) {
      clearInterval(this.interval);
    }
  }

  render(): React.ReactElement {
    const passNum = pdfPreviewProgress.isOnLoad ? 1 : 2;
    const totalPasses = 2;

    const counter = pdfPreviewProgress.isOnLoad
      ? this.passCounter
      : pdfPreviewProgress.currentPage ?? 0;

    return (
      <div className="epdf-loader-fullscreen">
        <img
          className="epdf-loader-image"
          src="assets/images/modus-loading.gif"
          alt="Loading..."
        />
        <span>Pass {passNum} of {totalPasses}: {counter}</span>
      </div>
    );
  }
}
