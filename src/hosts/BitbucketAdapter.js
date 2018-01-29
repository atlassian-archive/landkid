// @flow
import { type HostAdapter, type JSONValue } from '../types';
import axios from 'axios';
import Logger from '../Logger';

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
      let data = {};

      data.content = message;

      if (parentCommentId) {
        data.parent_id = `${parentCommentId}`;
      }

      let response = await axios.post(
        // prettier-ignore
        `https://api.bitbucket.org/1.0/repositories/${config.REPO_OWNER}/${config.REPO_SLUG}/pullrequests/${pullRequestId}/comments/`,
        JSON.stringify(data),
        {
          ...axiosGetConfig,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.comment_id;
    },

    // This is run when a build is at the front of the queue
    async isAllowedToLand(pullRequestId: string): Promise<boolean> {
      // check the last build status for the pr
      // double check the reviewers
      // custom rules like certain teams for certain packages
      const pullRequest = await this.getPullRequest(pullRequestId);
      const buildStatuses = await this.getPullRequestBuildStatuses(
        pullRequestId
      );

      const isOpen = pullRequest.state === 'OPEN';
      const createdBy = pullRequest.author.username;
      const isApproved = pullRequest.participants.some(
        participant =>
          participant.approved && !participant.username !== createdBy
      );
      const buildIsGreen = buildStatuses.every(
        buildStatus => buildStatus.state === 'SUCCESSFUL'
      );
      return true;
    },

    async mergePullRequest(pullRequestId: string) {
      const endpoint = `https://api.bitbucket.org/2.0/repositories/${
        config.REPO_OWNER
      }/${config.REPO_SLUG}/pullrequests/${pullRequestId}/merge`;
      Logger.info({ pullRequestId, endpoint }, 'Merging pull reuest');
      const data = {
        close_source_branch: true,
        message: 'Merged by Landkid after successful build rebased on Master',
        merge_strategy: 'merge_commit'
      };
      const resp = await axios.post(
        // prettier-ignore
        endpoint,
        JSON.stringify(data),
        {
          ...axiosGetConfig,
          headers: {
            'Content-Type': 'application/json'
          }
        }
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
      return resp.data.values;
    }
  };
};

export default BitbucketAdapter;
