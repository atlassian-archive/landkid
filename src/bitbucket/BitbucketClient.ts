import axios from 'axios';
import { Config } from '../types';
import { Logger } from '../lib/Logger';
import { BitbucketPipelinesAPI } from './BitbucketPipelinesAPI';
import { BitbucketAPI } from './BitbucketAPI';
import { LandRequest } from '../db';

// Given a list of approvals, will filter out users own approvals if settings don't allow that
function getRealApprovals(approvals: Array<string>, creator: string, creatorCanApprove: boolean) {
  if (creatorCanApprove) return approvals;
  return approvals.filter(approval => approval !== creator);
}

export class BitbucketClient {
  public bitbucket = new BitbucketAPI(this.config.repoConfig);
  private pipelines = new BitbucketPipelinesAPI(this.config.repoConfig);

  constructor(private config: Config) {}

  async isAllowedToLand(pullRequestId: number, permissionLevel: IPermissionMode) {
    const pullRequest: BB.PullRequest = await this.bitbucket.getPullRequest(pullRequestId);
    const buildStatuses = await this.bitbucket.getPullRequestBuildStatuses(pullRequestId);
    const author = pullRequest.author;
    const approvals = getRealApprovals(
      pullRequest.approvals,
      author,
      this.config.prSettings.canApproveOwnPullRequest,
    );

    const approvalChecks = {
      isOpen: pullRequest.state === 'OPEN',
      isGreen:
        buildStatuses.every(status => status.state === 'SUCCESSFUL') && buildStatuses.length > 0,
      allTasksClosed: pullRequest.openTasks === 0,
      isApproved: approvals.length >= this.config.prSettings.requiredApprovals,
    };

    const { prSettings } = this.config;
    const errors: string[] = [];
    const warnings: string[] = [];

    Logger.info('Pull request approval checks', {
      namespace: 'bitbucket:client:isAllowedToLand',
      pullRequestId,
      approvalChecks,
      requirements: prSettings,
    });

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
    } else {
      const pullRequestInfo = {
        pullRequest,
        buildStatuses,
        approvals,
        permissionLevel,
      };
      if (prSettings.customChecks) {
        for (const { rule } of prSettings.customChecks) {
          const passesRule = await rule(pullRequestInfo, axios);
          if (typeof passesRule === 'string') errors.push(passesRule);
        }
      }
      if (prSettings.customWarnings) {
        for (const { rule } of prSettings.customWarnings) {
          const passesWarning = await rule(pullRequestInfo, axios);
          if (typeof passesWarning === 'string') warnings.push(passesWarning);
        }
      }
    }

    return {
      ...approvalChecks,
      errors,
      warnings,
    };
  }

  createLandBuild(requestId: string, commit: string, depCommits: string) {
    return this.pipelines.createLandBuild(requestId, commit, depCommits);
  }

  async stopLandBuild(buildId: number) {
    return await this.pipelines.stopLandBuild(buildId);
  }

  async mergePullRequest(landRequest: LandRequest) {
    return await this.bitbucket.mergePullRequest(landRequest);
  }

  processStatusWebhook(body: any): BB.BuildStatusEvent | null {
    return this.pipelines.processStatusWebhook(body);
  }

  async getRepoUuid(): Promise<string> {
    const repo = await this.bitbucket.getRepository();

    return repo.uuid;
  }
}
