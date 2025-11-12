import {createEditor, doc, p} from 'jest-prosemirror';
import {EditorState, Transaction} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {MultimediaPlugin} from './index';
import {
  VideoEditor,
  VideoEditorState,
  VideoEditorProps,
} from './ui/VideoEditor';
import {VideoSourceCommand, insertIFrame} from './VideoSourceCommand';
import {
  CursorPlaceholderPlugin,
  showCursorPlaceholder,
  hideCursorPlaceholder,
  specFinder,
  isPlugin,
  resetInstance,
} from './CursorPlaceholderPlugin';
import {resolveVideo} from './ui/resolveVideo';
import axios from 'axios';
import {VideoResizeBox} from './ui/VideoResizeBox';
import {VideoNodeView, VideoViewBody} from './ui/VideoNodeView';
import {EditorView} from 'prosemirror-view';
import {Node} from 'prosemirror-model';
import {EditorFocused} from './ui/CustomNodeView';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const srcevent = {
  target: {value: 'https://www.youtube.com/embed/ru60J99ojJw'},
} as React.ChangeEvent<HTMLInputElement>;
const resp = {
  data: {
    title: 'US Three Lethal A-10 Warthog Arrive in Ukraine',
    author_name: 'American Fighter',
    author_url: 'https://www.youtube.com/@americanfighter1990',
    type: 'video',
    height: 113,
    width: 200,
    version: '1.0',
    provider_name: 'YouTube',
    provider_url: 'https://www.youtube.com/',
    thumbnail_height: 360,
    thumbnail_width: 480,
    thumbnail_url: 'https://i.ytimg.com/vi/ru60J99ojJw/hqdefault.jpg',
    html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/ru60J99ojJw?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="US Three Lethal A-10 Warthog Arrive in Ukraine"></iframe>',
  },
  status: 200,
  statusText: '',
  headers: {
    'cache-control': 'private',
    'content-encoding': 'gzip',
    'content-length': '410',
    'content-type': 'application/json',
    date: 'Tue, 13 Dec 2022 08:24:08 GMT',
    server: 'scaffolding on HTTPServer2',
    vary: 'Origin, X-Origin, Referer',
  },
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false,
    },
    adapter: ['xhr', 'http'],
    transformRequest: [null],
    transformResponse: [null],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: {},
    headers: {Accept: 'application/json, text/plain, */*'},
    method: 'get',
    url: 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ru60J99ojJw&format=json',
  },
  request: {},
};

