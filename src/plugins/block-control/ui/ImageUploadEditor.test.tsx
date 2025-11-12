// ImageUploadEditor.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploadEditor } from './ImageUploadEditor';

jest.mock('@modusoperandi/licit-ui-commands', () => ({
  CustomButton: ({ label, onClick }) => (
    <button onClick={onClick}>{label}</button>
  ),
  preventEventDefault: jest.fn((e) => e.preventDefault()),
  uuid: jest.fn(() => 'mock-id'),
}));

jest.mock('./LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="loading-indicator">Loading...</div>,
}));

describe('ImageUploadEditor', () => {
  const mockClose = jest.fn();
  const mockUploadImage = jest.fn();
  const defaultProps = {
    close: mockClose,
    runtime: {
      canUploadImage: jest.fn(() => true),
      uploadImage: mockUploadImage,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders default state with expected text', () => {
    const { container } = render(<ImageUploadEditor {...defaultProps} />);
    expect(container.textContent).toMatch(/Upload Image/);
    expect(container.textContent).toMatch(/Choose an image file/);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
  });

  it('shows loading indicator when pending', async () => {
    mockUploadImage.mockResolvedValue({ src: 'img.png' });
    const { container, queryByTestId } = render(<ImageUploadEditor {...defaultProps} />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['(image)'], 'image.png', { type: 'image/png' });

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      const indicator = queryByTestId('loading-indicator');
      expect(indicator && indicator.textContent).toBe('Loading...');
    });
  });

  it('calls close on successful upload', async () => {
    mockUploadImage.mockResolvedValue({ src: 'img.png' });
    const { container } = render(<ImageUploadEditor {...defaultProps} />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['file'], 'file.jpg', { type: 'image/jpeg' });

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalledWith({ src: 'img.png' });
    });
  });

  it('shows error message on upload failure', async () => {
    mockUploadImage.mockRejectedValue(new Error('fail'));
    const { container } = render(<ImageUploadEditor {...defaultProps} />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['fail'], 'fail.jpg', { type: 'image/jpeg' });

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(container.textContent).toMatch(/Something went wrong/);
    });
  });

  it('handles cancel button click', () => {
    const { getByText } = render(<ImageUploadEditor {...defaultProps} />);
    fireEvent.click(getByText('Cancel'));
    expect(mockClose).toHaveBeenCalled();
  });

  it('does not upload if canUploadImage is false', async () => {
    const props = {
      ...defaultProps,
      runtime: {
        canUploadImage: () => false,
        uploadImage: jest.fn(),
      },
    };
    const { container } = render(<ImageUploadEditor {...props} />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['invalid'], 'invalid.jpg', { type: 'image/jpeg' });

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(container.textContent).toMatch(/Something went wrong/);
    });
  });

  it('does not call close if component is unmounted before upload finishes', async () => {
    const props = {
      ...defaultProps,
      runtime: {
        canUploadImage: () => false,
        uploadImage: jest.fn(),
      },
    };
    const { container, unmount } = render(<ImageUploadEditor {...props} />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['slow'], 'slow.jpg', { type: 'image/jpeg' });

    fireEvent.change(input!, { target: { files: [file] } });
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(mockClose).not.toHaveBeenCalled();
  });

  it('ignores input if no file selected', () => {
    const { container } = render(<ImageUploadEditor {...defaultProps} />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input!, { target: { files: [] } });
    expect(mockUploadImage).not.toHaveBeenCalled();
  });
});
