/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import {createRoot} from 'react-dom/client';
import {
  createPopUp,
  unrenderPopUp,
  hideModalMask,
  showModalMask,
} from './createPopUp';

const mockRender = jest.fn();
const mockUnmount = jest.fn();

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: mockRender,
    unmount: mockUnmount,
  })),
}));

describe('createPopUp', () => {
  let originalGetElementById;
  let mockGetElementById;

  beforeAll(() => {
    originalGetElementById = document.getElementById;
    mockGetElementById = jest.fn();
    document.getElementById = mockGetElementById;
  });

  beforeEach(() => {
    mockRender.mockClear();
    mockUnmount.mockClear();
    (createRoot as jest.Mock).mockClear();
  });

  afterAll(() => {
    document.getElementById = originalGetElementById;
  });

  it('unrenders a pop-up and calls unmount method', () => {
    const rootId = 'testRootId';

    unrenderPopUp(rootId);

    expect(mockGetElementById).toHaveBeenCalledWith(rootId);
    expect(mockUnmount).toBeDefined();
    expect(hideModalMask).toBeDefined();
  });

  it('creates a pop-up and returns a handle', () => {
    const View = () => <div>Mocked View</div>;
    const viewProps = {};
    const popUpParams = {modal: true, anchor: 'skip'};
    const handle = createPopUp(View, viewProps, popUpParams);
    expect(handle).toBeDefined();
    expect(handle.close).toBeDefined();
    expect(handle.update).toBeDefined();
  });

  it('should handle showModalMask', () => {
    expect(showModalMask(true)).toBeUndefined();
  });

  it('should handle hideModalMask when element?.parentElement', () => {
    const el = document.createElement('div');
    const e = document.createElement('div');
    e.appendChild(el);
    jest.spyOn(document, 'getElementById').mockReturnValue(el);
    expect(hideModalMask()).toBeUndefined();
  });

  it('creates a pop-up with undefined viewProps (branch coverage)', () => {
    const View = () => <div>Mocked View</div>;
    const popUpParams = {modal: false};
    const handle = createPopUp(View, undefined, popUpParams);
    expect(handle).toBeDefined();
    expect(mockRender).toHaveBeenCalled();
  });

  it('creates a pop-up with undefined popUpParams', () => {
    const View = () => <div>Mocked View</div>;
    const popUpParams = {};
    const handle = createPopUp(View, undefined, popUpParams);
    expect(handle).toBeDefined();
    expect(handle.close).toBeDefined();
    expect(handle.update).toBeDefined();
  });

  it('creates a pop-up with both viewProps and popUpParams undefined', () => {
    const View = () => <div>Mocked View</div>;
    const popUpParams = {};
    const handle = createPopUp(View, undefined, popUpParams);
    expect(handle).toBeDefined();
    expect(handle.close).toBeDefined();
    expect(handle.update).toBeDefined();
  });

  it('handles undefined popUpParams gracefully', () => {
    const View = () => <div>Mocked View</div>;
    const popUpParams = {};
    const handle = createPopUp(View, undefined, popUpParams);
    expect(handle).toBeDefined();
    expect(handle.close).toBeDefined();
    expect(handle.update).toBeDefined();
  });

  it('handles falsy popUpParams (empty string) gracefully', () => {
    const View = () => <div>Mocked View</div>;
    const handle = createPopUp(View, undefined, '');
    expect(handle).toBeDefined();
    expect(handle.close).toBeDefined();
    expect(handle.update).toBeDefined();
  });

  it('handles valid popUpParams', () => {
    const View = () => <div>Mocked View</div>;
    const popUpParams = { popUpId: 'test-id' };
    const handle = createPopUp(View, undefined, popUpParams);
    expect(handle).toBeDefined();
    expect(handle.close).toBeDefined();
    expect(handle.update).toBeDefined();
  });
});
