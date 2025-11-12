import {VideoEditor} from './VideoEditor';

describe('VideoEditor', () => {
  const props = {
    initialValue: {},
    close: () => undefined,
  };

  const videoeditor = new VideoEditor(props);
  it('should be defined', () => {
    expect(videoeditor).toBeDefined();
  });
  it('should be defined branch coverage', () => {
    const props = {
      initialValue: null,
      close: () => undefined,
    };

    const videoeditor = new VideoEditor(props);
    expect(videoeditor).toBeDefined();
  });

  it('should handle render', () => {
    const videoeditor = new VideoEditor(props);
    videoeditor.state = {
      id: 'id',
      src: '',
      width: 10,
      height: 10,
      validValue: true,
    };
    expect(videoeditor.render()).toBeDefined();
  });
  it('should handle render', () => {
    const videoeditor = new VideoEditor(props);
    videoeditor.state = {
      id: 'id',
      src: '',
      width: 1,
      height: 1,
      validValue: true,
    };
    expect(videoeditor.render()).toBeDefined();
  });

  it('should handle _cancel ', () => {
    const videoeditor = new VideoEditor(props);
    const spy = jest.spyOn(videoeditor.props, 'close');
    videoeditor._cancel();
    expect(spy).toHaveBeenCalled();
  });
  it('should handle _insert  ', () => {
    const videoeditor = new VideoEditor(props);
    const spy = jest.spyOn(videoeditor.props, 'close');
    videoeditor._insert();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle _getYouTubeId ', () => {
    const videoeditor = new VideoEditor(props);
    expect(videoeditor._getYouTubeId('')).toBeDefined();
  });
});
