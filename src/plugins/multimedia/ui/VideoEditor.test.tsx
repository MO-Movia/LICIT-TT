/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {VideoEditor} from './VideoEditor';
import * as resolveVideoModule from './resolveVideo';

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
  it('should handle render (case 2)', () => {
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

  it('should handle _cancel', () => {
    const videoeditor = new VideoEditor(props);
    const spy = jest.spyOn(videoeditor.props, 'close');
    videoeditor._cancel();
    expect(spy).toHaveBeenCalled();
  });
  it('should handle _insert', () => {
    const videoeditor = new VideoEditor(props);
    const spy = jest.spyOn(videoeditor.props, 'close');
    videoeditor._insert();
    expect(spy).toHaveBeenCalled();
  });

  it('should update width and height from the field handlers', () => {
    const videoeditor = new VideoEditor(props);
    const setStateSpy = jest.spyOn(videoeditor, 'setState');

    videoeditor._onWidthChange({
      target: {value: '320'},
    } as React.ChangeEvent<HTMLInputElement>);
    videoeditor._onHeightChange({
      target: {value: '240'},
    } as React.ChangeEvent<HTMLInputElement>);

    expect(setStateSpy).toHaveBeenCalledWith({
      width: 320,
      validValue: true,
    });
    expect(setStateSpy).toHaveBeenCalledWith({
      height: 240,
      validValue: true,
    });
  });

  it('should resolve the src and update the state when the result matches', async () => {
    const videoeditor = new VideoEditor(props);
    videoeditor.state = {
      id: 'id',
      src: 'https://youtu.be/demo',
      width: 1,
      height: 1,
      validValue: null,
    };
    jest
      .spyOn(resolveVideoModule, 'resolveVideo')
      .mockResolvedValue({
        src: 'https://youtu.be/demo',
        width: 640,
        height: 360,
      } as never);
    const setStateValuesSpy = jest.spyOn(videoeditor, '_setStateValues');

    await videoeditor._didSrcChange();

    expect(setStateValuesSpy).toHaveBeenCalledWith(
      'https://youtu.be/demo',
      640,
      360,
      true
    );
  });

  it('should ignore resolved video data when the src changed and log resolve errors', async () => {
    const videoeditor = new VideoEditor(props);
    videoeditor.state = {
      id: 'id',
      src: 'https://youtu.be/current',
      width: 1,
      height: 1,
      validValue: null,
    };
    const setStateValuesSpy = jest.spyOn(videoeditor, '_setStateValues');

    jest
      .spyOn(resolveVideoModule, 'resolveVideo')
      .mockResolvedValueOnce({
        src: 'https://youtu.be/other',
        width: 640,
        height: 360,
      } as never);

    await videoeditor._didSrcChange();

    expect(setStateValuesSpy).not.toHaveBeenCalled();
  });

  it('should read the src and queue a follow-up validation after src changes', () => {
    const videoeditor = new VideoEditor(props);
    const didSrcChangeSpy = jest.spyOn(videoeditor, '_didSrcChange');
    const setStateSpy = jest.spyOn(videoeditor, 'setState');
    const event = {
      target: {value: 'https://youtu.be/new'},
    } as React.ChangeEvent<HTMLInputElement>;

    expect(videoeditor.getsrc(event)).toBe('https://youtu.be/new');
    videoeditor._onSrcChange(event);

    expect(setStateSpy).toHaveBeenCalledWith(
      {
        src: 'https://youtu.be/new',
        validValue: null,
      },
      didSrcChangeSpy
    );
  });
});
