import axios, { AxiosResponse } from 'axios';
import * as jwtTools from 'atlassian-jwt';
import delay from 'delay';

import { RepoConfig } from '../types';
import { Logger } from '../lib/Logger';
import { bitbucketAuthenticator, axiosPostConfig } from './BitbucketAuthenticator';
import { LandRequestStatus } from '../db';

const baseApiUrl = 'https://api.bitbucket.org/2.0/repositories';

export class BitbucketAPI {
  private apiBaseUrl = `${baseApiUrl}/${this.config.repoOwner}/${this.config.repoName}`;

  constructor(private config: RepoConfig) {}

  mergePullRequest = async (landRequestStatus: LandRequestStatus) => {
    const {
      id: landRequestId,
      request: {
        pullRequestId,
        pullRequest: { targetBranch },
      },
    } = landRequestStatus;
    const endpoint = `${this.apiBaseUrl}/pullrequests/${pullRequestId}/merge`;
    const message = `pull request #${pullRequestId} merged by Landkid after a successful build rebased on ${targetBranch}`;
    const data = {
      close_source_branch: true,
      message,
      merge_strategy: 'merge_commit',
    };

    Logger.info('Attempting to merge pull request', {
      namespace: 'bitbucket:api:mergePullRequest',
      pullRequestId,
      landRequestId,
      targetBranch,
      landRequestStatus,
      postRequest: { endpoint, ...data },
    });

    // Polls result of merge task if the merge takes more than 28 seconds
    // API returns 202 if this is required
    const pollTaskResult = async (pollUrl: string): Promise<any> => {
      Logger.info('202: beginning polling', {
        // TODO: REMOVE AFTER TESTING
        namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
        pullRequestId,
        landRequestId,
        pollUrl,
      });
      axios.get(pollUrl).then(async (res: AxiosResponse) => {
        Logger.info('202: received poll response', {
          // TODO: REMOVE AFTER TESTING
          namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
          pullRequestId,
          landRequestId,
          pollUrl,
          res,
        });
        if (res.data.task_status === 'PENDING') {
          Logger.info('202: delaying and polling again', {
            // TODO: REMOVE AFTER TESTING
            namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
            pullRequestId,
            landRequestId,
            pollUrl,
            res,
          });
          // poll every 3 seconds
          await delay(3000);
          return pollTaskResult(pollUrl);
        }
        Logger.info('202: returning merge_result', {
          // TODO: REMOVE AFTER TESTING
          namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
          pullRequestId,
          landRequestId,
          pollUrl,
          res,
        });
        return res.data.merge_result;
      });
    };

    // Call on complete failure (not when a retry should occur)
    // Throws to exit function
    const onFailure = ({ status, statusText, headers, data }: AxiosResponse) => {
      Logger.error('Unable to merge pull request', {
        namespace: 'bitbucket:api:mergePullRequest:onFailure',
        response: {
          statusCode: status,
          statusText,
          headers,
          data,
        },
        pullRequestId,
        landRequestId,
        landRequestStatus,
        targetBranch,
      });
      throw data;
    };

    const attemptMerge = async (attemptNumber: number, attemptsLeft: number) => {
      axios
        .post(
          endpoint,
          JSON.stringify(data),
          await bitbucketAuthenticator.getAuthConfig(
            jwtTools.fromMethodAndPathAndBody('post', endpoint, data),
            {
              ...axiosPostConfig,
              // Handling error codes ourself
              validateStatus: () => true,
            },
          ),
        )
        .then(async (res: AxiosResponse) => {
          Logger.info('Received merge response', {
            // TODO: REMOVE AFTER TESTING
            namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
            pullRequestId,
            landRequestId,
            res,
          });
          // Merge successful
          if (res.status === 200) {
            Logger.info('200: returning true', {
              // TODO: REMOVE AFTER TESTING
              namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
              pullRequestId,
              landRequestId,
              res,
            });
            return true;
          }
          // Need to poll merge result because of timeout, throws if merge fails
          if (res.status === 202) {
            Logger.info('202: calling polling function', {
              // TODO: REMOVE AFTER TESTING
              namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
              pullRequestId,
              landRequestId,
              res,
            });
            return pollTaskResult(res.headers.Location).catch(err => {
              Logger.info('202: returning failure', {
                // TODO: REMOVE AFTER TESTING
                namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
                pullRequestId,
                landRequestId,
                res,
                err,
              });
              if (err.response) onFailure(err.response);
              onFailure({ status: 0, statusText: '', headers: {}, data: err, config: {} });
            });
          }
          // Legitimate merge failure, not worth retrying
          if (res.status < 500) {
            Logger.info('< 500: returning failure', {
              // TODO: REMOVE AFTER TESTING
              namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
              pullRequestId,
              landRequestId,
              res,
            });
            onFailure(res);
          }
          Logger.info('>= 500: retrying', {
            // TODO: REMOVE AFTER TESTING
            namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
            pullRequestId,
            landRequestId,
            res,
            attemptsLeft,
          });
          // Otherwise we failed with a 5xx error (SHOULD NOTIFY BB IF THIS HAPPENS)
          const { status, statusText, headers, data } = res;
          Logger.error('Merge attempt failed, trying again', {
            namespace: 'bitbucket:api:mergePullRequest:attemptMerge',
            response: {
              statusCode: status,
              statusText,
              headers,
              data,
            },
            attemptNumber,
            attemptsLeft,
            pullRequestId,
            landRequestId,
            landRequestStatus,
            targetBranch,
          });
          if (attemptsLeft === 0) {
            onFailure(res);
          }
          attemptMerge(attemptNumber + 1, attemptsLeft - 1);
        });
    };

    // 5 attempts total
    await attemptMerge(1, 4);

    // We throw before here if the merge is unsuccessul
    Logger.info('Merged Pull Request', {
      namespace: 'bitbucket:api:mergePullRequest',
      landRequestId,
      landRequestStatus,
      pullRequestId,
    });
  };

