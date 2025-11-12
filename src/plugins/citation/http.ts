// A simple wrapper for XHR.
export function req(conf: { url: string; method: string; body?: string; headers?: {[k: string]: string}; }): Promise<string> {
  const req = new XMLHttpRequest();
  let aborted = false;
  const result = new Promise<string>((success, failure) => {
    req.open(conf.method, conf.url, true);
    req.addEventListener('load', () => {
      if (aborted) return;
      if (!aborted) {
        handleResponse(req, success, failure);
      }
    });
    req.addEventListener('error', () => {
      if (!aborted) failure(new Error('Network error'));
    });
    for (const header in conf.headers){
      req.setRequestHeader(header, conf.headers[header]);
    }
    req.send(conf.body ?? null);
  });
  (result as unknown as XMLHttpRequest).abort = () => {
    if (!aborted) {
      req.abort();
      aborted = true;
    }
  };
  return result;
}

function handleResponse(req, success: (value) => void, failure: (reason) => void): void {
  if (req.status < 400) {
    success(req.responseText);
  } else {
    const text = req.responseText;
    const err: {status?: number; message: string} = new Error(
      'Request failed: ' + req.statusText + (text ? '\n\n' + text : '')
    );
    err.status = req.status;

    failure(err);
  }
}

export function GET(url: string) {
  return req({url, method: 'GET'});
}

export function POST(url: string, body: string, type: string) {
  return req({url, method: 'POST', body, headers: {'Content-Type': type}});
}

// [FS] IRAD-1128 2021-02-03
// http DELETE request overrided
export function DELETE(url: string, type: string) {
  return req({url, method: 'DELETE', headers: {'Content-Type': type}});
}

// [FS] IRAD-1128 2021-02-03
// http PATCH request overrided
export function PATCH(url: string, body: string, type: string) {
  return req({url, method: 'PATCH', body, headers: {'Content-Type': type}});
}
