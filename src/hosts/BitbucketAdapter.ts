import axios, { AxiosError } from 'axios';
import * as pRetry from 'p-retry';
import {
  BBPullRequest,
  BuildStatus,
  HostConfig,
  BBPRState,
  BuildState,
} from '../types';

import Logger from '../Logger';

interface BBUser {
  username: string;
}

interface BBPullRequestResponse {
  participants: {
    approved: boolean;
    user: BBUser;
  }[];
  author: BBUser;
  title: string;
  description: string;
  created_on: string;
  state: BBPRState;
  task_count: number;
}

interface BBBuildStatus {
  name: string;
  state: BuildState;
  created_on: string;
  url: string;
}

const BitbucketAdapter = (config: HostConfig) => {
  const axiosGetConfig = {
    auth: {
      username: config.botUsername,
      password: config.botPassword,
    },
  };

  const axiosPostConfig = {
    ...axiosGetConfig,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const apiBaseUrl = `https://api.bitbucket.org/2.0/repositories/${
    config.repoOwner
  }/${config.repoName}`;
  // const oldApiBaseUrl = `https://api.bitbucket.org/1.0/repositories/${
  //   config.repoOwner
  // }/${config.repoName}`;

  return {
    async mergePullRequest(pullRequestId: number) {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}/merge`;
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
        axios.post(endpoint, JSON.stringify(data), axiosPostConfig);

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
      pRetry(attemptMerge, { onFailedAttempt, retries: 5 })
        .then(() => Logger.info({ pullRequestId }, 'Merged Pull Request'))
        .catch(err =>
          Logger.error({ err, pullRequestId }, 'Unable to merge pull request'),
        );
    },

    async getPullRequest(pullRequestId: number): Promise<BBPullRequest> {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}`;
      const resp = await axios.get<BBPullRequestResponse>(endpoint, axiosGetConfig);
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
    },

    async getPullRequestBuildStatuses(
      pullRequestId: number,
    ): Promise<Array<BuildStatus>> {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}/statuses`;
      const resp = await axios.get<{ values: BBBuildStatus[] }>(
        endpoint,
        axiosGetConfig,
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
    },

    getPullRequestUrl(pullRequestId: number) {
      return `https://bitbucket.org/${config.repoOwner}/${
        config.repoName
      }/pull-requests/${pullRequestId}`;
    },
  };
};

export default BitbucketAdapter;
