import { SyntheticEvent } from 'react';
import { ImageLike } from '..';
import {ImageUploadEditor} from './ImageUploadEditor';

const ImageUploadEditorProps = {
  runtime: {
    // Image Proxy
    canProxyImageSrc: (_src: string) => true,
    getProxyImageSrc: jest
      .fn()
      .mockReturnValue(Promise.resolve('http:image.png')),

    // Image Upload
    canUploadImage: () => true,
    uploadImage: jest.fn().mockResolvedValue({
      height: 200,
      id: 'Test-1',
      src: '',
      width: 150,
    }),

    // Comments
    canComment: () => true,
    createCommentThreadID: () => 'Test-ID',

    // External HTML
    canLoadHTML: () => true,
    loadHTML: jest.fn().mockResolvedValue('baz'),
  },
  close: () => undefined,
};

describe('Image Upload Editor', () => {
  it('should render Image Upload Editor', () => {
    const ImageUploadEditorIns = new ImageUploadEditor({
      ...ImageUploadEditorProps,
    });
    ImageUploadEditorIns.componentWillUnmount();
    expect(ImageUploadEditorIns).toBeDefined();
  });
  it('should handle render',()=>{
    const ImageUploadEditorIns = new ImageUploadEditor({
      ...ImageUploadEditorProps,
    });
    ImageUploadEditorIns.state.pending = true;
    expect(ImageUploadEditorIns.render()).toBeDefined();
  });
  it('should handle _onSelectFile ',()=>{
    const ImageUploadEditorIns = new ImageUploadEditor({
      ...ImageUploadEditorProps,
    });
    ImageUploadEditorIns.state.pending = true;
    expect(ImageUploadEditorIns._onSelectFile({target:{files:[{type:'object'}]}} as unknown as SyntheticEvent<HTMLInputElement, Event>)).toBeUndefined();
  });
  it('should handle _onSuccess  ',()=>{
    const ImageUploadEditorIns = new ImageUploadEditor({
      ...ImageUploadEditorProps,
    });
    ImageUploadEditorIns.state.pending = true;
    ImageUploadEditorIns._unmounted = true;
    expect(ImageUploadEditorIns._onSuccess({} as unknown as ImageLike)).toBeUndefined();
  });
});
describe('Image Upload Editor', () => {
  it('should render Image Upload Editor', () => {
    const ImageUploadEditorProps = {
      runtime: {
        // Image Proxy
        canProxyImageSrc: (_src: string) => true,
        getProxyImageSrc: jest
          .fn()
          .mockReturnValue(Promise.resolve('http:image.png')),

        // Image Upload
        canUploadImage: () => true,
        uploadImage: jest.fn().mockResolvedValue({
          height: 200,
          id: 'Test-1',
          src: '',
          width: 150,
        }),

        // Comments
        canComment: () => true,
        createCommentThreadID: () => 'Test-ID',

        // External HTML
        canLoadHTML: () => true,
        loadHTML: jest.fn().mockResolvedValue('baz'),
      },
      close: () => undefined,
    };
    const imageuploadeditor = new ImageUploadEditor(ImageUploadEditorProps);
    expect(imageuploadeditor).toBeDefined();
  });
  it('should handle render', () => {
    const ImageUploadEditorProps = {
      runtime: {
        // Image Proxy
        canProxyImageSrc: (_src: string) => true,
        getProxyImageSrc: jest
          .fn()
          .mockReturnValue(Promise.resolve('http:image.png')),

        // Image Upload
        canUploadImage: () => true,
        uploadImage: jest.fn().mockResolvedValue({
          height: 200,
          id: 'Test-1',
          src: '',
          width: 150,
        }),

        // Comments
        canComment: () => true,
        createCommentThreadID: () => 'Test-ID',

        // External HTML
        canLoadHTML: () => true,
        loadHTML: jest.fn().mockResolvedValue('baz'),
      },
      close: () => undefined,
    };
    const imageuploadeditor = new ImageUploadEditor(ImageUploadEditorProps);
    imageuploadeditor.state = {
      error: 'error',
      id: '',
      pending: false,
    };
    expect(imageuploadeditor.render()).toBeDefined();
  });
  it('should handle _onSuccess ', () => {
    const ImageUploadEditorProps = {
      runtime: {
        // Image Proxy
        canProxyImageSrc: (_src: string) => true,
        getProxyImageSrc: jest
          .fn()
          .mockReturnValue(Promise.resolve('http:image.png')),

        // Image Upload
        canUploadImage: () => true,
        uploadImage: jest.fn().mockResolvedValue({
          height: 200,
          id: 'Test-1',
          src: '',
          width: 150,
        }),

        // Comments
        canComment: () => true,
        createCommentThreadID: () => 'Test-ID',

        // External HTML
        canLoadHTML: () => true,
        loadHTML: jest.fn().mockResolvedValue('baz'),
      },
      close: () => undefined,
    };
    const imageuploadeditor = new ImageUploadEditor(ImageUploadEditorProps);
    imageuploadeditor._unmounted = false;
    expect(
      imageuploadeditor._onSuccess({
        height: 10,
        id: '',
        src: '',
        width: 10,
      })
    ).toBeUndefined();
  });

  it('should handle _onError  ', () => {
    const ImageUploadEditorProps = {
      runtime: {
        // Image Proxy
        canProxyImageSrc: (_src: string) => true,
        getProxyImageSrc: jest
          .fn()
          .mockReturnValue(Promise.resolve('http:image.png')),

        // Image Upload
        canUploadImage: () => true,
        uploadImage: jest.fn().mockResolvedValue({
          height: 200,
          id: 'Test-1',
          src: '',
          width: 150,
        }),

        // Comments
        canComment: () => true,
        createCommentThreadID: () => 'Test-ID',

        // External HTML
        canLoadHTML: () => true,
        loadHTML: jest.fn().mockResolvedValue('baz'),
      },
      close: () => undefined,
    };
    const imageuploadeditor = new ImageUploadEditor(ImageUploadEditorProps);
    imageuploadeditor._unmounted = true;
    expect(
      imageuploadeditor._onError({
        name: '',
        message: '',
        stack: '',
      })
    ).toBeUndefined();
  });
  it('should handle _upload ', async () => {
    const ImageUploadEditorProps = {
      runtime: {
        // Image Proxy
        canProxyImageSrc: (_src: string) => true,
        getProxyImageSrc: jest
          .fn()
          .mockReturnValue(Promise.resolve('http:image.png')),

        // Image Upload

        // Comments
        canComment: () => true,
        createCommentThreadID: () => 'Test-ID',

        // External HTML
        canLoadHTML: () => true,
        loadHTML: jest.fn().mockResolvedValue('baz'),
      },
      close: () => undefined,
    };
    const imageuploadeditor = new ImageUploadEditor(ImageUploadEditorProps);
    const file = new File([], 'test.jpg');
    const instance = await imageuploadeditor._upload(file);
    expect(instance).toBeUndefined();
  });

  it('should handle _upload ', () => {
    const ImageUploadEditorProps = {
      runtime: {
        // Image Proxy
        canProxyImageSrc: (_src: string) => true,
        getProxyImageSrc: jest
          .fn()
          .mockReturnValue(Promise.resolve('http:image.png')),

        // Image Upload

        // Comments
        canComment: () => true,
        createCommentThreadID: () => 'Test-ID',

        // External HTML
        canLoadHTML: () => true,
        loadHTML: jest.fn().mockResolvedValue('baz'),
      },
      close: () => undefined,
    };
    const imageuploadeditor = new ImageUploadEditor(ImageUploadEditorProps);

    expect(imageuploadeditor._cancel()).toBeUndefined();
  });
});
describe('image upload editor', () => {
  it('should handle _upload branch coverage when runtime is not present', async () => {
    const ImageUploadEditorProps = {
      close: () => undefined,
    };
    const imageuploadeditor = new ImageUploadEditor(ImageUploadEditorProps);
    const file = new File([], 'test.jpg');
    const instance = await imageuploadeditor._upload(file);
    expect(instance).toBeUndefined();
  });
});
