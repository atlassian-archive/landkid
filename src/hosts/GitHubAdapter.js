// @flow
import { type HostAdapter, type CommentEvent } from '../types';

const GitHubAdapter: HostAdapter = async (config: {}) => ({
  processCommentWebhook(req): CommentEvent {
    // ...
  },

  async createComment(pullRequestId, parentCommentId, message) {
    // ...
  },

  async pullRequestToCommitHash(pullRequestId): Promise<string> {
    // ...
  }
});

export default GitHubAdapter;
