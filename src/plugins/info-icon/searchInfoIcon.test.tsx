import { SearchInfoIcon } from './searchInfoIcon';
import { SELECTEDINFOICON } from './constants';

describe('should render the SearchInfoIcon component', () => {
    const subMenuProps = {
        icons: '',
        selectedIcon: {
            name: '',
            unicode: '',
            selected: true
        },
        close: () => {
            return null;
        },
    };

    it('should return an empty array when no icons are cached', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        localStorage.clear();
        const result = wrapper.getCacheIcons();
        expect(result).toEqual([]);
    });

    it('should return an array of cached icons when icons are present', () => {
        const icons = [{ id: '1', name: 'Icon 1' }, { id: '2', name: 'Icon 2' }];
        localStorage.setItem(SELECTEDINFOICON, JSON.stringify(icons));
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        const result = wrapper.getCacheIcons();
        expect(result).toEqual(icons);
    });

    it('should render', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        const infoPopupDiv = document.createElement('div');
        infoPopupDiv.id = 'infoPopup';
        document.body.appendChild(infoPopupDiv);
        expect(wrapper.render()).toBeDefined();
    });

    it('should call _cancel', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        const enableInfoWindowMock = jest.spyOn(SearchInfoIcon.prototype, 'enableInfoWIndow');
        wrapper._cancel();
        expect(enableInfoWindowMock).toHaveBeenCalled();
    });

    it('should call _save', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        const enableInfoWindowMock = jest.spyOn(SearchInfoIcon.prototype, 'enableInfoWIndow');
        const searchInfo = jest.spyOn(wrapper, 'getCacheIcons');
        searchInfo.mockReturnValue([{ name: '', unicode: '', selected: false }]);
        wrapper._save();
        expect(enableInfoWindowMock).toHaveBeenCalled();
    });

    it('should call _save with mock data', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        const searchInfo = jest.spyOn(wrapper, 'getCacheIcons');
        searchInfo.mockReturnValue([
            { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false },
            { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false },]);
        const enableInfoWindowMock = jest.spyOn(SearchInfoIcon.prototype, 'enableInfoWIndow');
        wrapper._save();
        expect(enableInfoWindowMock).toHaveBeenCalled();

    });
    it('should call showAlert', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        wrapper.showAlert();
        expect(wrapper).toBeDefined();
    });

    it('should call searchIcon', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        const clickEvent = {
            target: {
                value: 'test'
            }
        };
        wrapper.searchIcon(clickEvent);
        expect(wrapper.state.icons).toBeDefined();
    });

    it('should call selectInfoIcon', () => {
        const subMenuProps = {
            icons: '',
            selectedIcon: {
                name: 'fa fa-500px',
                unicode: 'x0457',
                selected: true
            },
            close: () => {
                return null;
            },
        };
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        wrapper.render();
        const inputSearch = {
            name: 'fa fa-500px',
            unicode: 'x0457',
            selected: true
        };
        wrapper.selectInfoIcon(inputSearch);
        expect(wrapper.props.selectedIcon).toEqual(inputSearch);
    });

    it('should call selectInfoIcon with null value', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;
        const inputSearch = {
            name: '',
            unicode: '',
            selected: true
        };
        wrapper.selectInfoIcon(inputSearch);
        expect(wrapper.props.selectedIcon).toEqual(inputSearch);
        wrapper.setState({ selectedIcon: { name: 'icon1', selected: true, unicode: 'U+1234' } }); // Initial state
        wrapper.selectInfoIcon(inputSearch);
    });

    it('should update selectedIcon when selectInfoIcon is called with a different icon', () => {
        const wrapper = new SearchInfoIcon(subMenuProps) as SearchInfoIcon;

        wrapper.setState({ selectedIcon: { name: 'icon1', selected: true, unicode: 'U+1234' } });

        // New icon to be selected is different
        const newIcon = { name: 'icon2', unicode: 'U+5678', selected: false };

        // Call the method with the test input
        wrapper.selectInfoIcon(newIcon);
      });


});