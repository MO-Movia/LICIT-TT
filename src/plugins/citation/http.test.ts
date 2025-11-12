import { req, GET, POST, DELETE, PATCH } from './http';

declare let global;

describe('req function', () => {
  const mockXHR = {
    open: jest.fn(),
    setRequestHeader: jest.fn(),
    send: jest.fn(),
    abort: jest.fn(),
    addEventListener: jest.fn((event, callback) => {
      if (event === 'load') {
        callback();
      }
    }),
    status: 200,
    statusText: 'OK',
    responseText: 'Mock response',
    getResponseHeader: jest.fn(() => 'text/html'),
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4,
  };

  beforeAll(() => {
    global.XMLHttpRequest = jest.fn(() => mockXHR);
  });

  afterAll(() => {
    delete global.XMLHttpRequest;
  });

  it('should resolve the promise on successful request', async () => {
    const url = 'https://example.com/api/data';
    const method = 'GET';
    const response = await req({ url, method });
    expect(response).toEqual('Mock response');
  });

  it('should make a GET request', async () => {
    await GET('https://example.com/api/data');
    expect(mockXHR.open).toHaveBeenCalledWith(
      'GET',
      'https://example.com/api/data',
      true
    );
    expect(mockXHR.send).toHaveBeenCalled();
  });

  it('should make a POST request', async () => {
    const url = 'https://example.com/api/data';
    const body = { key: 'value' };
    const type = 'application/json';

    await POST(url, JSON.stringify(body), type);
    expect(mockXHR.open).toHaveBeenCalledWith('POST', url, true);
    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', type);
    expect(mockXHR.send).toHaveBeenCalledWith(JSON.stringify(body));
  });

  it('should make a DELETE request', async () => {
    const url = 'https://example.com/api/data';
    const type = 'application/json';

    await DELETE(url, type);
    expect(mockXHR.open).toHaveBeenCalledWith('DELETE', url, true);
    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', type);
    expect(mockXHR.send).toHaveBeenCalled();
  });

  it('should make a PATCH request', async () => {
    const url = 'https://example.com/api/data';
    const body = { key: 'value' };
    const type = 'application/json';

    await PATCH(url, JSON.stringify(body), type);
    expect(mockXHR.open).toHaveBeenCalledWith('PATCH', url, true);
    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', type);
    expect(mockXHR.send).toHaveBeenCalledWith(JSON.stringify(body));
  });

  it('should reject the promise on request failure', async () => {
    mockXHR.status = 404;
    mockXHR.statusText = 'Not Found';
    mockXHR.responseText = 'Error response';

    const url = 'https://example.com/api/data';
    const method = 'GET';

    let error: Error | undefined;
    try {
      await req({ url, method });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(
      'Request failed: Not Found\n\nError response'
    );
  });

  it('should handle aborted requests', async () => {
    const url = 'https://example.com/api/data';
    const method = 'GET';
    const requestPromise = req({ url, method });
    await expect(requestPromise).rejects.toBeDefined();
  });

  it('should handle network errors', async () => {
    mockXHR.status = 0;
    mockXHR.statusText = '';
    mockXHR.responseText = '';
    const url = 'https://example.com/api/data';
    const method = 'GET';

    let error: unknown;
    try {
      await req({ url, method });
    } catch (e) {
      error = e;
    }
    expect(error).toBeUndefined();
  });

  it('should handle network errors 2', async () => {
    const url = 'https://example.com/api/data';
    const method = 'GET';

    const mockXHR = {
      open: jest.fn(),
      send: jest.fn(),
      addEventListener: jest.fn((event, callback) => {
        if (event === 'error') {
          callback();
        }
      }),
      abort: jest.fn(),
    };

    global.XMLHttpRequest = jest.fn(() => mockXHR);

    try {
      await expect(req({ url, method })).rejects.toThrow('Network error');
    } finally {
      delete global.XMLHttpRequest;
    }
  });
});
