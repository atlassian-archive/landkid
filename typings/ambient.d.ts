declare interface Window {
  wantToMergeClicked: () => void;
  landWhenAbleClicked: () => void;
  cancelButtonClicked: () => void;
}

declare interface ILandRequest {
  id: string;
  pullRequestId: number;
  triggererAaid: string;
  buildId: number | null;
  forCommit: string;
  created: Date;
  pullRequest: IPullRequest;
}

declare interface IPullRequest {
  prId: number;
  authorAaid: string;
  title: string;
}

declare interface IPauseState {
  id: string;
  pauserAaid: string;
  paused: boolean;
  reason: string | null;
  date: Date;
}

declare interface IStatusUpdate {
  id: string;
  date: Date;
  state:
    | 'will-queue-when-ready'
    | 'queued'
    | 'running'
    | 'success'
    | 'fail'
    | 'aborted';
  reason: string | null;
  requestId: string;
  request: ILandRequest;
}

declare interface ISessionUser {
  aaid: string;
  username: string;
  displayName: string;
}

declare type IPermissionMode = 'read' | 'land' | 'admin';

declare interface IPermission {
  aaid: string;
  dateAssigned: Date;
  mode: IPermissionMode;
  assignedByAaid: string;
}

declare namespace Express {
  interface Request {
    user?: ISessionUser;
  }
}
