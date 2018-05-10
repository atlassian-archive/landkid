// @flow
import axios from 'axios';
import Logger from '../Logger';
import { type CIAdapter, type StatusEvent, type JSONValue } from '../types';

type Config = {
  repoOwner: string,
  repoName: string,
  botUsername: string,
  botPassword: string
};

const BitbucketPipelinesAdapter: CIAdapter = (config: Config) => {
  let axiosGetConfig = {
    auth: {
      username: config.botUsername,
      password: config.botPassword
    }
  };

  let axiosPostConfig = {
    ...axiosGetConfig,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const apiBaseUrl = `https://api.bitbucket.org/2.0/repositories/${
    config.repoOwner
  }/${config.repoName}`;

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
      let buildStatus: any = body.commit_status.state;
      const buildUrl: string = body.commit_status.url;
      Logger.info({ buildUrl, buildStatus }, 'Received build status event');

      // Status webhooks dont give you build uuid's or even build numbers. We need to get from url
      const buildUrlParts = buildUrl.split('/');
      const buildId = buildUrlParts[buildUrlParts.length - 1];

      return {
        buildUrl,
        buildId,
        buildStatus,
        passed: buildStatus === 'SUCCESSFUL',
        failed: buildStatus === 'FAILED',
        stopped: buildStatus === 'STOPPED'
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
        `${apiBaseUrl}/pipelines/`,
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
