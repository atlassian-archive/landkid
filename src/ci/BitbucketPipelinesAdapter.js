// @flow
import { type CIAdapter, type StatusEvent } from '../types';
import axios from 'axios';

type Config = {
  REPO_OWNER: string,
  REPO_SLUG: string,
  BITBUCKET_USERNAME: string,
  BITBUCKET_PASSWORD: string
};

const BitbucketPipelinesAdapter: CIAdapter = async (config: Config) => {
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
    processStatusWebhook(body: any): StatusEvent | null {
      let buildStatus = body.commit_status.state;
      if (buildStatus === 'INPROGRESS') return null;
      return {
        buildId: body.commit_status.url,
        passed: buildStatus === 'SUCCESSFUL'
      };
    },

    async getPullRequestCommitHash(pullRequestId: string) {
      let response = await axios.get(
        // prettier-ignore
        `https://api.bitbucket.org/2.0/repositories/${config.REPO_OWNER}/${config.REPO_SLUG}/pullrequests/${pullRequestId}`,
        axiosGetConfig
      );
      return response.data.source.commit.hash;
    },

    async createLandBuild(commit: string) {
      await axios.post(
        // prettier-ignore
        `https://api.bitbucket.org/2.0/repositories/${config.REPO_OWNER}/${config.REPO_SLUG}/pipelines/`,
        JSON.stringify({
          target: {
            commit: {
              hash: commit,
              type: 'commit'
            },
            selector: {
              type: 'custom',
              pattern: 'landkid'
            },
            type: 'pipeline_commit_target'
          }
        }),
        axiosPostConfig
      );
    },

    async isLandBuildRunning(): Promise<boolean> {}
  };
};

export default BitbucketPipelinesAdapter;
