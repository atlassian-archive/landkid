// @flow
import { type HostAdapter, type JSONValue } from '../types';
import axios from 'axios';
import Logger from '../Logger';
import { isObject } from 'util';

type Config = {
  REPO_OWNER: string,
  REPO_SLUG: string,
  BITBUCKET_USERNAME: string,
  BITBUCKET_PASSWORD: string
};

const USERS_ALLOWED_TO_APPROVE = ['luke_batchelor', 'thejameskyle'];

const BitbucketAdapter = async (config: Config) => {
  let axiosGetConfig = {
    auth: {
      username: config.BITBUCKET_USERNAME,
      password: config.BITBUCKET_PASSWORD
    }
  };

  let axiosPostConfig = {
    ...axiosGetConfig,
    headers: {
      'Content-Type': 'application/json'
    }
  };

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
        `https://api.bitbucket.org/1.0/repositories/${config.REPO_OWNER}/${
          config.REPO_SLUG
        }/pullrequests/${pullRequestId}/comments/`,
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
      const endpoint = `https://api.bitbucket.org/2.0/repositories/${
        config.REPO_OWNER
      }/${config.REPO_SLUG}/pullrequests/${pullRequestId}/merge`;
      Logger.info({ pullRequestId, endpoint }, 'Merging pull request');
      const data = {
        close_source_branch: true,
        message: 'Merged by Landkid after successful build rebased on Master',
        merge_strategy: 'merge_commit'
      };
      const resp = await axios.post(
        // prettier-ignore
        endpoint,
        JSON.stringify(data),
        axiosPostConfig
      );
      Logger.info({ pullRequestId }, 'Merged Pull Request');
    },

    async getPullRequest(pullRequestId: string) {
      const endpoint = `https://api.bitbucket.org/2.0/repositories/${
        config.REPO_OWNER
      }/${config.REPO_SLUG}/pullrequests/${pullRequestId}`;
      const resp = await axios.get(endpoint, axiosGetConfig);
      return resp.data;
    },

    async getPullRequestBuildStatuses(pullRequestId: string) {
      const endpoint = `https://api.bitbucket.org/2.0/repositories/${
        config.REPO_OWNER
      }/${config.REPO_SLUG}/pullrequests/${pullRequestId}/statuses`;
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
