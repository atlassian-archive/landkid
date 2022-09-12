export type Status =
  | 'cannot-land'
  | 'queued'
  | 'running'
  | 'will-queue-when-ready'
  | 'can-land'
  | 'awaiting-merge'
  | 'merging'
  | 'pr-closed'
  | 'user-denied-access'
  | 'unknown-error';

export type LoadingMode = 'land' | 'land-when-able';
export type LoadStatus = 'loaded' | 'not-loaded' | 'loading' | 'refreshing';
