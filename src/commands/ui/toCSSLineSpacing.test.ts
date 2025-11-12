import {toCSSLineSpacing,getLineSpacingValue} from './toCSSLineSpacing';

describe('toCSSLineSpacing', () => {
  it('should convert numeric line spacing value to percentage', () => {
    expect(toCSSLineSpacing('1.1')).toBe('110%');
  });

  it('should normalize incorrect line spacing values', () => {
    expect(toCSSLineSpacing('10px')).toBe('10px');
    expect(toCSSLineSpacing('15px')).toBe('15px');
    expect(toCSSLineSpacing('20px')).toBe('20px');
  });

  it('should normalize incorrect line spacing values', () => {
    expect(toCSSLineSpacing('100%')).toBe('125%');
    expect(toCSSLineSpacing('115%')).toBe('138%');
    expect(toCSSLineSpacing('150%')).toBe('165%');
    expect(toCSSLineSpacing('200%')).toBe('232%');
  });

  it('should return the corresponding line spacing value', () => {
    expect(getLineSpacingValue('Single')).toBe('125%');
    expect(getLineSpacingValue('1.15')).toBe('138%');
    expect(getLineSpacingValue('1.5')).toBe('165%');
    expect(getLineSpacingValue('Double')).toBe('232%');
  });

  it('should return the default line spacing value if no match is found', () => {
    expect(getLineSpacingValue('InvalidValue')).toBe('125%');
  });

  it('should return an empty string if source is empty', () => {
    expect(toCSSLineSpacing('')).toBe('');
  });
});
