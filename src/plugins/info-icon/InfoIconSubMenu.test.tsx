import { InfoIconSubMenu } from './InfoIconSubMenu';
import {EditorView} from 'prosemirror-view';

function myVoidFunction(): void {
    // Function body
    // This function doesn't return any value
}
describe('InfoIconSubMenu', () => {
    it('should render the InfoIconSubMenu component', () => {
        const subMenuProps = {
            editorView: {} as unknown as EditorView,
            onEdit: myVoidFunction,
            onRemove: myVoidFunction,
            onMouseOut: myVoidFunction
        };
        const wrapper = new InfoIconSubMenu ({...subMenuProps});
        expect(wrapper).toBeDefined();
    });
});