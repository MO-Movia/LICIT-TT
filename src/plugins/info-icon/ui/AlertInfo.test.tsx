import {AlertInfo} from './AlertInfo';

it('should render the AlertInfo component', () => {
    const alertProps = {
        initialValue: {},
        title: 'string',
        content: 'string',
        close: () => {
            return null;
        },
    };
    const wrapper = new AlertInfo ({...alertProps});
    expect(wrapper).toBeDefined();
});

it('should render the AlertInfo component without title and content', () => {

    const alertProps1 = {
        initialValue: {},
        title: '',
        content: '',
        close: () => {
            return null;
        },
    };
    const wrapper = new AlertInfo({...alertProps1});
    expect(wrapper.render()).toBeDefined();
});