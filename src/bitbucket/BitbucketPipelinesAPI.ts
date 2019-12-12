import axios from 'axios';
import * as jwtTools from 'atlassian-jwt';

import { Logger } from '../lib/Logger';
import { RepoConfig } from '../types';
import { bitbucketAuthenticator, axiosPostConfig } from './BitbucketAuthenticator';

const baseApiUrl = 'https://api.bitbucket.org/2.0/repositories';

interface PipelinesStatusEvent {
  commit_status: {
    state: BB.BuildState;
    url: string;
  };
}

export class BitbucketPipelinesAPI {
  private apiBaseUrl = `${baseApiUrl}/${this.config.repoOwner}/${this.config.repoName}`;

  constructor(private config: RepoConfig) {}

  public processStatusWebhook = (body: any): BB.BuildStatusEvent | null => {
    // Sometimes the events are wrapped in an extra body layer. We don't know why,
    // so we'll just guard for it here
    const statusEvent: PipelinesStatusEvent = body && body.data ? body.data : body;
    if (
      !statusEvent ||
      !statusEvent.commit_status ||
      !statusEvent.commit_status.state ||
      !statusEvent.commit_status.url ||
      typeof statusEvent.commit_status.url !== 'string'
    ) {
      Logger.error('Status event receieved that does not match the shape we were expecting', {
        statusEvent: body,
      });
      return null;
    }
    const buildStatus = statusEvent.commit_status.state;
    const buildUrl = statusEvent.commit_status.url;
    Logger.info('Received build status event', { buildUrl, buildStatus });

    // Status webhooks dont give you build uuid's or even build numbers. We need to get from url
    const buildUrlParts = buildUrl.split('/');
    const buildId = parseInt(buildUrlParts[buildUrlParts.length - 1], 10);

    return {
      buildId,
      buildStatus,
    };
  };

  public createLandBuild = async (commit: string, depCommits: string) => {
    Logger.info('Creating land build for commit', { commit });
    const data = {
      target: {
        commit: { hash: commit, type: 'commit' },
        selector: { type: 'custom', pattern: 'landkid' },
        type: 'pipeline_commit_target',
      },
      variables: [
        {
          key: 'LANDKID_DEPENDENCY_COMMITS',
          value: depCommits,
        },
      ],
    };
    const endpoint = `${this.apiBaseUrl}/pipelines/`;
    const resp = await axios.post(
      endpoint,
      JSON.stringify(data),
      await bitbucketAuthenticator.getAuthConfig(
        jwtTools.fromMethodAndPathAndBody('post', endpoint, data),
        axiosPostConfig,
      ),
    );
    Logger.info('Created build', { buildNumber: resp.data.build_number });
    if (!resp.data.build_number || typeof resp.data.build_number !== 'number') {
      Logger.error('Response from creating build does not match the shape we expected');
      return null;
    }
    // build_number comes back as a number unfortunately
    return resp.data.build_number as number;
  };

  public stopLandBuild = async (buildId: number) => {
    return true;
  };
}