  getPullRequest = async (pullRequestId: number): Promise<BB.PullRequest> => {
    const endpoint = `${this.apiBaseUrl}/pullrequests/${pullRequestId}`;
    const resp = await axios.get<BB.PullRequestResponse>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
    );
    const data = resp.data;
    const approvals = data.participants
      .filter(participant => participant.approved)
      .map(participant => participant.user.account_id);

    return {
      pullRequestId,
      title: data.title,
      description: data.description,
      createdOn: new Date(data.created_on),
      author: data.author.account_id,
      authorAaid: data.author.uuid,
      commit: data.source.commit.hash,
      targetBranch: data.destination.branch.name,
      state: data.state,
      approvals: approvals,
      openTasks: data.task_count,
    };
  };

  getPullRequestBuildStatuses = async (pullRequestId: number): Promise<Array<BB.BuildStatus>> => {
    const endpoint = `${this.apiBaseUrl}/pullrequests/${pullRequestId}/statuses`;
    const resp = await axios.get<{ values: BB.BuildStatusResponse[] }>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
    );
    // fairly safe to assume we'll never need to paginate these results
    const allBuildStatuses = resp.data.values;
    // need to remove build statuses that we created or rerunning would be impossible
    return allBuildStatuses
      .filter(buildStatus => !buildStatus.name.match(/Pipeline #.+? for landkid/))
      .map(status => ({
        name: status.name,
        state: status.state,
        createdOn: new Date(status.created_on),
        url: status.url,
      }));
  };

  getUser = async (aaid: string): Promise<ISessionUser> => {
    const endpoint = `https://api.bitbucket.org/2.0/users/${aaid}`;
    const resp = await axios.get(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
    );

    return {
      username: resp.data.username,
      aaid: resp.data.uuid,
      displayName: resp.data.display_name,
    };
  };

  getRepository = async (): Promise<BB.Repository> => {
    const endpoint = this.apiBaseUrl;
    Logger.info('fetching uuid for repository', {
      namespace: 'bitbucket:api:getRepository',
      endpoint,
    });
    const { data } = await axios.get<BB.RepositoryResponse>(
      endpoint,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', endpoint)),
    );
    Logger.info('successfully fetched repo uuid', {
      namespace: 'bitbucket:api:getRepository',
      uuid: data.uuid,
    });

    return {
      repoOwner: data.owner.username,
      repoName: data.slug,
      uuid: data.uuid,
      fullName: data.full_name,
      url: data.links.html.href,
    };
  };
}
