// @flow
import axios from 'axios';
import Logger from '../Logger';
import { type CIAdapter, type StatusEvent, JSONValue } from '../types';

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
    processStatusWebhook(body: JSONValue): StatusEvent | null {
      if (
        !body ||
        !body.commit_status ||
        !body.commit_status.state ||
        !body.commit_status.url ||
        typeof body.commit_status.url !== 'string'
      ) {
        Logger.error(
          { statusEvent: body },
          'Status event receieved that does not match the shape we were expecting'
        );
        return null;
      }
      let buildStatus = body.commit_status.state;
      // we only care if a status was FAILED, SUCCESSFUL, or STOPPED
      if (buildStatus === 'INPROGRESS') return null;

      // Status webhooks dont give you build uuid's or even build numbers. We need to get from url
      const buildUrl: string = body.commit_status.url;
      const buildUrlParts = buildUrl.split('/');
      const buildId = buildUrlParts[buildUrlParts.length - 1];

      return {
        buildUrl,
        buildId,
        passed: buildStatus === 'SUCCESSFUL'
      };
    },

    async createLandBuild(commit: string): Promise<string | null> {
      Logger.info({ commit }, 'Creating land build for commit');
      const data = {
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
      };
      const resp = await axios.post(
        // prettier-ignore
        `https://api.bitbucket.org/2.0/repositories/${config.REPO_OWNER}/${config.REPO_SLUG}/pipelines/`,
        JSON.stringify(data),
        axiosPostConfig
      );
      Logger.info({ buildNumber: resp.data.build_number }, 'Created build');
      if (
        !resp.data.build_number ||
        typeof resp.data.build_number !== 'number'
      ) {
        Logger.error(
          'Response from creating build does not match the shape we expected'
        );
        return null;
      }
      // build_number comes back as a number unfortunately
      return `${resp.data.build_number}`;
    },

    async stopLandBuild(buildId: string): Promise<boolean> {
      // unimplmented
      return true;
    }
  };
};

export default BitbucketPipelinesAdapter;
