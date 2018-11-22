import { Config } from '../types';
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

export class BitbucketClient {
  public bitbucket = new BitbucketAPI(this.config.repoConfig);
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

    const approvalChecks = {
      isOpen: pullRequest.state === 'OPEN',
      isGreen:
        buildStatuses.every(status => status.state === 'SUCCESSFUL') &&
        buildStatuses.length > 0,
      allTasksClosed: pullRequest.openTasks === 0,
      isApproved: approvals.length >= this.config.prSettings.requiredApprovals,
    };

    Logger.info('isAllowedToLand()', {
      pullRequestId,
      approvalChecks,
      requirements: this.config.prSettings,
    });

    const { prSettings } = this.config;
    const errors: string[] = [];

    if (prSettings.requireClosedTasks && !approvalChecks.allTasksClosed) {
      errors.push(
        'Pull Request needs all tasks completed (you might need to open and reclose them!)',
      );
    }

    if (prSettings.requiredApprovals && !approvalChecks.isApproved) {
      errors.push('Pull request needs to be approved');
    }

    if (prSettings.requireGreenBuild && !approvalChecks.isGreen) {
      errors.push('Pull Request needs a green build');
    }

    if (!approvalChecks.isOpen) {
      errors.push('PR is already closed!');
    }
    return {
      ...approvalChecks,
      errors,
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

  async getRepoUuid(): Promise<string> {
    const repo = await this.bitbucket.getRepository();

    return repo.uuid;
  }
}
