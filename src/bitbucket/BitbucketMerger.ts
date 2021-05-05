import axios from 'axios';
import * as jwtTools from 'atlassian-jwt';
import delay from 'delay';

import { bitbucketAuthenticator, axiosPostConfig } from './BitbucketAuthenticator';

export class BitbucketMerger {
  private mergePollIntervals: Map<number, boolean>;
  private MAX_POLL_ATTEMPTS = 120; // 30 mins

  constructor(private baseUrl: string) {}

  attemptMerge = async (prId: number, message: string) => {
    const endpoint = `${this.baseUrl}/pullrequests/${prId}/merge`;
    const body = {
      close_source_branch: true,
      message,
      merge_strategy: 'merge_commit',
    };

    return axios.post(
      endpoint,
      JSON.stringify(body),
      await bitbucketAuthenticator.getAuthConfig(
        jwtTools.fromMethodAndPathAndBody('post', endpoint, body),
        {
          ...axiosPostConfig,
          validateStatus: () => true,
        },
      ),
    );
  };

  private pollMergeStatus = async (pollUrl: string) => {
    const res = await axios.get<BB.MergeStatusResponse>(
      pollUrl,
      await bitbucketAuthenticator.getAuthConfig(jwtTools.fromMethodAndUrl('get', pollUrl)),
    );
    return res.data;
  };

  triggerMergePolling = async (prId: number, pollUrl: string) => {
    this.mergePollIntervals.set(prId, true);
    // Poll while we still have attempts left and it hasn't been cancelled
    for (let i = 0; i < this.MAX_POLL_ATTEMPTS && this.mergePollIntervals.has(prId); i++) {
      try {
        const result = await this.pollMergeStatus(pollUrl);
        if (result.task_status === 'SUCCESS') {
          this.cancelMergePolling(prId);
          return result;
        }
      } catch (err) {
        this.cancelMergePolling(prId);
        return {
          task_status: 'FAILED' as const,
          response: err.response,
        };
      }
      // Poll every 15 seconds
      await delay(15 * 1000);
    }
    // Cleanup the map entry
    this.cancelMergePolling(prId);
    return {
      task_status: 'ABORTED' as const,
    };
  };

  cancelMergePolling = (prId: number) => {
    this.mergePollIntervals.delete(prId);
  };
}
