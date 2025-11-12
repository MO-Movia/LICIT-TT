import {InfoToolButton} from './InfoToolButton';

let props: {
    type: 'type';
    title?: 'title';
};
it('should render the component', () => {
    const wrapper = new InfoToolButton ({...props});
    wrapper.props = {
        title: 'title',
    };
    expect(wrapper).toBeDefined();
});