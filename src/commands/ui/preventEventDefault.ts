import * as React from 'react';

export function preventEventDefault(e: React.SyntheticEvent): void {
  e.preventDefault();
}
