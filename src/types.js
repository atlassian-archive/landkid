// @flow

export type JSONValue =
  | null
  | string
  | boolean
  | number
  | Array<JSONValue>
  | {
      [key: string]: JSONValue
    };

export type Host = {
  createComment(
    pullRequestId: string,
    parentCommentId: string | null,
    message: string
  ): Promise<mixed>,
  mergePullRequest(pullRequestId: string): Promise<boolean>,
  getPullRequest(pullRequestId: string): Promise<PullRequest>,
  getPullRequestBuildStatuses(
    pullRequestId: string
  ): Promise<Array<BuildStatus>>
};

export type CI = {
  processStatusWebhook(body: JSONValue): StatusEvent | null,
  createLandBuild(commit: string): Promise<mixed>,
  stopLandBuild(commit: string): Promise<mixed>
};

export type HostAdapter = (config: Object) => Host;
export type CIAdapter = (config: Object) => CI;

export type StatusEvent = {
  buildUrl: string,
  buildId: string,
  buildStatus: string,
  passed: boolean,
  failed: boolean
};

export type Persona = {
  helpContent: string,
  addedToQueue: string,
  removedFromQueue: string,
  notRemovedFromQueue: string,
  unknownCommand: string,
  error: string
};

export type LandRequest = {
  pullRequestId: string,
  username: string,
  userUuid: string,
  pullRequestState?: 'OPEN' | 'DECLINED' | 'MERGED',
  commit: string,
  title: string,

  // These properties exist after a landRequest begins landing
  buildId?: string,
  buildStatus?: string,
  landed?: boolean
};

export type PullRequest = {
  pullRequestId: string,
  title: string,
  description: string,
  createdOn: Date,
  author: string,
  state: 'OPEN' | 'MERGED' | 'DECLINED',
  approvals: Array<string>,
  openTasks: number
};

export type BuildStatus = {
  state: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS',
  createdOn: Date,
  url: string
};

export type HostConfig = {
  botUsername: string,
  botPassword: string,
  repoOwner: string,
  repoName: string
};

export type CIConfig = {
  BITBUCKET_USERNAME: string,
  BITBUCKET_PASSWORD: string,
  REPO_OWNER: string,
  REPO_SLUG: string
};

export type PullRequestSettings = {
  requiredApprovals: number,
  requireClosedTasks: boolean,
  requireGreenBuild: boolean,
  canApproveOwnPullRequest: boolean,
  usersAllowedToApprove: Array<string>
};

export type ApprovalChecks = {
  isOpen: boolean,
  isApproved: boolean,
  isGreen: boolean,
  allTasksClosed: boolean
};

export type Config = {
  port: number,
  baseUrl: string,
  // host: 'bitbucket' | 'github',
  host: 'bitbucket',
  // ci: 'bitbucket-pipelines' | 'circle-ci' | 'travis-ci',
  ci: 'bitbucket-pipelines',
  hostConfig: HostConfig,
  ciConfig: CIConfig,
  prSettings: PullRequestSettings
};
