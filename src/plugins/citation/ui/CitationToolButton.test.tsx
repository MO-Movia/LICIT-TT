import {CitationToolButton} from './CitationToolButton';

describe('CitationToolButton', () => {
  it('should render', () => {
    const props = {
      active: true,
      children: {},
      className: 'class',
      disabled: true,
      id: 'id',
      onClick: () => {return {};},
      onMouseEnter: () => {return {};},
      style: {['']: ''},
      target: 'TARGET',
      title: 'TITLE',
      value: 'value',
      icon: 'icon',
      label: 'label',
    };
    const test = new CitationToolButton(props);
    test.props = props;
    expect(test.render()).toBeDefined();
  });
});
