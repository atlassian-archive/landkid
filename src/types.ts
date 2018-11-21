export type LandRequestOptions = {
  prId: number;
  prAuthorAaid: string;
  prTitle: string;
  triggererAaid: string;
  commit: string;
};

export type RepoConfig = {
  botUsername: string;
  botPassword: string;
  repoOwner: string;
  repoName: string;
  repoUuid: string;
};

export type PullRequestSettings = {
  requiredApprovals: number;
  requireClosedTasks: boolean;
  requireGreenBuild: boolean;
  canApproveOwnPullRequest: boolean;
  usersAllowedToApprove: Array<string>;
  allowLandWhenAble: boolean;
};

export type ApprovalChecks = {
  isOpen: boolean;
  isApproved: boolean;
  isGreen: boolean;
  allTasksClosed: boolean;
};

export type Config = {
  port: number;
  baseUrl: string;
  repoConfig: RepoConfig;
  prSettings: PullRequestSettings;
};

export type RunnerState = {
  queue: Array<IStatusUpdate>;
  waitingToQueue: Array<IStatusUpdate>;
  pauseState: IPauseState;
  daysSinceLastFailure: number;
  usersAllowedToLand: Array<string>;
  bitbucketBaseUrl: string;
};

export type HistoryItem = {
  request: ILandRequest;
  statusEvents: Array<IStatusUpdate>;
};

export type History = Array<HistoryItem>;
