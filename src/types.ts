export interface Host {
  mergePullRequest(pullRequestId: number): Promise<void>;
  getPullRequest(pullRequestId: number): Promise<BBPullRequest>;
  getPullRequestBuildStatuses(
    pullRequestId: number,
  ): Promise<Array<BuildStatus>>;
  getPullRequestUrl(pullRequestId: number): string;
}

export interface CI {
  processStatusWebhook(body: any): StatusEvent | null;
  createLandBuild(commit: string): Promise<number | null>;
  stopLandBuild(commit: number): Promise<boolean>;
  getBuildUrl(buildId: number): string;
}

export type HostAdapter = (config: Object) => Host;
export type CIAdapter = (config: Object) => CI;

export type StatusEvent = {
  buildId: number;
  buildStatus: BuildState;
};

export type LandRequestOptions = {
  prId: number;
  prAuthorAaid: string;
  prTitle: string;
  triggererAaid: string;
  commit: string;
};

// export type LandRequest = {
//   pullRequestId: string;
//   pullRequestUrl: string;
//   username: string;
//   userUuid: string;
//   pullRequestState?: PRState;
//   commit: string;
//   title: string;
//   createdTime: Date;
//   finishedTime?: Date;

//   // These properties exist after a landRequest begins landing
//   buildId?: string;
//   buildUrl?: string;
//   buildStatus?: string;
//   landed?: boolean;
// };

export type BBPRState = 'OPEN' | 'DECLINED' | 'MERGED';

export type BBPullRequest = {
  pullRequestId: number;
  title: string;
  description: string;
  createdOn: Date;
  author: string;
  state: BBPRState;
  approvals: Array<string>;
  openTasks: number;
};

export type BuildState =
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'INPROGRESS'
  | 'STOPPED'
  | 'DEFAULT'
  | 'PENDING';

export type BuildStatus = {
  state: BuildState;
  createdOn: Date;
  url: string;
};

export type HostConfig = {
  botUsername: string;
  botPassword: string;
  repoOwner: string;
  repoName: string;
  repoUuid?: string;
};

export type CIConfig = {
  BITBUCKET_USERNAME: string;
  BITBUCKET_PASSWORD: string;
  REPO_OWNER: string;
  REPO_SLUG: string;
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
  // host: 'bitbucket' | 'github',
  host: 'bitbucket';
  // ci: 'bitbucket-pipelines' | 'circle-ci' | 'travis-ci',
  ci: 'bitbucket-pipelines';
  hostConfig: HostConfig;
  ciConfig: CIConfig;
  prSettings: PullRequestSettings;
};

// export type HistoryItem = {
//   statusEvent: StatusEvent;
//   build: LandRequest;
// };

export type RunnerState = {
  queue: Array<IStatusUpdate>;
  waitingToQueue: Array<IStatusUpdate>;
  pauseState: IPauseState;
  daysSinceLastFailure: number;
  usersAllowedToLand: Array<string>;
  bitbucketBaseUrl: string;
  // locked: boolean;
  // started: string;
  // paused: boolean;
  // pausedReason?: string | null;
  // history: Array<HistoryItem>;
  // usersAllowedToMerge: Array<string>;
};

export type HistoryItem = {
  request: ILandRequest;
  statusEvents: Array<IStatusUpdate>;
}

export type History = Array<HistoryItem>;
