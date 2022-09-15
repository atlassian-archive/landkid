interface BBRequest<T> {
  (opts: {
    url: string;
    type?: string;
    data?: string;
    contentType?: string;
    success: (resp: T) => void;
    error: (err: any) => void;
  }): void;
}

interface Data {
  mergeStrategy?: string;
  success?: (resp: T) => void;
  error?: (err: any) => void;
}

const AP = (window as any).AP as {
  require: (name: 'proxyRequest', fn: <T>(req: BBRequest<T>) => void) => void;
};

export function proxyRequest<T>(url: string, type: string, data?: Data): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const qs = new URLSearchParams(window.location.search);
    const repoId = qs.get('repoId');
    const pullRequestId = qs.get('pullRequestId');
    const contentType = data ? 'application/json' : undefined;

    AP.require('proxyRequest', (req) => {
      req({
        url: `${url}/${repoId}/${pullRequestId}`,
        type,
        data: JSON.stringify(data),
        contentType,
        success: (resp) => resolve(resp as any),
        error: (err) => reject(err),
      });
    });
  });
}

export function proxyRequestBare<T>(url: string, type: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    AP.require('proxyRequest', (req) => {
      req({
        url: url,
        type,
        success: (resp) => resolve(resp as any),
        error: (err) => reject(err),
      });
    });
  });
}
