import axios, { AxiosError } from 'axios';
import * as pRetry from 'p-retry';

import { RepoConfig } from '../types';
import { Logger } from '../lib/Logger';

const baseApiUrl = 'https://api.bitbucket.org/2.0/repositories';

export class BitbucketAPI {
  private axiosGetConfig = {
    auth: {
      username: this.config.botUsername,
      password: this.config.botPassword,
    },
  };
  private axiosPostConfig = {
    ...this.axiosGetConfig,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  private apiBaseUrl = `${baseApiUrl}/${this.config.repoOwner}/${
    this.config.repoName
  }`;

  constructor(private config: RepoConfig) {}

  mergePullRequest = async (pullRequestId: number) => {
    const endpoint = `${this.apiBaseUrl}/pullrequests/${pullRequestId}/merge`;
    const message = `pull request #${pullRequestId} merged  by Landkid after a successful build rebased on Master`;
    const data = {
      close_source_branch: true,
      message: message,
      merge_strategy: 'merge_commit',
    };

    Logger.info('Merging pull request', { pullRequestId, endpoint });
    // This is just defining the function that we will retry
    const attemptMerge = () =>
      axios.post(endpoint, JSON.stringify(data), this.axiosPostConfig);

    const onFailedAttempt = (
      failure: AxiosError & pRetry.FailedAttemptError,
    ) => {
      const { response, attemptNumber, attemptsLeft } = failure;
      const { status, statusText, headers, data } =
        response || ({} as Record<string, undefined>);

      Logger.error('Merge attempt failed', {
        err: failure,
        response: {
          statusCode: status,
          statusText,
          headers,
          data,
        },
        attemptNumber,
        attemptsLeft,
        pullRequestId,
      });
    };
    await pRetry(attemptMerge, { onFailedAttempt, retries: 5 })
      .then(() => Logger.info('Merged Pull Request', { pullRequestId }))
      .catch(err => {
        Logger.error('Unable to merge pull request', { err, pullRequestId });
        throw err;
      });
  };

  getPullRequest = async (pullRequestId: number): Promise<BB.PullRequest> => {
    const endpoint = `${this.apiBaseUrl}/pullrequests/${pullRequestId}`;
    const resp = await axios.get<BB.PullRequestResponse>(
      endpoint,
      this.axiosGetConfig,
    );
    const data = resp.data;
    const approvals = data.participants
      .filter(participant => participant.approved)
      .map(participant => participant.user.username);

    return {
      pullRequestId,
      title: data.title,
      description: data.description,
      createdOn: new Date(data.created_on),
      author: data.author.username,
      authorAaid: data.author.account_id,
      state: data.state,
      approvals: approvals,
      openTasks: data.task_count,
    };
  };

  getPullRequestBuildStatuses = async (
    pullRequestId: number,
  ): Promise<Array<BB.BuildStatus>> => {
    const endpoint = `${
      this.apiBaseUrl
    }/pullrequests/${pullRequestId}/statuses`;
    const resp = await axios.get<{ values: BB.BuildStatusResponse[] }>(
      endpoint,
      this.axiosGetConfig,
    );
    // fairly safe to assume we'll never need to paginate these results
    const allBuildStatuses = resp.data.values;
    // need to remove build statuses that we created or rerunning would be impossible
    return allBuildStatuses
      .filter(
        buildStatus => !buildStatus.name.match(/Pipeline #.+? for landkid/),
      )
      .map(status => ({
        state: status.state,
        createdOn: new Date(status.created_on),
        url: status.url,
      }));
  };

  getUser = async (aaid: string): Promise<ISessionUser> => {
    const endpoint = `https://api.bitbucket.org/2.0/users/${aaid}`;
    const resp = await axios.get(endpoint, this.axiosGetConfig);

    return {
      username: resp.data.username,
      aaid: resp.data.account_id,
      displayName: resp.data.display_name,
    };
  };
}
