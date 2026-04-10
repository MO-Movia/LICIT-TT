/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock(
  'html2canvas',
  () => {
    return jest.fn().mockResolvedValue(null);
  },
  {virtual: true}
);

describe('Export PDF Plugin (mocked)', () => {
  it('html2canvas mock resolves', async () => {
    const html2canvas = jest.requireMock('html2canvas');
    const result = await html2canvas('div');
    expect(result).toBeNull();
  });
});
