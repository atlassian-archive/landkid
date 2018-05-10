// @flow
import type {
  Host,
  CI,
  JSONValue,
  LandRequest,
  Persona,
  StatusEvent
} from './types';

export default class Client {
  hostAdaptor: Host;
  ciAdaptor: CI;
  persona: Persona;

  constructor(host: Host, ci: CI, persona: Persona) {
    this.hostAdaptor = host;
    this.ciAdaptor = ci;
    this.persona = persona;
  }

  async isAllowedToLand(pullRequestId: string) {
    return await this.hostAdaptor.isAllowedToLand(pullRequestId);
  }

  async createLandBuild(commit: string): Promise<string> {
    return await this.ciAdaptor.createLandBuild(commit);
  }

  async stopLandBuild(buildId: string) {
    return await this.ciAdaptor.stopLandBuild(buildId);
  }

  async mergePullRequest(pullRequestId: string) {
    return await this.hostAdaptor.mergePullRequest(pullRequestId);
  }

  processStatusWebhook(body: JSONValue): StatusEvent | null {
    return this.ciAdaptor.processStatusWebhook(body);
  }

  async createComment(
    pullRequestId: string,
    parentCommentId: string,
    message: string
  ) {
    await this.hostAdaptor.createComment(
      pullRequestId,
      parentCommentId,
      message
    );
  }
}
