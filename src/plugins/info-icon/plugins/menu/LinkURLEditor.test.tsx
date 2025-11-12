import {ENTER, LinkURLEditor} from './LinkURLEditor';
import React from 'react';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { schema, builders } from 'prosemirror-test-builder';
import {
  Schema,
} from 'prosemirror-model';

describe('LinkURLEditor', () => {
  let props;
  let props1;
  beforeEach(() => {
    const before = 'hello';
    const after = ' world';
    const mySchema = new Schema({
      nodes: schema.spec.nodes,
      marks: schema.spec.marks
    });
    const { doc, p } = builders(mySchema, { p: { nodeType: 'paragraph' } });
    const state = EditorState.create({
      doc: doc(p(before, '', after)),
    });
    const dom = document.createElement('div');
    props = {
      href: 'http://example.com',

      view: new EditorView(
        { mount: dom },
        {
          state: state,
        }
      ),
      close: jest.fn(),
    };
    props1 = {
      href: '',
      view: {
        state: {},
        dispatch: jest.fn(),
        focus: jest.fn(),
      },
      close: jest.fn(),
    };
  });

it('renders LinkURLEditor',()=>{
  const wrapper = new LinkURLEditor({...props});
  expect(wrapper.render()).toBeDefined();
  const wrapper2 = new LinkURLEditor({...props1});
  expect(wrapper2.render()).toBeDefined();
});

it('should call _cancel()',()=>{
  const wrapper = new LinkURLEditor({...props});
  expect(wrapper._cancel()).toBeUndefined();
});

it('should call _onKeyDown() and apply on ENTER key press', () => {
  const wrapper = new LinkURLEditor({...props});
  const mockEvent = { keyCode: ENTER, preventDefault: jest.fn() } as unknown as KeyboardEvent;
  wrapper._apply = jest.fn();
  wrapper._onKeyDown(mockEvent);
  expect(mockEvent.preventDefault).toHaveBeenCalled();
  expect(wrapper._apply).toHaveBeenCalled();
});

it('should call _onURLChange() and update state with new URL', () => {
  const wrapper = new LinkURLEditor({...props});
  const mockEvent = { target: { value: 'https://example.com' } } as React.ChangeEvent<HTMLInputElement>;
  wrapper.setState = jest.fn();
  wrapper._onURLChange(mockEvent);
  expect(wrapper.setState).toHaveBeenCalledWith({ url: 'https://example.com' });
});

it('should call _apply()', () => {
  const wrapper = new LinkURLEditor({...props});
  expect(wrapper._apply()).toBeDefined();
});
});









