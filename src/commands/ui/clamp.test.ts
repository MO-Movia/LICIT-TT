import {clamp} from './clamp';

describe('clamp', () => {
  it('should clamp on max', () => {
    expect(clamp(-10, 100, 10)).toBe(10);
  });
  it('should clamp on min', () => {
    expect(clamp(-10, -100, 10)).toBe(-10);
  });
  it('should not clamp in range', () => {
    expect(clamp(-10, 2, 10)).toBe(2);
  });
});
