// @flow
import type {
  Host,
  CI,
  JSONValue,
  LandRequest,
  Persona,
  StatusEvent,
  Settings,
  PullRequest,
  BuildStatus
} from './types';
import Logger from './Logger';

export default class Client {
  hostAdaptor: Host;
  ciAdaptor: CI;
  persona: Persona;
  serverSettings: Settings;

  constructor(host: Host, ci: CI, persona: Persona, settings: Settings) {
    this.hostAdaptor = host;
    this.ciAdaptor = ci;
    this.persona = persona;
    this.serverSettings = settings;
  }

  async isAllowedToLand(pullRequestId: string) {
    const pullRequest: PullRequest = await this.hostAdaptor.getPullRequest(
      pullRequestId
    );
    const buildStatuses = await this.hostAdaptor.getPullRequestBuildStatuses(
      pullRequestId
    );

    const isOpen = pullRequest.state === 'OPEN';
    const createdBy = pullRequest.author;
    const isApproved = pullRequest.approvals.some(
      approval => approval !== createdBy
    );
    const isGreen = buildStatuses.every(
      buildStatus => buildStatus.state === 'SUCCESSFUL'
    );
    const allTasksClosed = pullRequest.openTasks === 0;
    Logger.info(
      {
        pullRequestId,
        isOpen,
        isApproved,
        isGreen,
        allTasksClosed
      },
      'isAllowedToLand()'
    );
    console.log('this.serverSettings', this.serverSettings);

    let isAllowed = isOpen; // if a PR is closed, it's automatically unable to be merged
    if (this.serverSettings.requireApproval) {
      isAllowed = isAllowed && isApproved;
    }
    if (this.serverSettings.requireClosedTasks) {
      isAllowed = isAllowed && allTasksClosed;
    }
    if (this.serverSettings.requireGreenBuild) {
      isAllowed = isAllowed && isGreen;
    }

    Logger.info(
      {
        isAllowed
      },
      'isAllowed'
    );
    return {
      isAllowed,
      isOpen,
      isApproved,
      isGreen,
      allTasksClosed
    };
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
