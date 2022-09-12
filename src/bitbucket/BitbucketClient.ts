import axios from 'axios';
import { Config, MergeOptions } from '../types';
import { Logger } from '../lib/Logger';
import { BitbucketPipelinesAPI, PipelinesVariables } from './BitbucketPipelinesAPI';
import { BitbucketAPI } from './BitbucketAPI';
import { LandRequestStatus } from '../db';
import pLimit from 'p-limit';

// Given a list of approvals, will filter out users own approvals if settings don't allow that
function getRealApprovals(approvals: Array<string>, creator: string, creatorCanApprove: boolean) {
  if (creatorCanApprove) return approvals;
  return approvals.filter((approval) => approval !== creator);
}

export class BitbucketClient {
  public bitbucket = new BitbucketAPI(this.config.repoConfig);
  private pipelines = new BitbucketPipelinesAPI(this.config.repoConfig);

  constructor(private config: Config) {}

  async isAllowedToMerge({
    pullRequestId,
    permissionLevel,
    sourceBranch,
    destinationBranch,
  }: {
    pullRequestId: number;
    permissionLevel: IPermissionMode;
    sourceBranch: string;
    destinationBranch: string;
  }) {
    const [pullRequest, buildStatuses, hasConflicts] = await Promise.all([
      this.bitbucket.getPullRequest(pullRequestId),
      this.bitbucket.getPullRequestBuildStatuses(pullRequestId),
      this.bitbucket.pullRequestHasConflicts(sourceBranch, destinationBranch),
    ]);

    const author = pullRequest.author;
    const approvals = getRealApprovals(
      pullRequest.approvals,
      author,
      this.config.prSettings.canApproveOwnPullRequest,
    );

    const approvalChecks = {
      isOpen: pullRequest.state === 'OPEN',
      isGreen:
        buildStatuses.every((status) => status.state === 'SUCCESSFUL') && buildStatuses.length > 0,
      allTasksClosed: pullRequest.openTasks === 0,
      isApproved: approvals.length >= this.config.prSettings.requiredApprovals,
    };

    const { prSettings } = this.config;
    const MAX_CONCURRENT_CHECKS_LIMIT = 5;
    const limit = pLimit(MAX_CONCURRENT_CHECKS_LIMIT);

    const errors: string[] = [];
    const warnings: string[] = [];

    Logger.info('Pull request approval checks', {
      namespace: 'bitbucket:client:isAllowedToLand',
      pullRequestId,
      approvalChecks,
      requirements: prSettings,
    });

    if (hasConflicts) {
      errors.push('Pull request must not have any conflicts');
    }

    if (prSettings.requireClosedTasks && !approvalChecks.allTasksClosed) {
      errors.push('All tasks must be resolved');
    }

    if (prSettings.requiredApprovals && !approvalChecks.isApproved) {
      errors.push('Must be approved');
    }

    if (prSettings.requireGreenBuild && !approvalChecks.isGreen) {
      errors.push('Must have a successful build');
    }

    if (!approvalChecks.isOpen) {
      errors.push('Pull request is already closed');
    } else {
      const pullRequestInfo = {
        pullRequest,
        buildStatuses,
        approvals,
        permissionLevel,
      };
      const errorsAndWarningsPromises: Promise<void>[] = [];

      if (prSettings.customChecks) {
        prSettings.customChecks.forEach(({ rule }) => {
          errorsAndWarningsPromises.push(
            limit(async () => {
              const passesRule = await rule(pullRequestInfo, { axios, Logger });
              if (typeof passesRule === 'string') errors.push(passesRule);
            }),
          );
        });
      }
      if (prSettings.customWarnings) {
        prSettings.customWarnings.forEach(({ rule }) => {
          errorsAndWarningsPromises.push(
            limit(async () => {
              const passesWarning = await rule(pullRequestInfo, { axios, Logger });
              if (typeof passesWarning === 'string') warnings.push(passesWarning);
            }),
          );
        });
      }

      await Promise.all(errorsAndWarningsPromises);
    }

    return {
      ...approvalChecks,
      errors,
      warnings,
    };
  }

  createLandBuild(requestId: string, commit: string, variables: PipelinesVariables, lockId: Date) {
    return this.pipelines.createLandBuild(requestId, commit, variables, lockId);
  }

  stopLandBuild(buildId: number, lockId?: Date) {
    return this.pipelines.stopLandBuild(buildId, lockId);
  }

  mergePullRequest(landRequestStatus: LandRequestStatus, options?: MergeOptions) {
    return this.bitbucket.mergePullRequest(landRequestStatus, options);
  }

  cancelMergePolling(prId: number) {
    return this.bitbucket.cancelMergePolling(prId);
  }

  processStatusWebhook(body: any): BB.BuildStatusEvent | null {
    return this.pipelines.processStatusWebhook(body);
  }

  async getRepoUuid(): Promise<string> {
    const repo = await this.bitbucket.getRepository();

    return repo.uuid;
  }

  getUser(aaid: string): Promise<ISessionUser> {
    return this.bitbucket.getUser(aaid);
  }
}
