// @flow
import { type HostAdapter, type JSONValue } from '../types';
import axios from 'axios';
import Logger from '../Logger';

type Config = {
  repoOwner: string,
  repoName: string,
  botUsername: string,
  botPassword: string,
  usersAllowedToApprove: Array<string>
};

const BitbucketAdapter = async (config: Config) => {
  const USERS_ALLOWED_TO_APPROVE = config.usersAllowedToApprove;
  const axiosGetConfig = {
    auth: {
      username: config.botUsername,
      password: config.botPassword
    }
  };

  const axiosPostConfig = {
    ...axiosGetConfig,
    headers: {
      'Content-Type': 'application/json'
    }
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
      message: string
    ) {
      let data = { content: message };

      if (parentCommentId) {
        data = { ...data, parent_id: String(parentCommentId) };
      }

      let response = await axios.post(
        `${oldApiBaseUrl}/pullrequests/${pullRequestId}/comments/`,
        JSON.stringify(data),
        axiosPostConfig
      );

      return response.data.comment_id;
    },

    // This is run when a build is at the front of the queue
    async isAllowedToLand(pullRequestId: string): Promise<any> {
      const pullRequest = await this.getPullRequest(pullRequestId);
      const buildStatuses = await this.getPullRequestBuildStatuses(
        pullRequestId
      );

      const isOpen = pullRequest.state === 'OPEN';
      const createdBy = pullRequest.author.username;
      const isApproved = pullRequest.participants.some(
        participant =>
          (participant.approved &&
            !participant.user.username !== createdBy &&
            USERS_ALLOWED_TO_APPROVE.indexOf(participant.user.username) > -1) ||
          (participant.approved &&
            !participant.user.username === 'luke_batchelor')
      );
      const isGreen = buildStatuses.every(
        buildStatus => buildStatus.state === 'SUCCESSFUL'
      );
      Logger.info(
        { pullRequestId, isOpen, isApproved, isGreen },
        'isAllowedToLand()'
      );
      const isAllowed = isOpen && isApproved && isGreen;
      return { isOpen, isApproved, isGreen, isAllowed };
    },

    async mergePullRequest(pullRequestId: string) {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}/merge`;
      const data = {
        close_source_branch: true,
        message: 'Merged by Landkid after successful build rebased on Master',
        merge_strategy: 'merge_commit'
      };
      Logger.info({ pullRequestId, endpoint }, 'Merging pull request');
      try {
        const resp = await axios.post(
          endpoint,
          JSON.stringify(data),
          axiosPostConfig
        );
        Logger.info({ pullRequestId }, 'Merged Pull Request');
      } catch (e) {
        Logger.error(e, 'Unable to merge pull request');
        return false;
      }
      return true;
    },

    async getPullRequest(pullRequestId: string) {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}`;
      const resp = await axios.get(endpoint, axiosGetConfig);
      return resp.data;
    },

    async getPullRequestBuildStatuses(pullRequestId: string) {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}/statuses`;
      const resp = await axios.get(endpoint, axiosGetConfig);
      // fairly safe to assume we'll never need to paginate these results
      const allBuildStatuses = resp.data.values;
      // need to remove build statuses that we created or rerunning would be impossible
      return allBuildStatuses.filter(
        buildStatus => !buildStatus.name.match(/Pipeline #.+? for landkid/)
      );
    }
  };
};

export default BitbucketAdapter;
