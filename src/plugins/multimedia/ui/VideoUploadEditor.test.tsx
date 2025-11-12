import {VideoUploadEditor} from './VideoUploadEditor';

const VideoUploadEditorProps = {
  runtime: { // Video Proxy
    canProxyVideoSrc: (_src: string) => true,
    getProxyVideoSrc: (_src: string) => 'http://video.mp4',
    getVideoSrc: jest.fn().mockReturnValue(Promise.resolve('http://video.mp4')),

    // Video Upload
    canUploadVideo: () => true,
    uploadVideo: jest.fn().mockResolvedValue({
      height: 200,
      id: 'Test-1',
      src: '',
      width: 150,
    }),
  },
  close: () => undefined
};
const VideoUploadEdrProps = {
  runtime: { // Video Proxy
    canProxyVideoSrc: (_src: string) => false,
    getProxyVideoSrc: (_src: string) => 'http://video.mp4',
    getVideoSrc: jest.fn().mockReturnValue(Promise.resolve('http://video.mp4')),

    // Video Upload
    canUploadVideo: () => false,
    uploadVideo: jest.fn().mockResolvedValue({

    }),
  },
  close: () => undefined
};
const testCases=[VideoUploadEditorProps,VideoUploadEdrProps];
describe('Video Upload Editor', () => {



  testCases.forEach(testProps => {
    it('should render Video Upload Editor', () => {

      const wrapper =new VideoUploadEditor ({...testProps} );
      expect(wrapper).toBeDefined();
    });
});

});
describe('Video Upload Editor', () => {
  const VideoUploadEditorProps = {
    runtime: { // Video Proxy
      canProxyVideoSrc: (_src: string) => true,
      getProxyVideoSrc: (_src: string) => 'http://video.mp4',
      getVideoSrc: jest.fn().mockReturnValue(Promise.resolve('http://video.mp4')),

      // Video Upload
      canUploadVideo: () => true,
      uploadVideo: jest.fn().mockResolvedValue({
        height: 200,
        id: 'Test-1',
        src: '',
        width: 150,
      }),
    },
    close: () => undefined
  };

 const videouploadeditor = new VideoUploadEditor(VideoUploadEditorProps);

    it('should render Video Upload Editor', () => {

     expect(videouploadeditor).toBeDefined();
     expect(() => videouploadeditor._cancel()).not.toThrow();

    });
    it('should handle componentWillUnmount', () => {
      videouploadeditor.componentWillUnmount();
      expect(videouploadeditor._unmounted).toBeTruthy();

     });
     it('should handle _onSuccess ', () => {
      videouploadeditor._unmounted = true;
      expect(videouploadeditor._onSuccess( {
        height: 10,
        id: '',
        src: '',
        width: 10
    })).toBeUndefined();

     });
     it('should handle _onError  ', () => {
      videouploadeditor._unmounted = true;
      expect(videouploadeditor._onError({
        name: '',
        message: '',
        stack: ''
    }
    )).toBeUndefined();

     });

     it('should handle _upload ', async() => {
      videouploadeditor.props = {
      close: () => undefined};

      const file = new File([], 'test.mp4');
      const instance = await videouploadeditor._upload(file);


      expect(instance).toBeUndefined();

     });
     it('should handle _upload ', async() => {
      videouploadeditor.props = {  runtime: { // Video Proxy
        canProxyVideoSrc: (_src: string) => true,
        getProxyVideoSrc: (_src: string) => 'http://video.mp4',
        getVideoSrc: jest.fn().mockReturnValue(Promise.resolve('http://video.mp4')),

        // Video Upload
        canUploadVideo: () => true,
        uploadVideo: jest.fn().mockResolvedValue({
          height: 0,
          id: 'Test-1',
          src: '',
          width: 0,
        }),
      },
      close: () => undefined};

      const file = new File([], 'test.mp4');
      const instance = await videouploadeditor._upload(file);


      expect(instance).toBeUndefined();

     });
     it('should handle render',()=>{
      const vue = new VideoUploadEditor({});
      vue.state = {error:null,id:'id',pending:true};
      expect(vue.render()).toBeDefined();
     });
     it('should handle render when there is error',()=>{
      const vue = new VideoUploadEditor({});
      vue.state = {error:true as unknown as null,id:'id',pending:false};
      expect(vue.render()).toBeDefined();
     });
     it('should handle _onSelectFile ',()=>{
      const vue = new VideoUploadEditor({});
      vue.state = {error:true as unknown as null,id:'id',pending:false};
      expect(vue._onSelectFile({target:{files:[{}]}} as unknown as React.SyntheticEvent<HTMLInputElement>)).toBeUndefined();
     });
});

