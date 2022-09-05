export type Status =
  | 'checking-can-land'
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
