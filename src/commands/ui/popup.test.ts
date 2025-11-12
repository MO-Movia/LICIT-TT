import {PopUp, PopUpProps} from './PopUp';

describe('popup', () => {
  it('should handle render', () => {
    const test = new PopUp({} as unknown as PopUpProps);
    test.props = {viewProps: undefined} as unknown as PopUpProps;
    expect(test.render()).toBeDefined();
  });
  it('should handle _getDetails ', () => {
    const test = new PopUp({} as unknown as PopUpProps);
    test.props = {
      popUpParams: {
        anchor: '',
        autoDismiss: true,
        modal: true,
        onClose: () => {'';},
        position: () => {
          return {};
        },
        IsChildDialog: true,
        popUpId: '',
      },
      viewProps: undefined,
    } as unknown as PopUpProps;
    expect(test._getDetails()).toBeDefined();
  });
  it('should handle _getDetails when autoDismiss === false ', () => {
    const test = new PopUp({} as unknown as PopUpProps);
    test.props = {
      popUpParams: {
        anchor: '',
        autoDismiss: false,
        modal: true,
        onClose: () => {'';},
        position: undefined,
        IsChildDialog: true,
        popUpId: 'test',
      },
      viewProps: undefined,
    } as unknown as PopUpProps;
    expect(test._getDetails()).toBeDefined();
  });
  it('should handle _getDetails when autoDismiss === false and modal false', () => {
    const test = new PopUp({} as unknown as PopUpProps);
    test.props = {
      popUpParams: {
        anchor: '',
        autoDismiss: false,
        modal: false,
        onClose: () => {'';},
        position: undefined,
        IsChildDialog: true,
        popUpId: 'test',
      },
      viewProps: undefined,
    } as unknown as PopUpProps;
    expect(test._getDetails()).toBeDefined();
  });
});
