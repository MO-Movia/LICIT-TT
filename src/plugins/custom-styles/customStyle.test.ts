/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorView } from 'prosemirror-view';
import {
  isPreviousLevelExists,
  setStyles,
  isStylesLoaded,
  hasStyleRuntime,
  getCustomStyle,
  getCustomStyleByName,
  saveStyle,
  setStyleRuntime,
  renameStyle,
  removeStyle,
  addStyleToList,
  setView,
  saveStyleSet
} from './customStyle';
import type { Style } from './StyleRuntime';

describe('customstyle', () => {
  it('should handle isPreviousLevelExists', () => {
    setStyles([{ styleName: '', styles: { styleLevel: 2 } }]);
    expect(isPreviousLevelExists(2)).toBeTruthy();
  });
  it('should handle isPreviousLevelExists when customStyles.length=0', () => {
    setStyles([]);
    expect(isPreviousLevelExists(2)).toBeTruthy();
  });
  it('should handle isPreviousLevelExists when customStyles does not have styles', () => {
    setStyles([{ styleName: '' }]);
    expect(isPreviousLevelExists(2)).toBeFalsy();
  });
  it('should handle isStylesLoaded', () => {
    const test = isStylesLoaded();
    expect(test).toBeDefined();
  });
  it('should handle isStylesLoaded (case 2)', () => {
    const test = hasStyleRuntime();
    expect(test).toBeFalsy();
  });
  it('should handle getCustomStyle', () => {
    const cstyle = {
      strong: {},
      boldPartial: true,
      em: null,
      strike: null,
      textAlign: {},
      underline: null,
    };
    const test = getCustomStyle(cstyle);
    expect(test).toBeDefined();
  });
  it('should map paragraph margin properties in getCustomStyle', () => {
    const cstyle = {
      marginTop: '0pt',
      marginBottom: '0pt',
      marginLeft: '1pt',
      marginRight: '2pt',
    };
    const test = getCustomStyle(cstyle) as {
      marginTop?: string;
      marginBottom?: string;
      marginLeft?: string;
      marginRight?: string;
    };
    expect(test.marginTop).toBe('0pt');
    expect(test.marginBottom).toBe('0pt');
    expect(test.marginLeft).toBe('1pt');
    expect(test.marginRight).toBe('2pt');
  });
  it('should handle saveStyle', () => {
    setStyleRuntime({
      saveStyle: () => {
        return null;
      },
    });
    expect(saveStyle({} as unknown as Style)).toBeDefined();
  });
  it('should handle saveStyle (case 2)', () => {
    setStyleRuntime({
      renameStyle: () => {
        return null;
      },
    });
    expect(renameStyle('old', 'new')).toBeDefined();
  });
  it('should handle saveStyle (case 3)', () => {
    setStyleRuntime({
      removeStyle: () => {
        return null;
      },
    });
    expect(removeStyle('newStyle')).toBeDefined();
  });
  it('should handle saveStyleSet', () => {
    setStyleRuntime({
      saveStyleSet: () => {
        return null;
      },
    });
    expect(saveStyleSet([{ styleName: 'Heading11', description: 'Bold heading' }])).toBeDefined();
  });

  it('should handle addStyleToList', () => {
    setStyleRuntime({
      removeStyle: () => {
        return null;
      },
    });
    expect(addStyleToList({} as unknown as Style)).toBeDefined();
  });
  it('should handle setStyles', () => {
    setView({
      dispatch: () => { },
      state: { tr: { scrollIntoView: () => { } } },
    } as unknown as EditorView);
    expect(
      setStyles([
        { styleName: 'Normal', docType: 'asd', styles: { strong: true, styleLevel: 2 } },
      ])
    ).toBeUndefined();
  });

  it('should not fallback unknown style names to Normal style defaults', () => {
    setStyles([
      {
        styleName: 'Normal',
        docType: 'asd',
        styles: { paragraphSpacingAfter: '3' },
      },
    ]);

    const style = getCustomStyleByName('CellHeading');
    expect(style.styleName).toBe('CellHeading');
    expect(style.styles).toEqual({});
  });
});
