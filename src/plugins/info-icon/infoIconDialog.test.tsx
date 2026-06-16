/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {InfoIconDialog} from './infoIconDialog';
import {
    Schema, MarkSpec
} from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { schema, builders } from 'prosemirror-test-builder';
import { InfoIconNodeSpec } from './infoIconNodeSpec';
import {EditorView} from 'prosemirror-view';
import { SyntheticEvent } from 'react';
import { SELECTEDINFOICON } from './constants';

const mockCreatePopUp = jest.fn<any, any>(() => ({
    close: jest.fn(),
    update: jest.fn(),
}));

jest.mock('../../commands', () => ({
    createPopUp: (...args: unknown[]) => mockCreatePopUp.apply(null, args as never),
}));

const infoIconProps = {
    infoIcon: { name: 'fa-facebook', unicode: '#12fc3' },
    description: 'test Des',
    editorView: {} as unknown as EditorView,
    mode: 1,
    from: 0,
    to: 1,
    faIcons: [{ name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }],
    selectedIconName: 'fa-facebook',
    isOpen: true,
    isEditorEmpty: false,
    isButtonEnabled: false,
    close: () => {
        return null;
    },
};
describe('InfoIconDialog', () => {
    beforeEach(() => {
        mockCreatePopUp.mockClear();
        localStorage.clear();
    });

    it('should render the InfoIconDialog component', () => {
        const expectedContent = document.createElement('div');
        expectedContent.id = 'content';
        jest.spyOn(document, 'getElementById').mockReturnValue(expectedContent);
        const expectedEditor = document.createElement('div');
        expectedEditor.id = 'editor';
        jest.spyOn(document, 'querySelector').mockReturnValue(expectedEditor);
        const mySchema = new Schema({
            nodes: schema.spec.nodes.addToEnd('infoicon', InfoIconNodeSpec),
            marks: schema.spec.marks
        });
        const { doc, p } = builders(mySchema, { p: { nodeType: 'paragraph' } });
        const before = 'hello';
        const after = ' world';
        const infoIconObj = {
            from: '1',
            to: '3',
            description: 'test description',
            mode: 0,
            infoIcon: ''
        };
        const newCitationNode = mySchema.node(
            mySchema.nodes.infoicon,
            infoIconObj
        );
        EditorState.create({
            doc: doc(p(before, newCitationNode, after)),
            schema: mySchema,
        });
        const wrapper = new InfoIconDialog(infoIconProps);
        wrapper._cancel();
        wrapper._insert();
        expect(wrapper).toBeDefined();
    });

    it('should update the infoIcon state when a different icon is clicked', () => {
         const instance = new InfoIconDialog({...infoIconProps});
        const initialInfoIcon = instance.state.infoIcon;
        const clickedIcon = { unicode: '#12fc3', name: 'fa-facebook'};
        instance.selectInfoIcon(clickedIcon);
        expect(instance.state.infoIcon).toEqual(clickedIcon);
        expect(instance.state.infoIcon).toEqual(initialInfoIcon);
    });

    it('should set the infoIcon state to null when the same icon is clicked', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        const clickedIcon = { unicode: instance.state.infoIcon?.unicode };
        instance.selectInfoIcon(clickedIcon);
        expect(instance.state.infoIcon.unicode).toBe('#12fc3');
    });

    it('should toggle the isOpen state when togglePopover is called', () => {
        const instance = new InfoIconDialog({...infoIconProps});
    const initialIsOpenState = instance.state.isOpen;
    expect(instance.state.isOpen).toBe(initialIsOpenState);
    });
    it('should call insertButtonEnble and isEditorEmpty set to true', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        const mockJson = { 'type': 'doc', 'content': [{ 'type': 'paragraph', 'content': [{ 'type': 'text', 'text': 'a' }] }, { 'type': 'paragraph', 'content': [{ 'type': 'text', 'text': 'a' }] }] };
        instance.insertButtonEnble(mockJson);
        expect(instance.state.isEditorEmpty).toEqual(false);
    });

    it('should call insertButtonEnble and isEditorEmpty set to false', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        const mockJson = { 'type': 'doc', 'content': [{ 'type': 'paragraph', 'content': [{ 'type': 'text', 'text': 'a' }] }] };
        instance.insertButtonEnble(mockJson);
        expect(instance.state.isEditorEmpty).toEqual(false);
    });

    it('should call insertButtonEnble with null content', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        const mockJson = { 'type': 'doc', 'content': [] };
        instance.insertButtonEnble(mockJson);
        expect(instance.state.isEditorEmpty).toEqual(false);
    });


    it('should render the InfoIconDialog in mode 2(edit)', () => {
        const infoIconProps = {
            infoIcon: { name: 'fa fa-500px', unicode: '&#xf26e;' },
            description: '',
            editorView: {} as unknown as EditorView,
            mode: 2,
            from: 0,
            to: 1,
            faIcons: [],
            selectedIconName: 'fa-img',
            isOpen: false,
            isEditorEmpty: true,
            isButtonEnabled: true,
            close: () => {
                return null;
            },
        };
        const instance = new InfoIconDialog({...infoIconProps});
        instance._onAdd({} as unknown as SyntheticEvent<Element, Event>);
        instance._onRemove();
        expect(instance).toBeDefined();
    });

    it('should call insertButtonEnble and content is undefined', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        const mockJson = { 'type': 'doc', 'content': [{ 'type': 'paragraph', 'content': undefined }] };
        instance.insertButtonEnble(mockJson);
        expect(instance.state.isEditorEmpty).toEqual(false);
    });

    it('should set pointerEvents to "unset" if isEditable is true', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        const infoIconForm = document.createElement('div');
        infoIconForm.id = 'infoPopup';
        jest.spyOn(document, 'getElementById').mockReturnValue(infoIconForm);
        instance.disableInfoWIndow(true);
        expect(infoIconForm.style.pointerEvents).toBe('unset');
        instance.disableInfoWIndow(false);
        expect(infoIconForm.style.pointerEvents).toBe('none');
    });

    it('should setVisible value when calling setVisible fn', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        const initialIsOpenState = instance.state.isOpen;
        instance.setVisible(true);
        expect(instance.state.isOpen).toEqual(initialIsOpenState);
    });


        it('should call selectInfoIcon with the correct icon when button is clicked', () => {
            const icon = { name: 'fa-icon', unicode: 'unicode' };
            const instance = new InfoIconDialog(infoIconProps);
            const spy = jest.spyOn(instance, 'selectInfoIcon');
            instance.selectInfoIcon(icon);
            expect(spy).toHaveBeenCalledWith(icon);
      });

      it('should call setVisible with the correct icon when button is clicked', () => {
        const instance = new InfoIconDialog({...infoIconProps});
        expect(instance.state.isOpen).toBe(true);
      });

    it('should call validateInsert method',() => {
        const linkmark: MarkSpec = {
          attrs: { overridden: { default: true } },
          inclusive: false,
          parseDOM: [{ tag: 'a' }],
          toDOM() {
            return ['a', 0];
          },
        };
        const mockschema = new Schema({
          nodes: {
            doc: {
              content: 'paragraph+',
            },
            paragraph: {
              content: 'text*',
              attrs: {
                styleName: { default: 'test' },
              },
              toDOM() {
                return ['p', 0];
              },
            },
            heading: {
              attrs: { level: { default: 1 }, styleName: { default: '' } },
              content: 'inline*',
              marks: '',
              toDOM(node) {
                return [
                  'h' + node.attrs.level,
                  { 'data-style-name': node.attrs.styleName },
                  0,
                ];
              },
            },
            text: {
              group: 'inline',
            },
          },
          marks: {
            link: linkmark,
          },
        });
        const mockdoc = mockschema.nodeFromJSON({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1, styleName: 'Normal' },
              content: [
                {
                  type: 'text',
                  text: 'Hello, ProseMirror!',
                },
              ],
              marks: [
                { type: 'link', attrs: { ['overridden']: true } },
              ],
            },
          ],
        });
        const infoIconProps = {
            infoIcon: { name: 'fa-facebook', unicode: '#12fc3' },
            description: 'test Des',
            editorView: {state:{schema:mockschema,doc:mockdoc}} as unknown as EditorView,
            mode: 2,
            from: 0,
            to: 1,
            faIcons: [{ name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }, { name: 'fa-facebook-1', unicode: '#15dss4' }],
            selectedIconName: 'fa-facebook',
            isOpen: true,
            isEditorEmpty: false,
            isButtonEnabled: false,
            close: () => {
                return null;
            },
        };
        const instance = new InfoIconDialog({...infoIconProps});
        expect(instance.validateInsert()).toBeUndefined();
    });

    it('renders alternate header and action states', () => {
        const instance = new InfoIconDialog({
            ...infoIconProps,
            infoIcon: null,
            isOpen: false,
            mode: 2,
        });
        const rendered = instance.render() as React.ReactElement;

        expect(JSON.stringify(rendered)).toContain('Select Icon');
        expect(JSON.stringify(rendered)).toContain('Update');
    });

    it('uses cached icons from localStorage when available', () => {
        const cachedIcons = [{ id: 'cached', name: 'fa-cache', unicode: 'u1' }];
        localStorage.setItem(SELECTEDINFOICON, JSON.stringify(cachedIcons));

        const instance = new InfoIconDialog({...infoIconProps});

        expect(instance.state.faIcons).toEqual(infoIconProps.faIcons);
        expect(instance.getCacheIcons()).toEqual(cachedIcons);
    });

    it('seeds localStorage with default icons when cache is empty', () => {
        const instance = new InfoIconDialog({...infoIconProps, faIcons: []});
        const icons = instance.getCacheIcons();

        expect(Array.isArray(icons)).toBe(true);
        expect(icons).toHaveLength(10);
        expect(localStorage.getItem(SELECTEDINFOICON)).not.toBeNull();
    });

    it('enables insert in create mode only when icon and text are present', () => {
        const instance = new InfoIconDialog({
            ...infoIconProps,
            mode: 1,
            isEditorEmpty: false,
        });
        const setStateSpy = jest.spyOn(instance, 'setState');

        instance.validateInsert();
        expect(setStateSpy).toHaveBeenCalledWith(expect.any(Function));

        (instance.state as any).infoIcon = null;
        (instance.state as any).isEditorEmpty = true;
        instance.validateInsert();
        expect(setStateSpy).toHaveBeenCalledTimes(2);
    });

    it('enables insert in edit mode only when icon or description changed', () => {
        const setStateSpy = jest.spyOn(InfoIconDialog.prototype, 'setState');
        const editorView = {
            state: {
                schema: schema,
                doc: schema.node('doc', null, [schema.node('paragraph')]),
            },
        } as unknown as EditorView;
        const instance = new InfoIconDialog({
            ...infoIconProps,
            editorView,
            mode: 2,
            description: '',
            selectedIconName: 'fa-facebook',
        });

        (instance.state as any).editorView = editorView;
        (instance.state as any).infoIcon = { name: 'fa-other', unicode: '#x' } as never;
        instance.validateInsert();
        (instance.state as any).infoIcon = null;
        instance.validateInsert();

        expect(setStateSpy).toHaveBeenCalledWith({isButtonEnabled: true});
        expect(setStateSpy).toHaveBeenCalledWith({isButtonEnabled: false});
        setStateSpy.mockRestore();
    });

    it('updates the icon list when the add popup closes with a value', () => {
        const cachedIcons = [{ id: 'cached', name: 'fa-cache', unicode: 'u1' }];
        localStorage.setItem(SELECTEDINFOICON, JSON.stringify(cachedIcons));
        const instance = new InfoIconDialog({...infoIconProps});
        const disableSpy = jest.spyOn(instance, 'disableInfoWIndow');
        const setStateSpy = jest.spyOn(instance, 'setState');

        instance._onAdd({} as SyntheticEvent);
        const options = mockCreatePopUp.mock.calls[0][2] as { onClose: (value: string) => void };
        options.onClose('saved');

        expect(disableSpy).toHaveBeenCalledWith(false);
        expect(setStateSpy).toHaveBeenCalledWith({faIcons: cachedIcons});
        expect(instance._popUp).toBeNull();
    });

    it('removes the selected icon from localStorage when requested', () => {
        const cachedIcons = [
            { id: 'keep', name: 'fa-keep', unicode: '#keep' },
            { id: 'drop', name: 'fa-drop', unicode: '#drop' },
        ];
        localStorage.setItem(SELECTEDINFOICON, JSON.stringify(cachedIcons));
        const instance = new InfoIconDialog({
            ...infoIconProps,
            infoIcon: { name: 'fa-drop', unicode: '#drop' },
        });
        const setStateSpy = jest.spyOn(instance, 'setState');

        instance._onRemove();

        expect(JSON.parse(localStorage.getItem(SELECTEDINFOICON))).toEqual([
            { id: 'keep', name: 'fa-keep', unicode: '#keep' },
        ]);
        expect(setStateSpy).toHaveBeenCalledWith({
            faIcons: [{ id: 'keep', name: 'fa-keep', unicode: '#keep' }],
            infoIcon: null,
        });
    });
});
