import {
  Host,
  CI,
  StatusEvent,
  PullRequestSettings,
  ApprovalChecks,
  BBPullRequest,
} from './types';
import Logger from './Logger';

// Given a list of approvals, will filter out users own approvals if settings don't allow that
function getRealApprovals(
  approvals: Array<string>,
  creator: string,
  creatorCanApprove: boolean,
) {
  if (creatorCanApprove) return approvals;
  return approvals.filter(approval => approval !== creator);
}

// Given a set of checks, returns whether a PR passes all the required checks based on config
function passedPullRequestChecks(
  prSettings: PullRequestSettings,
  approvalData: ApprovalChecks,
) {
  let passed = true;
  if (!approvalData.isOpen || !approvalData.isApproved) {
    passed = false;
  }
  if (prSettings.requireClosedTasks) {
    passed = passed && approvalData.allTasksClosed;
  }
  if (prSettings.requireGreenBuild) {
    passed = passed && approvalData.isGreen;
  }

  return passed;
}

export default class Client {
  hostAdaptor: Host;
  ciAdaptor: CI;
  prSettings: PullRequestSettings;

  constructor(host: Host, ci: CI, settings: PullRequestSettings) {
    this.hostAdaptor = host;
    this.ciAdaptor = ci;
    this.prSettings = settings;
  }

  async isAllowedToLand(pullRequestId: number) {
    const pullRequest: BBPullRequest = await this.hostAdaptor.getPullRequest(
      pullRequestId,
    );
    const buildStatuses = await this.hostAdaptor.getPullRequestBuildStatuses(
      pullRequestId,
    );
    const author = pullRequest.author;
    let approvals = getRealApprovals(
      pullRequest.approvals,
      author,
      this.prSettings.canApproveOwnPullRequest,
    );

    // TODO: add extra check for isApproved against list of users allowed to approve (if configured)
    const approvalChecks = {
      isOpen: pullRequest.state === 'OPEN',
      isGreen:
        buildStatuses.every(status => status.state === 'SUCCESSFUL') &&
        buildStatuses.length > 0,
      allTasksClosed: pullRequest.openTasks === 0,
      isApproved: approvals.length >= this.prSettings.requiredApprovals,
    };

    const isAllowed = passedPullRequestChecks(this.prSettings, approvalChecks);

    Logger.info(
      {
        pullRequestId,
        isAllowed,
        approvalChecks,
        requirements: this.prSettings,
      },
      'isAllowedToLand()',
    );

    return {
      isAllowed,
      ...approvalChecks,
    };
  }

  createLandBuild(commit: string) {
    return this.ciAdaptor.createLandBuild(commit);
  }

  async stopLandBuild(buildId: number) {
    return await this.ciAdaptor.stopLandBuild(buildId);
  }

  async mergePullRequest(pullRequestId: number) {
    return await this.hostAdaptor.mergePullRequest(pullRequestId);
  }

  processStatusWebhook(body: any): StatusEvent | null {
    return this.ciAdaptor.processStatusWebhook(body);
  }

  createBuildUrl(buildId: number): string {
    return this.ciAdaptor.getBuildUrl(buildId);
  }

  createPullRequestUrl(pullRequestId: number): string {
    return this.hostAdaptor.getPullRequestUrl(pullRequestId);
  }
}
