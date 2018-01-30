// @flow

export type JSONValue =
  | null
  | string
  | boolean
  | number
  | Array<JSONValue>
  | { [key: string]: JSONValue };

export type Host = {
  createComment(
    pullRequestId: string,
    parentCommentId: string | null,
    message: string
  ): Promise<mixed>,
  isAllowedToLand(landRequest: LandRequest): Promise<boolean>,
  mergePullRequest(pullRequestId: string): Promise<boolean>
};

export type CI = {
  processStatusWebhook(body: JSONValue): StatusEvent | null,
  createLandBuild(commit: string): Promise<mixed>,
  stopLandBuild(commit: string): Promise<mixed>
};

export type HostAdapter = (config: Object) => Promise<Host>;
export type CIAdapter = (config: Object) => Promise<CI>;

export type Env = {
  host: Host,
  ci: CI,
  persona: Persona
};

export type StatusEvent = {
  buildUrl: string,
  buildId: string,
  passed: boolean
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

export type HostConfig = {
  BITBUCKET_USERNAME: string,
  BITBUCKET_PASSWORD: string,
  REPO_OWNER: string,
  REPO_SLUG: string
};

export type CIConfig = {
  BITBUCKET_USERNAME: string,
  BITBUCKET_PASSWORD: string,
  REPO_OWNER: string,
  REPO_SLUG: string
};

export type Config = {
  port: number,
  host: 'bitbucket' | 'github',
  ci: 'bitbucket-pipelines' | 'circle-ci' | 'travis-ci',
  hostConfig: HostConfig,
  ciConfig: CIConfig
};
