import axios from 'axios';
import { fromMethodAndUrl, fromMethodAndPathAndBody } from 'atlassian-jwt';
import delay from 'delay';

import { bitbucketAuthenticator, axiosPostConfig } from './BitbucketAuthenticator';

export class BitbucketMerger {
  private mergePollIntervals = new Map<number, boolean>();
  private MAX_POLL_ATTEMPTS = 120; // 30 mins
  private POLL_DELAY = 15 * 1000; // 15 seconds

  constructor(private baseUrl: string) {}

  attemptMerge = async (prId: number, message: string, mergeStrategy?: IMergeStrategy) => {
    const endpoint = `${this.baseUrl}/pullrequests/${prId}/merge`;
    const body = {
      close_source_branch: true,
      message,
      merge_strategy: mergeStrategy?.split('-').join('_') || 'merge_commit',
    };

    return axios.post(
      endpoint,
      JSON.stringify(body),
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndPathAndBody('post', endpoint, body), {
        ...axiosPostConfig,
        validateStatus: () => true,
      }),
    );
  };

  private pollMergeStatus = async (pollUrl: string) => {
    const res = await axios.get<BB.MergeStatusResponse>(
      pollUrl,
      await bitbucketAuthenticator.getAuthConfig(fromMethodAndUrl('get', pollUrl)),
    );
    return res.data;
  };

  /**
   * We continue polling as long as we receive the PENDING response
   * Return upon success, failure, exceeding max attempts, or manual cancel
   */
  triggerMergePolling = async (prId: number, pollUrl: string) => {
    this.mergePollIntervals.set(prId, true);
    let result;
    for (let i = 0; ; i++) {
      if (i >= this.MAX_POLL_ATTEMPTS) {
        result = {
          task_status: 'TIMEOUT' as const,
        };
        break;
      }
      if (!this.mergePollIntervals.has(prId)) {
        result = {
          task_status: 'ABORTED' as const,
        };
        break;
      }
      try {
        const pollResult = await this.pollMergeStatus(pollUrl);
        if (pollResult.task_status === 'SUCCESS') {
          result = pollResult;
          break;
        }
      } catch (err) {
        result = {
          task_status: 'FAILED' as const,
          response: err.response,
        };
        break;
      }
      await delay(this.POLL_DELAY);
    }
    // Cleanup the map entry
    this.cancelMergePolling(prId);
    return result;
  };

  cancelMergePolling = (prId: number) => {
    this.mergePollIntervals.delete(prId);
  };
}
