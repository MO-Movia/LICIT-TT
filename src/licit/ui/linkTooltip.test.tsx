/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import LinkTooltip from './linkTooltip';
import type {ReactElement} from 'react';
import { EditorView } from 'prosemirror-view';
import scrollIntoView from 'smooth-scroll-into-view-if-needed';
import sanitizeURL from '../sanitizeURL';
import { CustomButton } from '../../commands';

// ---- Mock dependencies ----
jest.mock('smooth-scroll-into-view-if-needed', () => jest.fn(() => Promise.resolve()));
jest.mock('../sanitizeURL', () => jest.fn((url) => `sanitized:${url}`));
jest.mock('../../commands', () => ({
  CustomButton: jest.fn((props) => ({ type: 'CustomButton', props })),
}));

describe('LinkTooltip (pure Jest tests)', () => {
    let mockProps: {
    href: string;
    editorView: EditorView;
    onCancel: jest.Mock;
    onEdit: jest.Mock;
    onRemove: jest.Mock;
  };
  let instance: LinkTooltip;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProps = {
      href: 'https://example.com',
      editorView: { dom: {} } as unknown as EditorView,
      onCancel: jest.fn(),
      onEdit: jest.fn(),
      onRemove: jest.fn(),
    };
    instance = new LinkTooltip(mockProps);
  });

  function getProps(element: ReactElement): Record<string, unknown> {
    return element.props as Record<string, unknown>;
  }

  function getRenderedButtons(component: LinkTooltip): ReactElement[] {
    const root = component.render();
    const body = getProps(root).children as ReactElement;
    const row = getProps(body).children as ReactElement;
    return getProps(row).children as ReactElement[];
  }

  it('renders href, change, and remove buttons with default open handler', () => {
    const buttons = getRenderedButtons(instance);

    expect(buttons).toHaveLength(3);
    expect(buttons[0].type).toBe(CustomButton);
    expect(getProps(buttons[0]).label).toBe(mockProps.href);
    expect(getProps(buttons[0]).title).toBe(mockProps.href);
    expect(getProps(buttons[0]).onClick).toBe(instance._openLink);
    expect(getProps(buttons[0]).value).toBe(mockProps.href);
    expect(getProps(buttons[1])).toMatchObject({
      label: 'Change',
      onClick: mockProps.onEdit,
      value: mockProps.editorView,
    });
    expect(getProps(buttons[2])).toMatchObject({
      label: 'Remove',
      onClick: mockProps.onRemove,
      value: mockProps.editorView,
    });
  });

  it('uses custom onOpen and editorView value when provided', () => {
    const onOpen = jest.fn();
    instance = new LinkTooltip({...mockProps, onOpen});

    const [openButton] = getRenderedButtons(instance);

    expect(getProps(openButton).onClick).toBe(onOpen);
    expect(getProps(openButton).value).toBe(mockProps.editorView);
  });


  it('should call window.open with sanitized URL for normal links', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    instance._openLink('https://abc.com');

    expect(sanitizeURL).toHaveBeenCalledWith('https://abc.com');
    expect(openSpy).toHaveBeenCalledWith('sanitized:https://abc.com');
    openSpy.mockRestore();
  });

  it('should scroll to element for bookmark links', () => {
    const element = { id: 'target' } as unknown as HTMLElement;
    const getElementByIdSpy = jest
      .spyOn(document, 'getElementById')
      .mockReturnValue(element);

     instance._openLink('#target');

    expect(mockProps.onCancel).toHaveBeenCalledWith(mockProps.editorView);
    expect(scrollIntoView).toHaveBeenCalledWith(element, expect.any(Object));
    getElementByIdSpy.mockRestore();
  });

  it('should do nothing for bookmark links when target element is missing', () => {
    const getElementByIdSpy = jest
      .spyOn(document, 'getElementById')
      .mockReturnValue(null);
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    instance._openLink('#missing');

    expect(mockProps.onCancel).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    getElementByIdSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('should not call anything if href is empty',  () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    instance._openLink('');
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('opens one-character hash links as normal links', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    instance._openLink('#');

    expect(sanitizeURL).toHaveBeenCalledWith('#');
    expect(openSpy).toHaveBeenCalledWith('sanitized:#');
    openSpy.mockRestore();
  });
});
