import axios, { AxiosResponse } from 'axios';
import { fromMethodAndUrl } from 'atlassian-jwt';

import { MergeOptions, RepoConfig } from '../types';
import { Logger } from '../lib/Logger';
import { bitbucketAuthenticator } from './BitbucketAuthenticator';
import { LandRequestStatus } from '../db';
import { BitbucketMerger } from './BitbucketMerger';

const BBAPIBaseUrl = 'https://api.bitbucket.org/2.0/repositories';

type Reason = {
  error: {
    fields?: {
      merge_checks?: string[];
    };
    message?: string;
  };
};

type MergePullRequestResult = {
  status: string;
  reason?: Reason;
};

// Wait 15 seconds before retrying a merge
const MergeFailureTimeoutMs = 15000;

export class BitbucketAPI {
  private baseUrl = `${BBAPIBaseUrl}/${this.config.repoOwner}/${this.config.repoName}`;
  private bitbucketMerger = new BitbucketMerger(this.baseUrl);

  static readonly SUCCESS = 'success';
  static readonly FAILED = 'failed';
  static readonly ABORTED = 'aborted';
  static readonly TIMEOUT = 'timeout';

  constructor(private config: RepoConfig) {}

  mergePullRequest = async (
    landRequestStatus: LandRequestStatus,
    options: MergeOptions = {},
  ): Promise<MergePullRequestResult> => {
    const {
      id: landRequestId,
      request: {
        pullRequestId,
        pullRequest: { targetBranch },
      },
    } = landRequestStatus;
    let message = `pull request #${pullRequestId} merged by Landkid after a successful build rebased on ${targetBranch}`;
    if (options.skipCI) {
      message += '\n\n[skip ci]';
    }

    const onMergeSuccess = () => {
      Logger.info('Merged Pull Request', {
        namespace: 'bitbucket:api:mergePullRequest:onMergeSuccess',
        landRequestId,
        landRequestStatus,
        pullRequestId,
      });
      return { status: BitbucketAPI.SUCCESS };
    };

    const onMergeFailure = async ({ status, statusText, headers, data }: AxiosResponse) => {
      Logger.error('Unable to merge pull request', {
        namespace: 'bitbucket:api:mergePullRequest:onMergeFailure',
        response: {
          statusCode: status,
          statusText,
          headers,
          data,
        },
        pullRequestId,
        landRequestId,
        landRequestStatus,
        numRetries: options.numRetries,
      });
      // Retry merge on failure if numRetries is passed
      if (options.numRetries && options.numRetries > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, MergeFailureTimeoutMs);
        });
        return this.mergePullRequest(landRequestStatus, {
          ...options,
          numRetries: options.numRetries - 1,
        });
      }
      return { status: BitbucketAPI.FAILED, reason: data };
    };

    const onMergeAbort = () => {
      Logger.info('Aborted PR merging', {
        namespace: 'bitbucket:api:mergePullRequest:onMergeAbort',
        pullRequestId,
        landRequestId,
        landRequestStatus,
      });
      return { status: BitbucketAPI.ABORTED };
    };

    const onMergeTimeout = () => {
      Logger.info('PR merge polling exceeded max attempts', {
        namespace: 'bitbucket:api:mergePullRequest:onMergeTimeout',
        pullRequestId,
        landRequestId,
        landRequestStatus,
      });
      return { status: BitbucketAPI.TIMEOUT };
    };

    Logger.info('Attempting to merge pull request', {
      namespace: 'bitbucket:api:mergePullRequest',
      pullRequestId,
      landRequestId,
      targetBranch,
      landRequestStatus,
      commitMessage: message,
    });

    const { status, statusText, headers, data } = await this.bitbucketMerger.attemptMerge(
      pullRequestId,
      message,
      options.mergeStrategy,
    );

    if (status === 200) {
      return onMergeSuccess();
    }

    if (status === 202) {
      Logger.info('Received timeout response, starting merge task polling', {
        pollUrl: headers.location,
        namespace: 'bitbucket:api:mergePullRequest:mergePullRequest',
        response: {
          statusCode: status,
          statusText,
          headers,
          data,
        },
        pullRequestId,
        landRequestId,
        landRequestStatus,
      });
      const pollResult = await this.bitbucketMerger.triggerMergePolling(
        pullRequestId,
        headers.location,
      );

      if (pollResult.task_status === 'SUCCESS') {
        return onMergeSuccess();
      } else if (pollResult.task_status === 'FAILED') {
        return onMergeFailure(pollResult.response);
      } else if (pollResult.task_status === 'ABORTED') {
        return onMergeAbort();
      } else {
        return onMergeTimeout();
      }
    }

    return onMergeFailure({ status, statusText, headers, data, config: {} });
  };

  cancelMergePolling = (prId: number) => {
    return this.bitbucketMerger.cancelMergePolling(prId);
  };

  getTaskCount = async (pullRequestId: number) => {
    const endpoint = `${this.baseUrl}/pullrequests/${pullRequestId}/tasks`;
    const resp = await axios.get<BB.PullRequestTaskResponse>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', endpoint)),
    );
    const data = resp.data;
    return data.values.filter((task) => task.state === 'UNRESOLVED').length;
  };

  getPullRequest = async (pullRequestId: number): Promise<BB.PullRequest> => {
    const endpoint = `${this.baseUrl}/pullrequests/${pullRequestId}`;
    const resp = await axios.get<BB.PullRequestResponse>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', endpoint)),
    );
    const data = resp.data;
    const approvals = data.participants
      .filter((participant) => participant.approved)
      .map((participant) => participant.user.account_id);

    return {
      pullRequestId,
      title: data.title,
      description: data.description,
      createdOn: new Date(data.created_on),
      author: data.author.account_id,
      authorAaid: data.author.uuid,
      commit: data.source.commit.hash,
      targetBranch: data.destination.branch.name,
      state: data.state,
      sourceBranch: data.source.branch.name,
      approvals: approvals,
      openTasks: await this.getTaskCount(pullRequestId),
    };
  };

  pullRequestHasConflicts = async (source: string, destination: string): Promise<boolean> => {
    const endpoint = `${this.baseUrl}/diffstat/${source}..${destination}?merge=true&fields=values.status`;
    try {
      const resp = await axios.get<BB.DiffStatResponse>(
        endpoint,
        await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', endpoint)),
      );
      const data = resp.data;
      return data.values.some((diff) => diff.status === 'merge conflict');
    } catch (e) {
      // It's possible that the source branch has been deleted, in which case we can't check for conflicts
      return false;
    }
  };

  getPullRequestBuildStatuses = async (pullRequestId: number): Promise<Array<BB.BuildStatus>> => {
    const endpoint = `${this.baseUrl}/pullrequests/${pullRequestId}/statuses`;
    const resp = await axios.get<{ values: BB.BuildStatusResponse[] }>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', endpoint)),
    );
    // fairly safe to assume we'll never need to paginate these results
    const allBuildStatuses = resp.data.values;
    // need to remove build statuses that we created or rerunning would be impossible
    return allBuildStatuses
      .filter((buildStatus) => !buildStatus.name.match(/Pipeline #.+? for landkid/))
      .map((status) => ({
        name: status.name,
        state: status.state,
        createdOn: new Date(status.created_on),
        url: status.url,
      }));
  };

  getPullRequestPriority = async (commit: string): Promise<BB.PRPriority> => {
    const endpoint = `${this.baseUrl}/commit/${commit}/statuses`;
    const { data } = await axios.get<{ values: BB.BuildPriorityResponse[] }>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', endpoint)),
    );

    const allBuildStatuses = data.values;

    const priority =
      allBuildStatuses.find((buildStatus) => buildStatus.name === 'landkid-priority')
        ?.description || 'LOW';

    Logger.info('PR priority', {
      namespace: 'bitbucket:api:getPullRequestPriority',
      commit,
      priority,
    });

    return priority;
  };

  getUser = async (aaid: string): Promise<ISessionUser> => {
    const endpoint = `https://api.bitbucket.org/2.0/users/${aaid}`;
    const resp = await axios.get(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', endpoint)),
    );

    return {
      username: resp.data.username,
      aaid: resp.data.uuid,
      displayName: resp.data.display_name,
      accountId: resp.data.account_id,
    };
  };

  getRepository = async (): Promise<BB.Repository> => {
    const endpoint = this.baseUrl;
    Logger.info('fetching uuid for repository', {
      namespace: 'bitbucket:api:getRepository',
      endpoint,
    });
    const { data } = await axios.get<BB.RepositoryResponse>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', endpoint)),
    );
    Logger.info('successfully fetched repo uuid', {
      namespace: 'bitbucket:api:getRepository',
      uuid: data.uuid,
    });

    return {
      repoOwner: data.owner.username,
      repoName: data.slug,
      uuid: data.uuid,
      fullName: data.full_name,
      url: data.links.html.href,
    };
  };
}
