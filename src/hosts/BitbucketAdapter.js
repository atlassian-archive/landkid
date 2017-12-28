// @flow
import { type HostAdapter, type CommentEvent, type JSONValue } from '../types';
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
    },

    async getCurrentQueue(): Promise<Array<JSONValue>> {
      const allPullRequests = await axios
        .get(
          `https://api.bitbucket.org/2.0/repositories/${config.REPO_OWNER}/${
            config.REPO_SLUG
          }/pullrequests/`
        )
        .then(resp => resp.data.values);
      let comments = allPullRequests.map(pr => {
        const pullRequestId = pr.id;
        return axios
          .get(
            `https://api.bitbucket.org/2.0/repositories/${config.REPO_OWNER}/${
              config.REPO_SLUG
            }/pullrequests/${pullRequestId}/comments/`
          )
          .then(resp => resp.data.values);
      });
      await Promise.all(comments);
      console.log(comments[0]);
    }
  };
};

export default BitbucketAdapter;
