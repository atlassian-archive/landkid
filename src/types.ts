export interface Host {
  createComment(
    pullRequestId: string,
    parentCommentId: string | null,
    message: string,
  ): Promise<string>;
  mergePullRequest(pullRequestId: string): Promise<void>;
  getPullRequest(pullRequestId: string): Promise<PullRequest>;
  getPullRequestBuildStatuses(
    pullRequestId: string,
  ): Promise<Array<BuildStatus>>;
  getPullRequestUrl(pullRequestId: string): string;
}

export interface CI {
  processStatusWebhook(body: any): StatusEvent | null;
  createLandBuild(commit: string): Promise<string | null>;
  stopLandBuild(commit: string): Promise<boolean>;
  getBuildUrl(buildId: string): string;
}

export type HostAdapter = (config: Object) => Host;
export type CIAdapter = (config: Object) => CI;

export type StatusEvent = {
  buildUrl: string;
  buildId: string;
  buildStatus: BuildState;
  passed: boolean;
  failed: boolean;
  stopped: boolean;
};

export type Persona = {
  helpContent: string;
  addedToQueue: string;
  removedFromQueue: string;
  notRemovedFromQueue: string;
  unknownCommand: string;
  error: string;
};

export type PRState = 'OPEN' | 'DECLINED' | 'MERGED';

export type LandRequest = {
  pullRequestId: string;
  pullRequestUrl: string;
  username: string;
  userUuid: string;
  pullRequestState?: PRState;
  commit: string;
  title: string;
  createdTime: Date;
  finishedTime?: Date;

  // These properties exist after a landRequest begins landing
  buildId?: string;
  buildUrl?: string;
  buildStatus?: string;
  landed?: boolean;
};

export type PullRequest = {
  pullRequestId: string;
  title: string;
  description: string;
  createdOn: Date;
  author: string;
  state: PRState;
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

export type HistoryItem = {
  statusEvent: StatusEvent;
  build: LandRequest;
};

export type RunnerState = {
  queue: Array<LandRequest>;
  running: LandRequest;
  waitingToLand?: Array<LandRequest>;
  locked: boolean;
  started: string;
  paused: boolean;
  pausedReason?: string | null;
  history: Array<HistoryItem>;
  usersAllowedToMerge: Array<string>;
};
