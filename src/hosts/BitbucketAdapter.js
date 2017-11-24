// @flow
import { type HostAdapter, type CommentEvent } from '../types';

const BitbucketAdapter: HostAdapter = async (config: {}) => ({
  processCommentWebhook(req): CommentEvent {
    // ...
  },

  async createComment(pullRequestId, parentCommentId, message) {

  },
});

export default BitbucketAdapter;
