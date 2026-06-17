/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { SearchInfoIcon } from './searchInfoIcon';
import { SELECTEDINFOICON } from './constants';
import { FONTAWESOMEICONS } from './ui/FaIcon';

const syncSetState = (wrapper: SearchInfoIcon) => {
    wrapper.setState = (
        nextState:
            | Partial<typeof wrapper.state>
            | ((
                prevState: typeof wrapper.state,
                props: typeof wrapper.props
            ) => Partial<typeof wrapper.state>),
        callback?: () => void
    ) => {
        const resolved =
            typeof nextState === 'function'
                ? nextState(wrapper.state, wrapper.props)
                : nextState;
        wrapper.state = { ...wrapper.state, ...resolved };
        callback?.();
    };
};

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
        const wrapper = new SearchInfoIcon(subMenuProps);
        localStorage.clear();
        const result = wrapper.getCacheIcons();
        expect(result).toEqual([]);
    });

    it('should return an array of cached icons when icons are present', () => {
        const icons = [{ id: '1', name: 'Icon 1' }, { id: '2', name: 'Icon 2' }];
        localStorage.setItem(SELECTEDINFOICON, JSON.stringify(icons));
        const wrapper = new SearchInfoIcon(subMenuProps);
        const result = wrapper.getCacheIcons();
        expect(result).toEqual(icons);
    });

    it('should render', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        const infoPopupDiv = document.createElement('div');
        infoPopupDiv.id = 'infoPopup';
        document.body.appendChild(infoPopupDiv);
        expect(wrapper.render()).toBeDefined();
    });

    it('should call _cancel', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        const enableInfoWindowMock = jest.spyOn(SearchInfoIcon.prototype, 'enableInfoWIndow');
        wrapper._cancel();
        expect(enableInfoWindowMock).toHaveBeenCalled();
    });

    it('should call _save', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        const enableInfoWindowMock = jest.spyOn(SearchInfoIcon.prototype, 'enableInfoWIndow');
        const searchInfo = jest.spyOn(wrapper, 'getCacheIcons');
        searchInfo.mockReturnValue([{ name: '', unicode: '', selected: false }]);
        wrapper._save();
        expect(enableInfoWindowMock).toHaveBeenCalled();
    });

    it('should call _save with mock data', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        const searchInfo = jest.spyOn(wrapper, 'getCacheIcons');
        searchInfo.mockReturnValue([
            { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false },
            { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false }, { name: 'fa1', unicode: '123', selected: false },]);
        const enableInfoWindowMock = jest.spyOn(SearchInfoIcon.prototype, 'enableInfoWIndow');
        wrapper._save();
        expect(enableInfoWindowMock).toHaveBeenCalled();

    });
    it('should call showAlert', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        wrapper.showAlert();
        expect(wrapper).toBeDefined();
    });

    it('showAlert clears popup handle when popup closes', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        wrapper.showAlert();
        expect(wrapper._popUp).not.toBeNull();
        wrapper._popUp?.close(undefined);

        expect(wrapper._popUp).toBeNull();
    });

    it('should call searchIcon', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        syncSetState(wrapper);
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
        const wrapper = new SearchInfoIcon(subMenuProps);
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
        const wrapper = new SearchInfoIcon(subMenuProps);
        syncSetState(wrapper);
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
        const wrapper = new SearchInfoIcon(subMenuProps);
        syncSetState(wrapper);
        wrapper.setState({
          selectedIcon: { name: 'icon1', selected: true, unicode: 'U+1234' },
        });

        // New icon to be selected is different
    const newIcon = { name: 'icon2', unicode: 'U+5678', selected: false };

    // Call the method with the test input
    wrapper.selectInfoIcon(newIcon);
    expect(wrapper.state.selectedIcon).toEqual(newIcon);
  });

    it('should use default icons and selected icon when props are empty', () => {
        const wrapper = new SearchInfoIcon({
            icons: null,
            selectedIcon: null,
            close: () => null,
        } as never);

        expect(wrapper.state.icons).toBe(FONTAWESOMEICONS);
        expect(wrapper.state.selectedIcon).toEqual({ name: '', selected: false, unicode: '' });
    });

    it('should enable the info popup when the element exists', () => {
        const wrapper = new SearchInfoIcon(subMenuProps);
        document.body.innerHTML = '';
        const infoPopupDiv = document.createElement('div');
        infoPopupDiv.id = 'infoPopup';
        infoPopupDiv.style.pointerEvents = 'none';
        document.body.appendChild(infoPopupDiv);

        wrapper.enableInfoWIndow();

        expect(infoPopupDiv.style.pointerEvents).not.toBe('none');
    });

    it('save shows duplicate alert and still closes with current state', () => {
        const close = jest.fn();
        const wrapper = new SearchInfoIcon({
            ...subMenuProps,
            close,
            selectedIcon: { name: 'fa-dup', unicode: 'u1', selected: true },
        });
        const showAlertSpy = jest.spyOn(wrapper, 'showAlert').mockImplementation(() => undefined);
        jest.spyOn(wrapper, 'getCacheIcons').mockReturnValue([
            { name: 'fa-dup', unicode: 'u1', selected: false },
        ]);

        wrapper._save();

        expect(showAlertSpy).toHaveBeenCalled();
        expect(close).toHaveBeenCalledWith(wrapper.state);
    });

    it('save trims old cache entries before storing a new icon', () => {
        const close = jest.fn();
        const wrapper = new SearchInfoIcon({
            ...subMenuProps,
            close,
            selectedIcon: { name: 'new-icon', unicode: 'u-new', selected: true },
        });
        const cachedIcons = Array.from({ length: 10 }, (_, index) => ({
            name: `icon-${index}`,
            unicode: `u-${index}`,
            selected: false,
        }));
        jest.spyOn(wrapper, 'getCacheIcons').mockReturnValue(cachedIcons);

        wrapper._save();

        const stored = JSON.parse(localStorage.getItem(SELECTEDINFOICON) || '[]');
        expect(stored).toHaveLength(10);
        expect(stored[0].name).toBe('icon-1');
        expect(stored[9].name).toBe('new-icon');
        expect(close).toHaveBeenCalledWith(wrapper.state);
    });

    it('save appends to cache when there is room', () => {
        const wrapper = new SearchInfoIcon({
            ...subMenuProps,
            selectedIcon: { name: 'fresh-icon', unicode: 'u-fresh', selected: true },
        });
        jest.spyOn(wrapper, 'getCacheIcons').mockReturnValue([
            { name: 'icon-1', unicode: 'u-1', selected: false },
        ]);

        wrapper._save();

        const stored = JSON.parse(localStorage.getItem(SELECTEDINFOICON) || '[]');
        expect(stored).toEqual([
            { name: 'icon-1', unicode: 'u-1', selected: false },
            { name: 'fresh-icon', unicode: 'u-fresh', selected: true },
        ]);
    });

    it('selectInfoIcon clears the selection when the same icon is chosen again', () => {
        const selectedIcon = {
            name: 'fa fa-500px',
            unicode: 'x0457',
            selected: true,
        };
        const wrapper = new SearchInfoIcon({
            ...subMenuProps,
            selectedIcon,
        });
        syncSetState(wrapper);

        wrapper.selectInfoIcon(selectedIcon);

        expect(wrapper.state.selectedIcon).toEqual({ name: '', selected: false, unicode: '' });
    });


});
