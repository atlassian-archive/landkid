declare module '@atlaskit/pagination';

declare namespace JSX {
  // Declare atlaskit reduced-ui grid components (for QueueItem)
  interface IntrinsicElements {
    'ak-grid': React.DetailedHTMLProps<any, HTMLElement>;
    'ak-grid-column': React.DetailedHTMLProps<any, HTMLElement>;
  }
}

declare namespace Express {
  interface User extends ISessionUser {}
}

declare interface Window {
  landClicked: () => void;
  landWhenAbleClicked: () => void;
}

declare interface ILandRequest {
  id: string;
  pullRequestId: number;
  triggererAaid: string;
  buildId: number | null;
  forCommit: string;
  created: Date;
  pullRequest: IPullRequest;
  dependsOn: string | null;
  priority: number | null;
  impact: number | null;
}

declare interface IPullRequest {
  prId: number;
  authorAaid: string;
  title: string;
  targetBranch: string | null;
}

declare interface IPauseState {
  pauserAaid: string;
  reason: string | null;
  date: Date;
}

declare interface IMessageState {
  senderAaid: string;
  message: string;
  messageType: 'default' | 'warning' | 'error';
  date: Date;
}

declare interface IConcurrentBuildState {
  adminAaid: string;
  maxConcurrentBuilds: number;
  date: Date;
}

declare interface IPriorityBranch {
  id: string;
  adminAaid: string;
  branchName: string;
  date: Date;
}

declare interface IAdminSettings {
  adminAaid?: string;
  mergeBlockingEnabled: boolean;
  speculationEngineEnabled: boolean;
}

declare type IStatusState =
  | 'will-queue-when-ready'
  | 'queued'
  | 'running'
  | 'awaiting-merge'
  | 'merging'
  | 'success'
  | 'fail'
  | 'aborted';

declare interface IStatusUpdate {
  id: string;
  date: Date;
  state: IStatusState;
  reason: string | null;
  requestId: string;
  isLatest: boolean;
  request: ILandRequest;
}

declare interface ISessionUser {
  aaid: string;
  username: string;
  accountId: string;
  displayName: string;
  permission?: IPermissionMode;
}

declare type IPermissionMode = 'read' | 'land' | 'admin';

declare type IMergeStrategy = 'merge-commit' | 'squash';

declare interface IPermission {
  aaid: string;
  dateAssigned: Date;
  mode: IPermissionMode;
  assignedByAaid: string;
}

declare interface IUserNote {
  aaid: string;
  note: string;
  setByAaid: string;
}

declare interface UserState extends IPermission {
  note?: string;
}

declare type HistoryResponse = {
  history: IStatusUpdate[];
  count: number;
  pageLen: number;
};

declare interface ICanLand {
  canLand: boolean;
  canLandWhenAble: boolean;
  errors: string[];
}
