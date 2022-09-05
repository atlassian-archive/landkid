interface BBRequest<T> {
  (opts: {
    url: string;
    type?: string;
    success: (resp: T) => void;
    error: (err: any) => void;
  }): void;
}

const AP = (window as any).AP as {
  require: (name: 'proxyRequest', fn: <T>(req: BBRequest<T>) => void) => void;
};

export function proxyRequest<T>(url: string, type: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const qs = new URLSearchParams(window.location.search);
    const repoId = qs.get('repoId');
    const pullRequestId = qs.get('pullRequestId');

    AP.require('proxyRequest', (req) => {
      req({
        url: `${url}/${repoId}/${pullRequestId}`,
        type,
        success: (resp) => resolve(resp as any),
        error: (err) => reject(err),
      });
    });
  });
}
