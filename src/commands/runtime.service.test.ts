import {RuntimeService, setRuntime} from './runtime.service';

describe('RuntimeService', () => {
  beforeEach(() => {
    RuntimeService.Runtime = null;
  });

  test('should set runtime correctly using setRuntime function', () => {
    const runtimeMock = {name: 'TestRuntime'};
    setRuntime(runtimeMock);
    expect(RuntimeService.Runtime).toBe(runtimeMock);
  });

  test('should get runtime correctly after setting it', () => {
    const runtimeMock = {name: 'AnotherRuntime'};

    RuntimeService.Runtime = runtimeMock;

    expect(RuntimeService.Runtime).toBe(runtimeMock);
  });

  test('should return null initially if runtime is not set', () => {
    expect(RuntimeService.Runtime).toBeNull();
  });
});
