// @flow
import type {
  HostAdapter,
  JSONValue,
  PullRequest,
  BuildStatus
} from '../types';
import axios from 'axios';
import Logger from '../Logger';

type Config = {
  repoOwner: string,
  repoName: string,
  botUsername: string,
  botPassword: string,
  usersAllowedToApprove: Array<string>
};

const BitbucketAdapter = (config: Config) => {
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
      let data = {
        content: message
      };

      if (parentCommentId) {
        data = {
          ...data,
          parent_id: String(parentCommentId)
        };
      }

      let response = await axios.post(
        `${oldApiBaseUrl}/pullrequests/${pullRequestId}/comments/`,
        JSON.stringify(data),
        axiosPostConfig
      );

      return response.data.comment_id;
    },

    async mergePullRequest(pullRequestId: string) {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}/merge`;
      const data = {
        close_source_branch: true,
        message: `pull request #${
          pullRequestId
        } merged  by Landkid after a successful build rebased on Master`,
        merge_strategy: 'merge_commit'
      };
      Logger.info(
        {
          pullRequestId,
          endpoint
        },
        'Merging pull request'
      );
      try {
        const resp = await axios.post(
          endpoint,
          JSON.stringify(data),
          axiosPostConfig
        );
        Logger.info(
          {
            pullRequestId
          },
          'Merged Pull Request'
        );
      } catch (e) {
        Logger.error(e, 'Unable to merge pull request');
        return false;
      }
      return true;
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
        openTasks: data.task_count
      };
    },

    async getPullRequestBuildStatuses(
      pullRequestId: string
    ): Promise<Array<BuildStatus>> {
      const endpoint = `${apiBaseUrl}/pullrequests/${pullRequestId}/statuses`;
      const resp = await axios.get(endpoint, axiosGetConfig);
      // fairly safe to assume we'll never need to paginate these results
      const allBuildStatuses = resp.data.values;
      // need to remove build statuses that we created or rerunning would be impossible
      return allBuildStatuses
        .filter(
          buildStatus => !buildStatus.name.match(/Pipeline #.+? for landkid/)
        )
        .map(status => ({
          state: status.state,
          createdOn: new Date(status.created_on),
          url: status.url
        }));
    }
  };
};

export default BitbucketAdapter;
