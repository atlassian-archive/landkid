// @flow
import { type HostAdapter, type StatusEvent, type LandRequest } from '../types';

const GitHubAdapter: HostAdapter = (config: {}) => ({
  processStatusWebhook(body): StatusEvent | null {
    return null;
  },

  async isAllowedToLand(pullRequestId: string) {
    return {
      isOpen: false,
      isApproved: false,
      isGreen: false,
      isAllowed: false
    };
  },

  async mergePullRequest(pullRequestId: string): Promise<boolean> {
    return false;
  },

  async createComment(pullRequestId, parentCommentId, message) {
    // ...
  },

  async pullRequestToCommitHash(pullRequestId): Promise<string> {
    return '__commit__hash__';
  }
});

export default GitHubAdapter;
