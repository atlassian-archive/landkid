import axios from 'axios';
import Logger from '../Logger';
import { CI, CIAdapter } from '../types';

type Config = {
  repoOwner: string;
  repoName: string;
  botUsername: string;
  botPassword: string;
};

const BitbucketPipelinesAdapter: CIAdapter = (config: Config) => {
  let axiosGetConfig = {
    auth: {
      username: config.botUsername,
      password: config.botPassword,
    },
  };

  let axiosPostConfig = {
    ...axiosGetConfig,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const apiBaseUrl = `https://api.bitbucket.org/2.0/repositories/${
    config.repoOwner
  }/${config.repoName}`;

  const ciImpl: CI = {
    processStatusWebhook(body) {
      // Sometimes the events are wrapped in an extra body layer. We don't know why,
      // so we'll just guard for it here
      const statusEvent = body && body.data ? body.data : body;
      if (
        !statusEvent ||
        !statusEvent.commit_status ||
        !statusEvent.commit_status.state ||
        !statusEvent.commit_status.url ||
        typeof statusEvent.commit_status.url !== 'string'
      ) {
        Logger.error(
          { statusEvent: body },
          'Status event receieved that does not match the shape we were expecting',
        );
        return null;
      }
      let buildStatus: any = statusEvent.commit_status.state;
      const buildUrl: string = statusEvent.commit_status.url;
      Logger.info({ buildUrl, buildStatus }, 'Received build status event');

      // Status webhooks dont give you build uuid's or even build numbers. We need to get from url
      const buildUrlParts = buildUrl.split('/');
      const buildId = parseInt(buildUrlParts[buildUrlParts.length - 1], 10);

      return {
        buildId,
        buildStatus,
      };
    },

    async createLandBuild(commit) {
      Logger.info({ commit }, 'Creating land build for commit');
      const data = {
        target: {
          commit: { hash: commit, type: 'commit' },
          selector: { type: 'custom', pattern: 'landkid' },
          type: 'pipeline_commit_target',
        },
      };
      const resp = await axios.post(
        `${apiBaseUrl}/pipelines/`,
        JSON.stringify(data),
        axiosPostConfig,
      );
      Logger.info({ buildNumber: resp.data.build_number }, 'Created build');
      if (
        !resp.data.build_number ||
        typeof resp.data.build_number !== 'number'
      ) {
        Logger.error(
          'Response from creating build does not match the shape we expected',
        );
        return null;
      }
      // build_number comes back as a number unfortunately
      return resp.data.build_number;
    },

    async stopLandBuild(buildId) {
      // FIXME: unimplmented
      return true;
    },

    getBuildUrl(buildId) {
      return `https://bitbucket.org/${config.repoOwner}/${
        config.repoName
      }/addon/pipelines/home#!/results/${buildId}`;
    },
  };

  return ciImpl;
};

export default BitbucketPipelinesAdapter;
