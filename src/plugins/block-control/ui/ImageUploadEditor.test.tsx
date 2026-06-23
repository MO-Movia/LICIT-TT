/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { isValidElement, PureComponent } from 'react';
import type { ReactElement } from 'react';
import { ImageUploadEditor } from './ImageUploadEditor';
import type { ImageUploadProps } from './ImageUploadEditor';

jest.mock('../../../commands', () => ({
  CustomButton: 'CustomButton',
  preventEventDefault: jest.fn(),
  uuid: jest.fn(() => 'test-uuid'),
}));

jest.mock('./LoadingIndicator', () => ({
  LoadingIndicator: 'LoadingIndicator',
}));

type EditorInstance = ImageUploadEditor & {
  setState: jest.Mock;
};

function makeInstance(props: Partial<ImageUploadProps> = {}): EditorInstance {
  const instance = new ImageUploadEditor({
    close: jest.fn(),
    runtime: {},
    ...props,
  }) as EditorInstance;
  instance.setState = jest.fn();
  return instance;
}

function getRoot(instance: ImageUploadEditor): ReactElement {
  return instance.render();
}

function queryNode(
  el: ReactElement,
  predicate: (node: ReactElement) => boolean
): ReactElement | null {
  if (!isValidElement(el)) return null;
  if (predicate(el as ReactElement)) return el as ReactElement;
  const children = (el.props as Record<string, unknown>).children;
  if (!children) return null;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = queryNode(child as ReactElement, predicate);
    if (found) return found;
  }
  return null;
}

function findByType(el: ReactElement, type: unknown): ReactElement | null {
  return queryNode(el, node => node.type === type);
}

function findByProp(
  el: ReactElement,
  key: string,
  value: unknown
): ReactElement | null {
  return queryNode(
    el,
    node => (node.props as Record<string, unknown>)[key] === value
  );
}

