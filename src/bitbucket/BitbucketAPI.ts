import axios, { AxiosError } from 'axios';
import * as pRetry from 'p-retry';

import { RepoConfig } from '../types';
import Logger from '../Logger';

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
    const message = `pull request #${
      pullRequestId
    } merged  by Landkid after a successful build rebased on Master`;
    const data = {
      close_source_branch: true,
      message: message,
      merge_strategy: 'merge_commit',
    };

    Logger.info({ pullRequestId, endpoint }, 'Merging pull request');
    // This is just defining the function that we will retry
    const attemptMerge = () =>
      axios.post(endpoint, JSON.stringify(data), this.axiosPostConfig);

    const onFailedAttempt = (
      failure: AxiosError & pRetry.FailedAttemptError,
    ) => {
      const { response, attemptNumber, attemptsLeft } = failure;
      const { status, statusText, headers, data } =
        response || ({} as Record<string, undefined>);
      // This looks super messy, but we've had issues with bunyans default serializers removing
      // important info from this error.
      // https://github.com/DerekSeverson/bunyan-axios-serializer/ also doesn't solve the problem
      // TODO: Write a custom serializer that actually reports the `data` back from a response
      Logger.error(
        {
          err: failure, // This should be transformed using bunyan's std serializers
          response: {
            statusCode: status,
            statusText,
            headers,
            data,
          },
          attemptNumber,
          attemptsLeft,
          pullRequestId,
        },
        'Merge attempt failed',
      );
    };
    await pRetry(attemptMerge, { onFailedAttempt, retries: 5 })
      .then(() => Logger.info({ pullRequestId }, 'Merged Pull Request'))
      .catch(err => {
        Logger.error({ err, pullRequestId }, 'Unable to merge pull request');
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
      state: data.state,
      approvals: approvals,
      openTasks: data.task_count,
    };
  };

  getPullRequestBuildStatuses = async (
    pullRequestId: number,
  ): Promise<Array<BB.BuildStatus>> => {
    const endpoint = `${this.apiBaseUrl}/pullrequests/${
      pullRequestId
    }/statuses`;
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
}
