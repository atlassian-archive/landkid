// @flow
import axios from 'axios';
import pRetry from 'p-retry';
import type {
  HostAdapter,
  JSONValue,
  PullRequest,
  BuildStatus,
  HostConfig,
} from '../types';

import Logger from '../Logger';

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
  const oldApiBaseUrl = `https://api.bitbucket.org/1.0/repositories/${
    config.repoOwner
  }/${config.repoName}`;

  return {
    async createComment(
      pullRequestId: string,
      parentCommentId: ?string,
      message: string,
    ) {
      let data = { content: message };

      if (parentCommentId) {
        data = {
          ...data,
          parent_id: String(parentCommentId),
        };
      }

      let response = await axios.post(
        `${oldApiBaseUrl}/pullrequests/${pullRequestId}/comments/`,
        JSON.stringify(data),
        axiosPostConfig,
      );

      return response.data.comment_id;
    },

    async mergePullRequest(pullRequestId: string) {
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
      const onFailedAttempt = err =>
        Logger.error(
          { err, pullRequestId },
          `Merge attempt ${err.attemptNumber} failed. ${
            err.attemptsLeft
          } attempts left`,
        );
      pRetry(attemptMerge, { onFailedAttempt, retries: 5 })
        .then(() => Logger.info({ pullRequestId }, 'Merged Pull Request'))
        .catch(err =>
          Logger.error({ err, pullRequestId }, 'Unable to merge pull request'),
        );
    },

    async getPullRequest(pullRequestId: string): Promise<PullRequest> {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}`;
      const resp = await axios.get(endpoint, axiosGetConfig);
      const data = resp.data;
      const approvals = data.participants
        .filter(participant => participant.approved)
        .map(participant => participant.user.username);

      return {
        pullRequestId: pullRequestId,
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
      pullRequestId: string,
    ): Promise<Array<BuildStatus>> {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}/statuses`;
      const resp = await axios.get(endpoint, axiosGetConfig);
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
  };
};

export default BitbucketAdapter;
