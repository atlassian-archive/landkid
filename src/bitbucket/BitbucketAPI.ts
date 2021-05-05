import axios, { AxiosResponse } from 'axios';
import * as jwtTools from 'atlassian-jwt';

import { MergeOptions, RepoConfig } from '../types';
import { Logger } from '../lib/Logger';
import { bitbucketAuthenticator } from './BitbucketAuthenticator';
import { LandRequestStatus } from '../db';
import { BitbucketMerger } from './BitbucketMerger';

const BBAPIBaseUrl = 'https://api.bitbucket.org/2.0/repositories';

export class BitbucketAPI {
  private baseUrl = `${BBAPIBaseUrl}/${this.config.repoOwner}/${this.config.repoName}`;
  private bitbucketMerger = new BitbucketMerger(this.baseUrl);

  static SUCCESS = 'success' as const;
  static FAILED = 'failed' as const;
  static ABORTED = 'aborted' as const;

  constructor(private config: RepoConfig) {}

  mergePullRequest = async (landRequestStatus: LandRequestStatus, options: MergeOptions = {}) => {
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
        namespace: 'bitbucket:api:mergePullRequest',
        landRequestId,
        landRequestStatus,
        pullRequestId,
      });
      return BitbucketAPI.SUCCESS;
    };

    const onMergeFailure = ({ status, statusText, headers, data }: AxiosResponse) => {
      Logger.error('Unable to merge pull request', {
        namespace: 'bitbucket:api:mergePullRequest:onFailure',
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
      return BitbucketAPI.FAILED;
    };

    const onMergeAbort = () => {
      Logger.info('Aborted PR merging', {
        namespace: 'bitbucket:api:mergePullRequest:onFailure',
        pullRequestId,
        landRequestId,
        landRequestStatus,
      });
      return BitbucketAPI.ABORTED;
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
    );

    if (status === 200) {
      return onMergeSuccess();
    }

    if (status === 202) {
      Logger.info('Received timeout response, starting merge task polling', {
        pollUrl: headers.location,
        namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
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
      } else {
        return onMergeAbort();
      }
    }

    return onMergeFailure({ status, statusText, headers, data, config: {} });
  };

  getPullRequest = async (pullRequestId: number): Promise<BB.PullRequest> => {
    const endpoint = `${this.baseUrl}/pullrequests/${pullRequestId}`;
    const resp = await axios.get<BB.PullRequestResponse>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
    );
    const data = resp.data;
    const approvals = data.participants
      .filter(participant => participant.approved)
      .map(participant => participant.user.account_id);

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
      openTasks: data.task_count,
    };
  };

  getPullRequestBuildStatuses = async (pullRequestId: number): Promise<Array<BB.BuildStatus>> => {
    const endpoint = `${this.baseUrl}/pullrequests/${pullRequestId}/statuses`;
    const resp = await axios.get<{ values: BB.BuildStatusResponse[] }>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
    );
    // fairly safe to assume we'll never need to paginate these results
    const allBuildStatuses = resp.data.values;
    // need to remove build statuses that we created or rerunning would be impossible
    return allBuildStatuses
      .filter(buildStatus => !buildStatus.name.match(/Pipeline #.+? for landkid/))
      .map(status => ({
        name: status.name,
        state: status.state,
        createdOn: new Date(status.created_on),
        url: status.url,
      }));
  };

  getUser = async (aaid: string): Promise<ISessionUser> => {
    const endpoint = `https://api.bitbucket.org/2.0/users/${aaid}`;
    const resp = await axios.get(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
    );

    return {
      username: resp.data.username,
      aaid: resp.data.uuid,
      displayName: resp.data.display_name,
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
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
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
