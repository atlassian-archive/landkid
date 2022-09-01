import axios from 'axios';
import { fromMethodAndPathAndBody, fromMethodAndUrl } from 'atlassian-jwt';

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

export interface PipelinesVariables {
  dependencyCommits: string[];
  targetBranch: string;
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
        namespace: 'bitbucket:pipelines:processStatusWebhook',
        statusEvent: body,
      });
      return null;
    }
    const buildStatus = statusEvent.commit_status.state;
    const buildUrl = statusEvent.commit_status.url;
    Logger.info('Received build status event', {
      namespace: 'bitbucket:pipelines:processStatusWebhook',
      buildUrl,
      buildStatus,
    });

    // Status webhooks dont give you build uuid's or even build numbers. We need to get from url
    const buildUrlParts = buildUrl.split('/');
    const buildId = parseInt(buildUrlParts[buildUrlParts.length - 1], 10);

    return {
      buildId,
      buildStatus,
    };
  };

  public createLandBuild = async (
    requestId: string,
    commit: string,
    { dependencyCommits, targetBranch }: PipelinesVariables,
    lockId: Date,
  ) => {
    const depCommitsStr = JSON.stringify(dependencyCommits);
    Logger.info('Creating land build for commit', {
      namespace: 'bitbucket:pipelines:createLandBuild',
      landRequestId: requestId,
      commit,
      depCommitsStr,
      lockId,
    });
    const data = {
      target: {
        commit: { hash: commit, type: 'commit' },
        selector: { type: 'custom', pattern: 'landkid' },
        type: 'pipeline_commit_target',
      },
      variables: [
        {
          key: 'LANDKID_DEPENDENCY_COMMITS',
          value: depCommitsStr,
        },
        {
          key: 'TARGET_BRANCH',
          value: targetBranch,
        },
      ],
    };
    const endpoint = `${this.apiBaseUrl}/pipelines/`;
    const resp = await axios.post(
      endpoint,
      JSON.stringify(data),
      await bitbucketAuthenticator.getAuthConfig(
        fromMethodAndPathAndBody('post', endpoint, data),
        axiosPostConfig,
      ),
    );
    if (!resp.data.build_number || typeof resp.data.build_number !== 'number') {
      Logger.error('Response from creating build does not match the shape we expected', {
        namespace: 'bitbucket:pipelines:createLandBuild',
        landRequestId: requestId,
        commit,
        lockId,
      });
      return null;
    }
    Logger.info('Created build', {
      namespace: 'bitbucket:pipelines:createLandBuild',
      landRequestId: requestId,
      commit,
      buildNumber: resp.data.build_number,
      lockId,
    });
    // build_number comes back as a number unfortunately
    return resp.data.build_number as number;
  };

  public stopLandBuild = async (buildId: number, lockId?: Date) => {
    Logger.info('Stopping land build with id', {
      namespace: 'bitbucket:pipelines:stopLandBuild',
      buildId,
      lockId,
    });
    const endpoint = `${this.apiBaseUrl}/pipelines/${buildId}/stopPipeline`;
    try {
      await axios.post(
        endpoint,
        null,
        await bitbucketAuthenticator.getAuthConfig(
          fromMethodAndUrl('post', endpoint),
          axiosPostConfig,
        ),
      );
    } catch (err) {
      Logger.info('Build could not be cancelled', {
        namespace: 'bitbucket:pipelines:stopLandBuild',
        buildId,
        lockId,
        error: err,
      });
      return false;
    }
    return true;
  };
}
