// @flow

export type JSONValue =
  | null
  | string
  | boolean
  | number
  | Array<JSONValue>
  | { [key: string]: JSONValue };

export type Host = {
  processCommentWebhook(body: JSONValue): CommentEvent,
  createComment(
    pullRequestId: string,
    parentCommentId: string | null,
    message: string
  ): Promise<mixed>,
  pullRequestToCommit(pullRequestId: string): Promise<string>
};

export type CI = {
  processStatusWebhook(body: JSONValue): StatusEvent | null,
  createLandBuild(commit: string): Promise<mixed>,
  isLandBuildRunning(): Promise<boolean>
};

export type HostAdapter = (config: Object) => Promise<Host>;
export type CIAdapter = (config: Object) => Promise<CI>;

export type Env = {
  host: Host,
  ci: CI,
  persona: Persona
};

export type CommentEvent = {
  userId: string,
  pullRequestId: string,
  commentId: string,
  commentBody: string
};

export type StatusEvent = {
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
