// @flow
import { type HostAdapter, type CommentEvent } from '../types';
import axios from 'axios';

type Config = {
  REPO_OWNER: string,
  REPO_SLUG: string,
  BITBUCKET_USERNAME: string,
  BITBUCKET_PASSWORD: string
};

const BitbucketAdapter: HostAdapter = async (config: Config) => {
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
    processCommentWebhook(data: any): CommentEvent {
      return {
        userId: data.actor.uuid,
        pullRequestId: data.pullrequest.id,
        commentId: data.comment.id,
        commentBody: data.comment.content.raw
      };
    },

    async createComment(pullRequestId, parentCommentId, message) {
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

    async pullRequestToCommitHash(pullRequestId): Promise<string> {
      // ...
    }
  };
};

export default BitbucketAdapter;
