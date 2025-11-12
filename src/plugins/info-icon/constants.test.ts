import { getNode } from './constants';
import { EditorState } from 'prosemirror-state';
import { schema, builders } from 'prosemirror-test-builder';
import {
    Schema,
} from 'prosemirror-model';
import { InfoIconPlugin } from './index';
describe('should work getNode function', () => {

    it('inside getNode func', () => {
        const before = 'hello';
        const after = ' world';
        const mySchema = new Schema({
            nodes: schema.spec.nodes,
            marks: schema.spec.marks
        });
        const info = {
            from: 0,
            to: 9,
            description: 'Test description',
            infoIcon: 'faIcon'
        };
        const { doc, p } = builders(mySchema, { p: { nodeType: 'paragraph' } });
        const plugin = new InfoIconPlugin();
        const effSchema = plugin.getEffectiveSchema(mySchema);
        const newInfoIconNode = effSchema.node(
            effSchema.nodes.infoicon,
            info
        );
        const state = EditorState.create({
            doc: doc(p(before, newInfoIconNode, after)),
            schema: effSchema,
            plugins: [plugin],
        });
        const dom = document.createElement('div');
        document.body.appendChild(dom);

        const { selection } = state;
        let { tr } = state;
        tr = tr.setSelection(selection);
        const res =getNode(1, 2, tr);
        expect(res.textContent).toEqual('hello world');
    });

});