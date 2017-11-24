// @flow

export type JSONValue =
  | null
  | string
  | boolean
  | number
  | Array<JSONValue>
  | { [key: string]: JSONValue };

export type CommandName = 'cancel' | 'help' | 'land';

export type Host = {
  processCommentWebhook(body: JSONValue): CommentEvent;
  createComment(pullRequestId: string, parentCommentId: string | null, message: string): Promise<mixed>;
};

export type CI = {
  processStatusWebhook(body: JSONValue): StatusEvent;
};

export type HostAdapter = (config: {}) => Promise<Host>;
export type CIAdapter = (config: {}) => Promise<CI>;

export type Env = {
  host: Host,
  ci: CI,
};

export type CommentEvent = {
  userId: string,
  pullRequestId: string,
  commentId: string,
  commentBody: string,
};

export type StatusEvent = {
  pullRequestId: string,
  passed: boolean,
  description: string | null,
};
