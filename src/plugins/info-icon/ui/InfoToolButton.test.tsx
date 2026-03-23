/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {InfoToolButton} from './InfoToolButton';

let props: {
  type: 'type';
  title?: 'title';
};
describe('InfoToolButton', () => {
  it('should render the component', () => {
    const wrapper = new InfoToolButton({...props});
    wrapper.props = {
      title: 'title',
    };
    expect(wrapper).toBeDefined();
  });
});
