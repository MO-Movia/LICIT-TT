import {SelectionObserver} from './SelectionObserver';

describe('selection observer', () => {
  let selectionobserver = new SelectionObserver(() => undefined);
  selectionobserver._observables = [];
  beforeEach(() => {
    selectionobserver = new SelectionObserver(() => undefined);
  });
  it('should be defined', () => {
    expect(selectionobserver).toBeDefined();
  });

  it('should handle observe', () => {
    selectionobserver._callback = () => undefined;
    const elem = document.createElement('div');
    selectionobserver._observables = [
      {target: elem, selection: 1} as unknown as never,
    ];
    expect(selectionobserver.observe(elem)).toBeUndefined();
  });
  it('should handle observe', () => {
    selectionobserver._callback = () => undefined;
    const elem = document.createElement('div');
    selectionobserver._observables = [
      {target: elem, selection: 1} as unknown as never,
    ];
    const spy = jest.spyOn(globalThis, 'getSelection').mockReturnValue(null);
    expect(selectionobserver.observe(elem)).toBeUndefined();
    spy.mockReset();
  });
  it('should handle observe', () => {
    selectionobserver._callback = () => undefined;
    const elem = document.createElement('div');
    const spy = jest.spyOn(globalThis, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => ({startContainer: elem}),
    } as unknown as Selection);
    expect(selectionobserver.observe(elem)).toBeUndefined();
    spy.mockReset();
  });
  it('should handle _onClick ', () => {
    selectionobserver._callback = () => undefined;
    const elem = document.createElement('div');
    selectionobserver._observables = [
      {target: elem, selection: 1} as unknown as never,
    ];

    expect(selectionobserver._onClick()).toBeUndefined();
  });
  it('should handle _check  ', () => {
    selectionobserver._callback = () => undefined;
    const elem = document.createElement('div');
    selectionobserver._observables = [
      {target: elem, selection: 1} as unknown as never,
    ];

    expect(selectionobserver._check()).toBeUndefined();
  });
  it('should handle _check selection===$selection ', () => {
    selectionobserver._callback = () => undefined;
    const elem = document.createElement('div');
    selectionobserver._observables = [
      {target: elem, selection: {from: 0, to: 0}} as unknown as never,
    ];

    expect(selectionobserver._check()).toBeUndefined();
  });
  it('should handle disconnect', () => {
    selectionobserver._callback = () => undefined;
    const elem = document.createElement('div');
    //elem.addEventListener()
    selectionobserver._observables = [
      {target: elem, selection: {from: 0, to: 0}} as unknown as never,
    ];

    expect(selectionobserver.disconnect()).toBeUndefined();
  });
});
