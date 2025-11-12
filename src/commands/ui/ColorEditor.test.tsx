import {render} from '@testing-library/react';
import React from 'react';
import {ColorEditor} from './ColorEditor';
import '@testing-library/jest-dom';

jest.mock('./CustomButton', () => ({
  CustomButton: ({onClick, value, active, label, className, style}) => (
    <button
      aria-pressed={active}
      className={className}
      data-testid={`color-button-${value}`}
      onClick={() => onClick(value)}
      style={style}
    >
      {label}
    </button>
  ),
}));

describe('ColorEditor', () => {
  const mockClose = jest.fn();

  beforeEach(() => {
    mockClose.mockClear();
  });

  it('renders the correct number of rainbow color buttons for each color section', () => {
    const {getAllByTestId} = render(<ColorEditor close={mockClose} />);
    expect(getAllByTestId(/color-button-/).length).toBeGreaterThan(10);
  });

  it('sets the correct button as active when selectedColor matches a color', () => {
    const selectedHex = '#f20d96';
    const { getByTestId } = render(<ColorEditor close={mockClose} hex={selectedHex} />);

    const selectedButton = getByTestId(`color-button-${selectedHex}`);
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
  });
});
