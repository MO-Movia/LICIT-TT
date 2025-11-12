import {InfoIconDialog} from './infoIconDialog';
import {
    Schema,Mark
} from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { schema, builders } from 'prosemirror-test-builder';
import { InfoIconPlugin } from './index';
import {EditorView} from 'prosemirror-view';
import { SyntheticEvent } from 'react';

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
describe('InfoIconDialog ', () => {
    it('should render the InfoIconDialog component', () => {
        const expectedContent = document.createElement('div');
        expectedContent.id = 'content';
        jest.spyOn(document, 'getElementById').mockReturnValue(expectedContent);
        const expectedEditor = document.createElement('div');
        expectedEditor.id = 'editor';
        jest.spyOn(document, 'querySelector').mockReturnValue(expectedEditor);
        const plugin = new InfoIconPlugin();
        const mySchema = new Schema({
            nodes: schema.spec.nodes,
            marks: schema.spec.marks
        });
        const effSchema = plugin.getEffectiveSchema(mySchema);
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
        const newCitationNode = effSchema.node(
            effSchema.nodes.infoicon,
            infoIconObj
        );
        EditorState.create({
            doc: doc(p(before, newCitationNode, after)),
            schema: effSchema,
            plugins: [plugin],
        });
        const wrapper = new InfoIconDialog(infoIconProps);
        wrapper._cancel();
        wrapper._insert();
        expect(wrapper).toBeDefined();
    });

    it('should update the infoIcon state when a different icon is clicked', () => {
         const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        const initialInfoIcon = instance.state.infoIcon;
        const clickedIcon = { unicode: '#12fc3', name: 'fa-facebook'};
        instance.selectInfoIcon(clickedIcon);
        expect(instance.state.infoIcon).toEqual(clickedIcon);
        expect(instance.state.infoIcon).toEqual(initialInfoIcon);
    });

    it('should set the infoIcon state to null when the same icon is clicked', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        const clickedIcon = { unicode: instance.state.infoIcon?.unicode };
        instance.selectInfoIcon(clickedIcon);
        expect(instance.state.infoIcon.unicode).toBe('#12fc3');
    });

    it('should toggle the isOpen state when togglePopover is called', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
    const initialIsOpenState = instance.state.isOpen;
    expect(instance.state.isOpen).toBe(initialIsOpenState);
    });
    it('should call insertButtonEnble and isEditorEmpty set to true', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        const mockJson = { 'type': 'doc', 'content': [{ 'type': 'paragraph', 'content': [{ 'type': 'text', 'text': 'a' }] }, { 'type': 'paragraph', 'content': [{ 'type': 'text', 'text': 'a' }] }] };
        instance.insertButtonEnble(mockJson);
        expect(instance.state.isEditorEmpty).toEqual(false);
    });

    it('should call insertButtonEnble and isEditorEmpty set to false', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        const mockJson = { 'type': 'doc', 'content': [{ 'type': 'paragraph', 'content': [{ 'type': 'text', 'text': 'a' }] }] };
        instance.insertButtonEnble(mockJson);
        expect(instance.state.isEditorEmpty).toEqual(false);
    });

    it('should call insertButtonEnble with null content', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
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
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        instance._onAdd({} as unknown as SyntheticEvent<Element, Event>);
        instance._onRemove();
        expect(instance).toBeDefined();
    });

    it('should call insertButtonEnble and content is undefined', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        const mockJson = { 'type': 'doc', 'content': [{ 'type': 'paragraph', 'content': undefined }] };
        instance.insertButtonEnble(mockJson);
        expect(instance.state.isEditorEmpty).toEqual(false);
    });

    it('should set pointerEvents to "unset" if isEditable is true', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        const infoIconForm = document.createElement('div');
        infoIconForm.id = 'infoPopup';
        infoIconForm.style.setProperty('pointerEvents', 'unset');
        instance.disableInfoWIndow(true);
        expect(infoIconForm.style.pointerEvents).toBe('');
    });

    it('should setVisible value when calling setVisible fn', () => {
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
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
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        expect(instance.state.isOpen).toBe(true);
      });

    it('should call validateInsert method',() => {
        const linkmark = new Mark();
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
        const instance = new InfoIconDialog({...infoIconProps}) as InfoIconDialog;
        expect(instance.validateInsert()).toBeUndefined();
    });
});