describe('Video Plugin - Test', () => {
  const plugin = new MultimediaPlugin();
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [plugin],
  });
  const view = editor.view as unknown as EditorView;

  const schema = plugin.getEffectiveSchema(editor.schema);
  const state: EditorState = EditorState.create({
    schema: schema,
    selection: editor.selection,
    plugins: [new MultimediaPlugin()],
  });

  const attrs = {
    id: '',
    align: null,
    alt: '',
    crop: null,
    height: 113,
    rotate: null,
    src: 'https://www.youtube.com/embed/ru60J99ojJw',

    title: '',
    width: 200,
  };

  const veState: VideoEditorState = {
    id: attrs.id,
    src: attrs.src,
    width: attrs.width,
    height: attrs.height,
    validValue: true,
  };
  const properties: VideoEditorProps = {
    initialValue: {},
    close: () => undefined,
  };

  const newState = state.apply(
    insertIFrame(state.tr, schema, veState) as Transaction
  );

  const VideoeditorIns = new VideoEditor(properties, newState);

  it('should Init VideoSourceCommand', async () => {
    const cmd = new VideoSourceCommand().executeWithUserInput(
      state,
      view.dispatch as (tr: Transform) => void,
      view,
      veState
    );
    const state1 = EditorState.create({
      doc: doc(p('Hello World!!')),
      schema: schema,
    });
    const dom = document.createElement('div');

    const editorView = new EditorView(
      {mount: dom},
      {
        state: state1,
      }
    );
    const enabled = new VideoSourceCommand().__isEnabled(state1, editorView);

    expect(cmd).toBeFalsy();
    expect(enabled).toBeTruthy();
  });

  it('should call getEditor', async () => {
    expect(() => new VideoSourceCommand().getEditor()).toThrow(
      'Not implemented'
    );
  });

  it('should call waitforuserInput', async () => {
    const state2 = EditorState.create({
      doc: doc(p('Hello World!!')),
      schema: schema,
    });
    const dom = document.createElement('div');

    const editorView = new EditorView(
      {mount: dom},
      {
        state: state2,
      }
    );
    const wait = new VideoSourceCommand()
      .waitForUserInput(state, () => undefined, editorView)
      .then(() => true)
      .catch(() => false);
    expect(await wait).toBeFalsy();
  });

  it('should change on src Change Event - resolved', () => {
    mockedAxios.get.mockResolvedValue(resp);
    VideoeditorIns._onSrcChange(srcevent);
    expect(mockedAxios.get).toHaveBeenCalled();
  });

  it('should change on src Change Event - rejected', () => {
    mockedAxios.get.mockRejectedValue(() => new Error('server error'));
    expect(() => VideoeditorIns._onSrcChange(srcevent)).not.toThrow();
  });

  it('should change on Width Change Event ', () => {
    const width = 113;
    const event = {
      target: {value: width} as unknown as HTMLInputElement,
    } as React.ChangeEvent<HTMLInputElement>;
    const spy = jest.spyOn(VideoeditorIns, 'setState');
    VideoeditorIns._onWidthChange(event);
    expect(spy).toBeCalledWith({width, validValue: true});
  });

  it('should change on Height Change Event ', () => {
    const height = 202;
    const event = {
      target: {value: height} as unknown as HTMLInputElement,
    } as React.ChangeEvent<HTMLInputElement>;
    const spy = jest.spyOn(VideoeditorIns, 'setState');
    VideoeditorIns._onHeightChange(event);
    expect(spy).toBeCalledWith({height, validValue: true});
  });

  it('should showCursorPlaceholder', () => {
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new CursorPlaceholderPlugin()],
    });
    const trans = showCursorPlaceholder(state);
    expect(trans).toBeDefined();
  });

  it('should call isPlugin', () => {
    const stateWithoutPlugin: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [],
    });
    isPlugin(null, stateWithoutPlugin.tr);
  });

  it('should resolve video', async () => {
    const res = {
      complete: true,
      height: 113,
      id: '',
      src: 'https://www.youtube.com/embed/ru60J99ojJw',
      width: 200,
    };

    const exp = await resolveVideo(veState);
    expect(exp).toStrictEqual(res);
  });

  it('should resolve video', async () => {
    const nullsrcState: VideoEditorState = {
      id: attrs.id,
      src: '',
      width: attrs.width,
      height: attrs.height,
      validValue: true,
    };
    const res = {
      complete: true,
      height: 113,
      id: '',
      src: '',
      width: 200,
    };

    const exp = await resolveVideo(nullsrcState);
    expect(exp).toEqual(res);
  });

  it('should change on Resize', async () => {
    const ResizeProp = {
      height: 200,
      onResizeEnd: () => undefined,
      src: '',
      width: 113,
      node: {
        attrs: {
          crop: undefined,
        },
      },
      getPos: () => 0,
      editorView: createEditor(doc(p('Hello'))).view,
    };

    const VdoViewBody = new VideoViewBody(ResizeProp);
    VdoViewBody.getScaleSize();
    VdoViewBody._renderInlineEditor();
    VdoViewBody._resolveOriginalSize();
    VdoViewBody._onResizeEnd(250, 500);
    VdoViewBody._onChange({align: 'right'});
    VdoViewBody.getClipStyle(
      200,
      500,
      150,
      {
        width: 100,
        height: 200,
        left: 5,
        top: 1,
      },
      2,
      {
        width: 100,
        height: 200,
        complete: true,
      }
    );
  });

  it('should wait For User Input - Video', () => {
    const node = {
      attrs: {
        id: '',
        align: null,
        alt: '',
        crop: null,
        height: 200,
        rotate: null,
        src: 'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200&h=400',

        title: '',
        width: 400,
      },
    } as unknown as Node;
    const videoNodeView = new VideoNodeView(
      node,
      view as unknown as EditorFocused,
      () => 0,
      []
    );
    videoNodeView.createDOMElement();
    videoNodeView.renderReactComponent();
    const img = document.createElement('img');
    videoNodeView._updateDOM(img);
  });

  it('Video Resize Box ', () => {
    const Resprops = {
      height: 200,
      onResizeEnd: () => undefined,
      src: 'https://www.youtube.com/embed/ru60J99ojJw',
      width: 400,
    };
    const VdoResizeBox = new VideoResizeBox(Resprops);
    expect(VdoResizeBox.props).toEqual(Resprops);
  });

  it('should hideCursorPlaceholder', () => {
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new CursorPlaceholderPlugin()],
    });
    const trans = hideCursorPlaceholder(state);
    resetInstance();
    const tr2 = hideCursorPlaceholder(state);
    expect(trans).toBeTruthy();
    expect(tr2).toBeTruthy();
  });

  it('should plugin apply', () => {
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new CursorPlaceholderPlugin()],
    });
    const tr = state.tr.setMeta(state.plugins[0], {
      add: {
        pos: 0,
      },
    });
    const s = state.apply(tr);
    s.applyTransaction(s.tr);

    const tr1 = state.tr.setMeta(state.plugins[0], {
      remove: {
        pos: 0,
      },
    });
    const s1 = state.apply(tr1);
    s1.applyTransaction(s1.tr);
  });

  it('should call  specFinder', () => {
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new CursorPlaceholderPlugin()],
    });
    const tr = specFinder(state.schema as unknown as {id: {name: string}});
    expect(tr).toBeFalsy();
  });
});

describe('Video Plugin - non-satisfying condition', () => {
  const plugin = new MultimediaPlugin();
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [plugin],
  });

  const schema = plugin.getEffectiveSchema(editor.schema);
  const state: EditorState = EditorState.create({
    schema: schema,
    selection: undefined,
    plugins: [],
  });

  it('should showCursorPlaceholder-else', () => {
    resetInstance();
    const trans = showCursorPlaceholder(state);
    expect(trans).toBeTruthy();
  });
});
