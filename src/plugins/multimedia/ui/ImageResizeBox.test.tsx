import {createEditor, doc, p} from 'jest-prosemirror';
import {ImageResizeBox, ImageResizeBoxControl} from './ImageResizeBox';
import React from 'react';

import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {schema} from 'prosemirror-schema-basic';
import {MultimediaPlugin} from '../index';

describe('Image Resize Box', () => {
  it('should render Image Resize Box', () => {
    const ImageResizeProps = {
      height: 150,
      onResizeEnd: () => undefined,
      src: '',
      width: 180,
      fitToParent: false,
    };
    const wrapper = new ImageResizeBox({...ImageResizeProps});
    expect(wrapper.render()).toBeDefined();
  });
});

describe('Node attribute update', () => {
  let editorView!: EditorView;

  beforeEach(() => {
    const plugin = new MultimediaPlugin();
    const editor = createEditor(doc(p()), {
      plugins: [plugin],
    });
    const state: EditorState = EditorState.create({
      schema: schema,
      selection: editor.selection,
      plugins: [new MultimediaPlugin()],
    });
    const domNode = document.createElement('div');
    editorView = new EditorView(domNode, {
      state,
      dispatchTransaction(transaction) {
        editorView.updateState(editorView.state.apply(transaction));
      },
    });
  });

  afterEach(() => {
    editorView.destroy();
  });

  it('should update node attributes', () => {
    const {tr} = editorView.state;
    const nodeType = schema.nodes.heading;
    const attrs = {active: true, crop: null, rotate: null};
    const node = nodeType.create(attrs);
    const pos = 0;

    tr.insert(pos, node);
    expect(() => editorView.dispatch(tr)).not.toThrow();
  });
});

describe('image resizebox control', () => {
  const imageresizeboxcontrol = new ImageResizeBoxControl({
    boxID: 'boxid',
    config: 'any',
    direction: 'bottom',
    height: 10,
    onResizeEnd: (_w: 1, _height: 1) => undefined,
    width: 10,
    fitToParent: true,
  });

  it('should be defined', () => {
    expect(imageresizeboxcontrol).toBeDefined();
  });

  it('should handle componentWillUnmount ', () => {
    const spy = jest.spyOn(imageresizeboxcontrol, '_end');
    imageresizeboxcontrol.componentWillUnmount();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle render ', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    imageresizeboxcontrol.props = {
      boxID: 'boxid',
      config: 'any',
      direction: 'bottom',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    };
    imageresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    expect(imageresizeboxcontrol.render()).toBeDefined();
  });
  it('should handle _syncSize ', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    imageresizeboxcontrol.props = {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    };
    imageresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    expect(imageresizeboxcontrol._syncSize()).toBeUndefined();
  });

  it('should handle _syncSize branch coverage', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    imageresizeboxcontrol.props = {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    };
    imageresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    imageresizeboxcontrol._active = false;
    expect(imageresizeboxcontrol._syncSize()).toBeUndefined();
  });

  it('should handle _start ', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    imageresizeboxcontrol.props = {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    };
    imageresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    expect(
      imageresizeboxcontrol._start(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          screenX: 100,
          screenY: 100,
          clientX: 50,
          clientY: 50,
        }) as unknown as React.MouseEvent
      )
    ).toBeUndefined();
  });
  it('should handle _onMouseMove   ', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    imageresizeboxcontrol.props = {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    };
    imageresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    imageresizeboxcontrol._onMouseMove(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      })
    );
    expect(imageresizeboxcontrol._x2).toBe(50);
    expect(imageresizeboxcontrol._y2).toBe(50);
  });

  it('should handle _onMouseUp', () => {
    const mockElement = document.createElement('div');
    mockElement.className = 'boxid';
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
    imageresizeboxcontrol.props = {
      boxID: 'boxid',
      config: 'any',
      direction: 'top_right',
      height: 10,
      onResizeEnd: () => undefined,
      width: 10,
      fitToParent: true,
    };
    imageresizeboxcontrol._onMouseDown(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      }) as unknown as React.MouseEvent
    );
    const spy1 = jest.spyOn(imageresizeboxcontrol, '_end');
    imageresizeboxcontrol._onMouseUp(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        screenX: 100,
        screenY: 100,
        clientX: 50,
        clientY: 50,
      })
    );
    expect(spy1).toHaveBeenCalled();
  });
  it('should handle render',()=>{
    const irb = new ImageResizeBox({
      height: 150,
      onResizeEnd: () => undefined,
      src: '',
      width: 180,
      fitToParent: true,
    });
    irb.props = {
      height: 150,
      onResizeEnd: () => undefined,
      src: '',
      width: 180,
      fitToParent: true,
    };
    expect(irb.render()).toBeDefined();
  });
});
