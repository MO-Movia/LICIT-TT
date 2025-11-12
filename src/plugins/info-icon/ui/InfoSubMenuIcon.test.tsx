import {InfoSubMenuIcon} from './InfoSubMenuIcon';

let props: {
    type: 'type';
    title?: 'title';
};
const DeviceTypeUtilsMock = jest.requireMock('./InfoSubMenuIcon');
it('should render the component', () => {
    const wrapper = new InfoSubMenuIcon ({...props});
    expect(wrapper.render()).toBeDefined();
});
it('mock const `isTablet` to the value `true`', () => {
    DeviceTypeUtilsMock.props = {
        type: 'type',
        title: 'title'
    };
});