import { PullRequestSettings, ApprovalChecks, Config } from '../types';
import { Logger } from '../lib/Logger';
import { BitbucketPipelinesAPI } from './BitbucketPipelinesAPI';
import { BitbucketAPI } from './BitbucketAPI';

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

export class BitbucketClient {
  private bitbucket = new BitbucketAPI(this.config.repoConfig);
  private pipelines = new BitbucketPipelinesAPI(this.config.repoConfig);

  constructor(private config: Config) {}

  async isAllowedToLand(pullRequestId: number) {
    const pullRequest: BB.PullRequest = await this.bitbucket.getPullRequest(
      pullRequestId,
    );
    const buildStatuses = await this.bitbucket.getPullRequestBuildStatuses(
      pullRequestId,
    );
    const author = pullRequest.author;
    let approvals = getRealApprovals(
      pullRequest.approvals,
      author,
      this.config.prSettings.canApproveOwnPullRequest,
    );

    // TODO: add extra check for isApproved against list of users allowed to approve (if configured)
    const approvalChecks = {
      isOpen: pullRequest.state === 'OPEN',
      isGreen:
        buildStatuses.every(status => status.state === 'SUCCESSFUL') &&
        buildStatuses.length > 0,
      allTasksClosed: pullRequest.openTasks === 0,
      isApproved: approvals.length >= this.config.prSettings.requiredApprovals,
    };

    const isAllowed = passedPullRequestChecks(
      this.config.prSettings,
      approvalChecks,
    );

    Logger.info('isAllowedToLand()', {
      pullRequestId,
      isAllowed,
      approvalChecks,
      requirements: this.config.prSettings,
    });

    return {
      isAllowed,
      ...approvalChecks,
    };
  }

  createLandBuild(commit: string) {
    return this.pipelines.createLandBuild(commit);
  }

  async stopLandBuild(buildId: number) {
    return await this.pipelines.stopLandBuild(buildId);
  }

  async mergePullRequest(pullRequestId: number) {
    return await this.bitbucket.mergePullRequest(pullRequestId);
  }

  processStatusWebhook(body: any): BB.BuildStatusEvent | null {
    return this.pipelines.processStatusWebhook(body);
  }
}
