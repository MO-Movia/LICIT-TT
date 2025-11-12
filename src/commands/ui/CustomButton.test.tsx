import '@testing-library/jest-dom';
import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';
import {CustomButton} from './CustomButton';

describe('CustomButton', () => {
  it('should render the component without icon', () => {
    const props = {
      label: 'Label',
      title: 'Tooltip',
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
    };

    render(<CustomButton {...props} />);

    const button = screen.getByRole('button', {name: 'Label'});
    expect(button).toHaveTextContent('Label');

    // Check if the mouse events are registered correctly
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    expect(props.onMouseEnter).toHaveBeenCalled();
    expect(props.onMouseLeave).not.toHaveBeenCalled();
  });
});
