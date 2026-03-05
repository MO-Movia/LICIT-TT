/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { isValidElement, PureComponent } from 'react';
import type { ReactElement } from 'react';
import { AlertInfo } from './AlertInfo';

function render(props: { title?: string; content?: string } = {}): ReactElement {
  return new AlertInfo({ title: undefined, content: undefined, ...props }).render() as ReactElement;
}

function rootProps(props: { title?: string; content?: string } = {}): Record<string, unknown> {
  return render(props).props as Record<string, unknown>;
}

describe('AlertInfo', () => {

  it('extends React.PureComponent', () => {
    expect(Object.getPrototypeOf(AlertInfo)).toBe(PureComponent);
  });

  it('render() returns a valid React element', () => {
    expect(isValidElement(render())).toBe(true);
  });

  it('root element is a <div> with className "molcit-alert"', () => {
    const el = render();
    expect(el.type).toBe('div');
    expect((el.props as Record<string, unknown>).className).toBe('molcit-alert');
  });

  it('renders two children: <strong> and <span>', () => {
    const children = rootProps().children as ReactElement[];
    expect(children).toHaveLength(2);
    expect(children[0].type).toBe('strong');
    expect(children[1].type).toBe('span');
  });

  it('renders the provided title inside <strong>', () => {
    const children = rootProps({ title: 'My Title' }).children as ReactElement[];
    expect((children[0].props as Record<string, unknown>).children).toBe('My Title');
  });

  it('falls back to "Document Error!" when title is undefined', () => {
    const children = rootProps({ title: undefined }).children as ReactElement[];
    expect((children[0].props as Record<string, unknown>).children).toBe('Document Error!');
  });

  it('falls back to "Document Error!" when title is empty string', () => {
    const children = rootProps({ title: '' }).children as ReactElement[];
    expect((children[0].props as Record<string, unknown>).children).toBe('Document Error!');
  });

  it('renders the provided content inside <span>', () => {
    const children = rootProps({ content: 'All good.' }).children as ReactElement[];
    expect((children[1].props as Record<string, unknown>).children).toBe('All good.');
  });

  it('falls back to default message when content is undefined', () => {
    const children = rootProps({ content: undefined }).children as ReactElement[];
    expect((children[1].props as Record<string, unknown>).children).toBe(
      'Unable to load the document. Have issues in Json format, please verify...'
    );
  });

  it('renders empty string content without falling back (nullish check, not falsy)', () => {
    const children = rootProps({ content: '' }).children as ReactElement[];
    expect((children[1].props as Record<string, unknown>).children).toBe('');
  });

});