describe('ImageUploadEditor', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends React.PureComponent', () => {
    expect(Object.getPrototypeOf(ImageUploadEditor)).toBe(PureComponent);
  });

  it('render() returns a valid React element', () => {
    expect(isValidElement(getRoot(makeInstance()))).toBe(true);
  });

  it('initialises _unmounted to false', () => {
    expect(makeInstance()._unmounted).toBe(false);
  });

  it('initialises state with error=null, id from uuid(), pending=false', () => {
    const instance = new ImageUploadEditor({ close: jest.fn(), runtime: {} });
    expect(instance.state.error).toBeNull();
    expect(instance.state.id).toBe('test-uuid');
    expect(instance.state.pending).toBe(false);
  });

  it('root element is a <div> with base className', () => {
    const root = getRoot(makeInstance());
    expect(root.type).toBe('div');
    expect((root.props as Record<string, unknown>).className).toContain(
      'molm-czi-image-upload-editor'
    );
  });

  it('adds "pending" to className when state.pending=true', () => {
    const instance = new ImageUploadEditor({ close: jest.fn(), runtime: {} });
    instance.state = { pending: true, error: null, id: 'test-uuid' };
    const root = instance.render();
    expect((root.props as Record<string, unknown>).className).toContain('pending');
  });

  it('adds "error" to className when state.error is set', () => {
    const instance = new ImageUploadEditor({ close: jest.fn(), runtime: {} });
    instance.state = { pending: false, error: 'oops', id: 'test-uuid' };
    const root = instance.render();
    expect((root.props as Record<string, unknown>).className).toContain('error');
  });

  it('shows default label text when not pending and no error', () => {
    const root = getRoot(makeInstance());
    const labelDiv = findByProp(root, 'className', 'molm-czi-image-upload-editor-label');
    expect((labelDiv.props as Record<string, unknown>).children).toBe(
      'Choose an image file...'
    );
  });

  it('shows LoadingIndicator when pending=true', () => {
    const instance = new ImageUploadEditor({ close: jest.fn(), runtime: {} });
    instance.state = { pending: true, error: null, id: 'test-uuid' };
    const root = instance.render();
    const labelDiv = findByProp(root, 'className', 'molm-czi-image-upload-editor-label');
    const label = (labelDiv.props as Record<string, unknown>).children as ReactElement;
    expect(isValidElement(label)).toBe(true);
    expect(label.type).toBe('LoadingIndicator');
  });

  it('shows error message when error is set', () => {
    const instance = new ImageUploadEditor({ close: jest.fn(), runtime: {} });
    instance.state = { pending: false, error: 'oops', id: 'test-uuid' };
    const root = instance.render();
    const labelDiv = findByProp(root, 'className', 'molm-czi-image-upload-editor-label');
    expect((labelDiv.props as Record<string, unknown>).children).toBe(
      'Something went wrong, please try again'
    );
  });

  it('renders a file input with correct accept and type', () => {
    const root = getRoot(makeInstance());
    const input = findByType(root, 'input');
    const p = input.props as Record<string, unknown>;
    expect(p.type).toBe('file');
    expect(p.accept).toBe('image/png,image/gif,image/jpeg,image/jpg');
  });

  it('file input is disabled when pending=true', () => {
    const instance = new ImageUploadEditor({ close: jest.fn(), runtime: {} });
    instance.state = { pending: true, error: null, id: 'test-uuid' };
    const root = instance.render();
    const input = findByType(root, 'input');
    expect((input.props as Record<string, unknown>).disabled).toBe(true);
  });

  it('file input is not disabled when pending=false', () => {
    const root = getRoot(makeInstance());
    const input = findByType(root, 'input');
    expect((input.props as Record<string, unknown>).disabled).toBe(false);
  });

  it('file input wires onChange to _onSelectFile', () => {
    const instance = makeInstance();
    const root = getRoot(instance);
    const input = findByType(root, 'input');
    expect((input.props as Record<string, unknown>).onChange).toBe(
      instance._onSelectFile
    );
  });

  it('file input id and key come from state.id', () => {
    const root = getRoot(makeInstance());
    const input = findByType(root, 'input');
    const p = input.props as Record<string, unknown>;
    expect(p.id).toBe('test-uuid');
  });

  it('renders a CustomButton with label "Cancel" wired to _cancel', () => {
    const instance = makeInstance();
    const root = getRoot(instance);
    const btn = findByType(root, 'CustomButton');
    const p = btn.props as Record<string, unknown>;
    expect(p.label).toBe('Cancel');
    expect(p.onClick).toBe(instance._cancel);
  });

  it('_cancel calls props.close with no argument', () => {
    const close = jest.fn();
    const instance = makeInstance({ close });
    instance._cancel();
    expect(close).toHaveBeenCalledWith();
  });

  it('_onError calls setState with error, new id, pending=false', () => {
    const instance = makeInstance();
    const error = new Error('upload failed');
    instance._onError(error);
    expect(instance.setState).toHaveBeenCalledWith({
      error,
      id: 'test-uuid',
      pending: false,
    });
  });

  it('_onError does nothing when _unmounted=true', () => {
    const instance = makeInstance();
    instance._unmounted = true;
    instance._onError(new Error('fail'));
    expect(instance.setState).not.toHaveBeenCalled();
  });

  it('_onSelectFile calls _upload when a file is selected', () => {
    const instance = makeInstance();
    instance._upload = jest.fn();
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    const event = {
      target: { files: [file] },
    } as unknown as React.SyntheticEvent<HTMLInputElement>;
    instance._onSelectFile(event);
    expect(instance._upload).toHaveBeenCalledWith(file);
  });

  it('_onSelectFile does nothing when no file selected', () => {
    const instance = makeInstance();
    instance._upload = jest.fn();
    const event = {
      target: { files: [] },
    } as unknown as React.SyntheticEvent<HTMLInputElement>;
    instance._onSelectFile(event);
    expect(instance._upload).not.toHaveBeenCalled();
  });

  it('_upload sets pending=true then calls _onSuccess on success', async () => {
    const image = { src: 'img.png', width: 100, height: 100 };
    const uploadImage = jest.fn().mockResolvedValue(image);
    const runtime = { canUploadImage: () => true, uploadImage };
    const instance = makeInstance({ runtime });
    instance._onSuccess = jest.fn();

    await instance._upload(new File([''], 'test.png'));

    expect(instance.setState).toHaveBeenCalledWith({ pending: true, error: null });
    expect(instance._onSuccess).toHaveBeenCalledWith(image);
  });

  it('_upload adds local file dimensions when upload result has none', async () => {
    const OriginalFileReader = global.FileReader;
    const OriginalImage = global.Image;
    class MockFileReader {
      error = null;
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      result = 'data:image/png;base64,test';

      readAsDataURL(): void {
        this.onload?.();
      }
    }
    class MockImage {
      naturalHeight = 240;
      naturalWidth = 320;
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    global.FileReader = MockFileReader as unknown as typeof FileReader;
    global.Image = MockImage as unknown as typeof Image;

    const image = {src: 'img.png', id: 'img-1'};
    const uploadImage = jest.fn().mockResolvedValue(image);
    const runtime = {canUploadImage: () => true, uploadImage};
    const instance = makeInstance({runtime});
    instance._onSuccess = jest.fn();

    await instance._upload(new File([''], 'test.png'));

    expect(instance._onSuccess).toHaveBeenCalledWith({
      ...image,
      height: 240,
      width: 320,
    });
    global.FileReader = OriginalFileReader;
    global.Image = OriginalImage;
  });

  it('_upload calls _onError when uploadImage rejects', async () => {
    const err = new Error('network error');
    const runtime = {
      canUploadImage: () => true,
      uploadImage: jest.fn().mockRejectedValue(err),
    };
    const instance = makeInstance({ runtime });
    instance._onError = jest.fn();

    await instance._upload(new File([''], 'test.png'));

    expect(instance._onError).toHaveBeenCalledWith(err);
  });

  it('_upload calls _onError when canUploadImage returns false', async () => {
    const runtime = { canUploadImage: () => false, uploadImage: jest.fn() };
    const instance = makeInstance({ runtime });
    instance._onError = jest.fn();

    await instance._upload(new File([''], 'test.png'));

    expect(instance._onError).toHaveBeenCalledWith(expect.any(Error));
    expect(runtime.uploadImage).not.toHaveBeenCalled();
  });

  it('_upload calls _onError when runtime has no uploadImage', async () => {
    const runtime = { canUploadImage: () => true };
    const instance = makeInstance({ runtime });
    instance._onError = jest.fn();

    await instance._upload(new File([''], 'test.png'));

    expect(instance._onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('componentWillUnmount sets _unmounted=true', () => {
    const instance = new ImageUploadEditor({ close: jest.fn(), runtime: {} });
    instance.componentWillUnmount();
    expect(instance._unmounted).toBe(true);
  });

});
